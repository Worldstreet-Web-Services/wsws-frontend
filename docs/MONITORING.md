# Monitoring and alerting

How this frontend reports failures, and how those failures reach a human. The
code is already in place; what follows is the account setup that switches it on.

- Errors and traces go to **Sentry**.
- Sentry emails whoever is on the alert rule.
- Sentry also posts to a **Telegram** channel, through a relay this app serves
  at `/api/alerts/sentry`, because Sentry has no Telegram integration of its own.

---

## 1. What gets reported, and why not everything

Sentry captures what throws. A `fetch` that returns 500 and is handled by the
caller throws nothing, so a failing backend would be invisible to it. This app
therefore reports request failures deliberately, from the one transport every
call goes through (`lib/api.ts`).

The reason it is not simply "report every failure" is volume. This app polls
harder than anything else we run — live match state every second, tickets every
second, some of it deliberately continuing in a hidden tab. One unreachable
service can produce thousands of failed requests a minute. An alert channel that
receives all of them is a channel nobody reads.

So failures are separated by what they mean:

| What happened                         | What we do                     | Where it shows                                    |
| ------------------------------------- | ------------------------------ | ------------------------------------------------- |
| 4xx response                          | Breadcrumb only                | In the trail of a real error, no issue of its own |
| 5xx or transport failure              | One issue per service + status | Sentry issues, count rises                        |
| A service's circuit breaker **opens** | One issue, once per outage     | Sentry issues → email + Telegram                  |

The breaker opening is the signal worth waking someone for. It means the app has
given up calling a service after consecutive qualifying failures, so users have
actually lost that part of the product. It fires once per outage rather than
once per refused poll, and a single dropped packet cannot produce it.

Quiet services (`QUIET_SERVICES` in `lib/api/circuit-store.ts`) are excluded, for
the same reason they are kept out of the connection banner: each degrades on its
own terms and is not an incident.

Deliberate control-flow errors are dropped before they cost an event — see
`ignoreErrors` in `lib/monitoring/sentry-options.ts`.

**Session Replay is off.** It records the rendered page, and this one shows
balances and transaction amounts. Turning it on is a privacy decision to take
explicitly, with `maskAllText` and `blockAllMedia` set.

---

## 2. Create the Sentry project

1. Sign in at [sentry.io](https://sentry.io), create a project, platform
   **Next.js**.
2. Copy the **DSN** from Settings → Projects → _your project_ → Client Keys.
3. Create a token at Settings → **Developer Settings → Organization Tokens**.
   There is no scope picker: Sentry fixes org-token permissions to what CI
   needs, source map upload included. Use an ORGANIZATION token, not a personal
   one — a personal token is bound to one human and dies with their account.

Set these in Vercel (Production, Preview and Development):

```
NEXT_PUBLIC_SENTRY_DSN=https://...ingest.sentry.io/...
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=<project-slug>
SENTRY_AUTH_TOKEN=sntrys_...
```

Only the DSN is public — it accepts events and grants no read access, which is
why it is a `NEXT_PUBLIC_` variable. The auth token is a real secret.

With `NEXT_PUBLIC_SENTRY_DSN` unset the SDK is inert, so local development and
CI stay silent without any extra configuration.

### Verify

Deploy, then trigger a failure. The quickest honest test is a request failure:
stop the upstream gateway, or point `WSAPI_BASE_URL` at a dead host in a preview
deployment, and load the dashboard. Within a few seconds you should see:

- one issue per failing endpoint, titled `Request to <service> failed (500)`,
- then one `Circuit opened for <service>` once the breaker trips.

Note that errors thrown from the browser console are sandboxed and will **not**
reach Sentry — test through the app itself.

---

## 3. Email alerts

Sentry → Alerts → Create Alert → **Issue Alert**.

A reasonable starting pair:

- **Anything new and serious.** When _a new issue is created_, and the issue's
  level is `error` or `fatal` → send a notification to the engineering team.
- **Something is on fire.** When _an issue is seen more than 100 times in one
  hour_ → notify the team. This is the one that catches a slow burn a single new
  issue would not.

Set the action interval to at least 30 minutes so one bad deploy does not send
hundreds of emails.

**A constraint worth knowing before you promise anyone anything:** Sentry's email
actions target org **members and teams**, not arbitrary addresses. To reach
someone outside the org you either invite them as a member, point the alert at a
mailing-list address that has been invited, or have the relay in the next
section send the mail. Cheapest is usually a distribution list
(`engineering@…`) invited once as a member.

---

## 4. The Telegram channel

### 4a. Create the bot

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → follow the prompts.
2. Copy the token it gives you (`123456789:AA...`).
3. Add the bot to your channel **as an administrator** with permission to post.
4. Get the channel id: post any message in the channel, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and read
   `result[].channel_post.chat.id`. A channel id is negative, like
   `-1001234567890`.

```
TELEGRAM_BOT_TOKEN=123456789:AA...
TELEGRAM_CHAT_ID=-1001234567890
```

Both are server-only. They are read by the route handler and never reach the
browser.

### 4b. Point Sentry at the relay

Sentry → Settings → **Integrations → Custom Integrations** → _Create New
Integration_ → **Internal**.

(It is under Integrations, not Developer Settings — Developer Settings holds
only tokens and OAuth applications.)

- **Webhook URL**: `https://<your-domain>/api/alerts/sentry`
- **Alert Rule Action**: enabled — this is what makes the integration selectable
  as an action inside an Issue Alert.
- **Permissions**: Issue & Event → _Read_
- **Webhooks**: check `issue` and `error`

Save, then copy the **Client Secret** into Vercel:

```
SENTRY_CLIENT_SECRET=<client secret>
```

Every webhook body is signed with this secret and verified in
`lib/server/sentry-alert.ts` before anything is posted. The endpoint is public,
so without the secret set the relay refuses all traffic — that is deliberate.

### 4c. Add it to the alert rules

Go back to the alert rules from section 3 and add a second action:
**Send a notification via** → _your integration_. The same rule now emails and
posts to Telegram.

---

## 5. Where the code lives

| File                                                | What it does                                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/monitoring/sentry-options.ts`                  | Options shared by all three runtimes: DSN, environment, release, sampling, `ignoreErrors` |
| `instrumentation-client.ts`                         | Browser init. Also composes Sentry's router hook with the existing Mixpanel one           |
| `sentry.server.config.ts` / `sentry.edge.config.ts` | Node and edge init                                                                        |
| `instrumentation.ts`                                | Registers the two above; exports `onRequestError`                                         |
| `app/error.tsx`                                     | Route-level boundary. Reports here, or most render crashes are never seen                 |
| `app/global-error.tsx`                              | Last-resort boundary for a failure in the root layout                                     |
| `lib/monitoring/report.ts`                          | Request failures, breaker-open events, user identification                                |
| `lib/api.ts`                                        | Calls the reporter at its two failure branches                                            |
| `lib/api/circuit-store.ts`                          | Reports the closed → open transition                                                      |
| `lib/server/sentry-alert.ts`                        | Signature verification and Telegram formatting                                            |
| `app/api/alerts/sentry/route.ts`                    | The relay                                                                                 |
| `vitest.sentry-stub.ts`                             | Stands in for the SDK under test — see the file for why                                   |

### Two notes for whoever changes this next

`app/error.tsx` catches render crashes **before** `app/global-error.tsx` ever
sees them. Both report, and removing the report from `error.tsx` would silently
blind you to most UI errors.

The alert relay is served by this app, so a total outage takes the alerter down
with it. That is an accepted trade for frontend error alerting — an error implies
the app is serving — but if you later want alerting that survives the app being
down, move the relay to a Cloudflare Worker and repoint the webhook URL. Nothing
else changes.
