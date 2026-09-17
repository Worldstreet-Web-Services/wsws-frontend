# ADR-2026-09-16: The whole Market Square at `www.tsionark.com/square`, as a Next.js Multi-Zone

## Status

Accepted — 2026-09-16. The maintainer chose the approach ("Serve the real Square
at /square"), approved this record and its companion
(`ADR-2026-09-16-square-microfrontend-for-dummies.md`), and decided the three
open questions: **both addresses stay**, **Ark's sidebar and tab bar show on
Square pages from the start**, and **the `market-square-frontend` session makes
the Square-side changes**. Sections 2, 4 and 6 record those decisions.

**Amended 2026-09-17: Next.js Multi-Zones instead of Vercel microfrontends.**
The maintainer and the Square session moved the mechanism to Multi-Zones
(https://nextjs.org/docs/app/guides/multi-zones) and set it up on their side:
a second deployment of the Square, `https://square-ark.vercel.app`, is built
with `/square` prefixes, while `square.tsionark.com` stays exactly as it is.
This app rewrites `/square` to that deployment. Sections 1, 5, "Verified
platform facts", Consequences and Rollout below reflect the amendment; the
microfrontends plumbing (PR #506) is withdrawn. Everything else stands.

Supersedes `ADR-2026-09-12-square-page-in-app.md` once the microfrontend is live
in production: that record ported the Square's Home into this app and linked
everything else out.

## Context

The maintainer wants the Market Square "fully" inside Ark on the web, as the
mobile app (`tsion`) now has it.

### What mobile did, and why the web need not copy it

`tsion` rebuilt the Square natively (116 files, 24,522 lines, 13% of the app;
bulk rebuild `e3c197b` on 2026-09-13, citing `market-square-frontend`
`origin/staging` `a897a9d`). It calls the Square API directly with the Privy
access token, polls instead of using sockets, and runs one LiveKit room for the
whole app. It restyled the Square in an X-like timeline and left out tips and
gifts, admin, Square settings and onboarding, and group creation. A native app
cannot host a web page, so porting was its only option. A web app has others.

### What "fully" means on the web

`market-square-frontend` (Vercel project `market-square-frontend`, serving
`square.tsionark.com`, `origin/staging` `3dc433a`):

| Area                           | Lines      | Files   |
| ------------------------------ | ---------- | ------- |
| Shared `lib/`                  | 13,181     | 100     |
| Live / studio / streams / tips | 12,120     | 61      |
| Home / feed / stories          | 9,938      | 48      |
| Houses / gist rooms            | 9,445      | 54      |
| Messages / groups              | 8,109      | 33      |
| Profile                        | 6,670      | 40      |
| Everything else                | 30,788     | 204     |
| **Total**                      | **90,251** | **540** |

46 routes, 145 test files (17,351 lines), a 2,282-line app shell, 2,017 lines of
global CSS, LiveKit, a push service worker, KASH and `$TICKER` buy flows. The
code changes daily: its staging took new merges on the day of this record.

### The three options

|                     | A. Separate app at `/square` (Multi-Zone)               | B. Shared package                                    | C. Full native port                                        |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Effort              | 1.5–3 weeks                                             | Months                                               | 8–12 engineer-weeks                                        |
| Codebases           | One                                                     | One, plus a package boundary across two repos        | Two copies that drift                                      |
| Seamless navigation | Full page load when crossing between trading and Square | Soft                                                 | Soft                                                       |
| Sign-in             | Shared: same origin, same Privy app                     | Shared                                               | Shared                                                     |
| Risk                | Path and asset sweep in the Square repo                 | Tailwind v4 source scanning, i18n, Next version skew | Re-porting KASH, LiveKit and realtime; money-path mistakes |

Binance Square (`binance.com/en/square`), Bitget Insights and eToro's feed all
put social at a path on the main domain; none sends users to a subdomain.
Coinbase built social into Base App and withdrew it (The Block, March 2026).

### Verified platform facts

- Both projects are on the same Vercel team (`emmanuels-projects-18d0cf4f`):
  `wsws` → `www.tsionark.com`, `market-square-frontend` → `square.tsionark.com`.
- Multi-Zones need no platform feature and no shared team: the main app
  rewrites a path to the other deployment, and that deployment is built with an
  `assetPrefix` so its JavaScript, CSS and images load from under the same path
  (https://nextjs.org/docs/app/guides/multi-zones). The Square's zone build
  (`NEXT_PUBLIC_SQUARE_BASE_PATH=/square`) sets `assetPrefix: "/square"` and
  answers its routes at `/square/...`.
- The rewrite runs in `beforeFiles`, so nothing in this app can shadow it, and
  keeps the `/square` prefix in the destination.
- Crossing between zones is a hard navigation: `next/link` across zones looks
  for the route in the wrong router (observed: the Square entry hung on
  "Rendering"), so cross-zone links are plain `<a>`.
- Privy keeps its session in local storage on the origin, so one origin means
  one sign-in (https://docs.privy.io/recipes/react/cookies). Both apps use the
  same Privy app.

## Decision

### 1. One domain, two applications

Next.js Multi-Zones. `wsws` is the main zone. Its `next.config.ts` rewrites
`/square` and `/square/:path*` in `beforeFiles` to `${SQUARE_ZONE_URL}/square`
and `${SQUARE_ZONE_URL}/square/:path*`, where `SQUARE_ZONE_URL` is the Square
zone deployment (`https://square-ark.vercel.app`). With the variable unset the
rules are absent and `/square` is a 404 here. The request gate in `proxy.ts`
does not match `/square` or anything below it. No route in this app lives under
`/square`; a test enforces it.

```
www.tsionark.com
├── /portfolio, /spot, /meme, /prediction, /casino … ── wsws (default)
└── /square, /square/*  ───────────────────────────────── market-square-frontend
      /square              Home
      /square/p/{id}       post
      /square/u/{username} profile
      /square/messages     chat
      /square/gist-rooms/… live rooms
      /square/api/*        the Square's own BFF routes
      (www rewrites these to SQUARE_ZONE_URL/square/...)
```

### 2. The Square moves under `/square` in its own repository

Owned by the `market-square-frontend` session, coordinated before any write:

- Routes move from `app/<route>` to `app/square/<route>`; `/` becomes
  `/square`.
- Its API routes move to `app/square/api/*`, removing the collision with this
  app's `/api/market-square`, `/api/kash`, `/api/dextopus`, `/api/evm-rpc`,
  `/api/alchemy-bundler`.
- One path helper replaces the ~250 hard-coded route literals and ~22 `/api`
  fetch paths; `public/` assets move under `public/square/` (291 references,
  104 raw `<img>`), the service worker registers at `/square/sw.js` with scope
  `/square/`, and `SITE_ORIGIN` / share links resolve to
  `https://www.tsionark.com/square/...`.
- Route-based shell rules (`lib/compose-surfaces.ts`, the shell's `WIDE` list)
  match the new prefix.
- `square.tsionark.com` stays live as its own address (maintainer's decision).
  Because the same post then exists at two URLs, every page names
  `https://www.tsionark.com/square/...` as its canonical URL
  (`<link rel="canonical">` and `og:url`), so search engines and chat previews
  consolidate on one address. On the old host the app serves the same routes
  under `/square` as well, and `/` there sends people to `/square`.
- Its CSP keeps `frame-ancestors 'none'`; no iframe is involved.

### 3. What changes in this app

- The in-app Home port (`app/(session)/(app)/square/page.tsx`,
  `features/square/components/square-home*`) is removed from routing: `/square`
  now belongs to the Square. Its tests go with it.
- The sidebar and the phone tab bar's Square seat keep their place and link to
  `/square` as a plain anchor (a cross-application link is a document
  navigation, never `next/link`); the "Join the Conversation" band's in-app
  targets follow.
- `lib/square/links.ts` builds same-origin `/square/...` paths instead of
  `square.tsionark.com` URLs; outbound `target="_blank"` goes away.
- The existing `/api/market-square` relay stays for the flows that use it here
  (broadcast/go-live from the casino and the memecoin share flow).
- `IN_APP_SQUARE_SHOWN` and the dormant dashboard Square sections stay as they
  are; a later record can delete them.

### 4. Navigation between the two

Cross-zone links use `<a>`: the rail's Square entry, the phone tab bar's Square
seat (`@ark/chrome` `document` targets) and the Square pills on the dashboard's
conversation cards (`DiscoveryCta` `document`). Each is a same-tab document
navigation.

### 6. Ark's chrome on Square pages, from one source

The maintainer wants Ark's sidebar (desktop) and curved tab bar (phone) on
Square pages from the start. Copying them into the Square would drift, so they
become a package built from this repository:

- `packages/ark-chrome` in this repository: the sidebar and the tab bar as
  presentational components driven by props — the nav items (label, href, icon,
  whether the item belongs to this application), the active path, the signed-in
  person's name and avatar, and callbacks for the actions that need the host
  (sign in, sign out, Go Live). No `next-intl`, no Privy, no TanStack Query and
  no WSWS feature imports inside the package; each host passes its own strings
  and data. Styling uses its own scoped class names and CSS variables, so
  neither app's Tailwind tokens (15 of which share a name with different values)
  leak into the other.
- This app renders its sidebar and tab bar through the package, so the two can
  never differ.
- The Square installs it as a git dependency pinned to a tag,
  `github:Worldstreet-Web-Services/wsws-frontend#ark-chrome-v<version>&path:packages/ark-chrome`
  (pnpm), so no package registry is needed. A chrome change ships as a new tag
  and a one-line version bump in the Square.
- Nav items that belong to this application are `<a>` links from the Square;
  the Square's own links inside its pages stay `next/link`.
- The Square keeps its own in-page controls (composer, notifications, its
  search); its dock and top bar are replaced by Ark's chrome on routes that
  show it.

### 5. Local development

Run this app with `SQUARE_ZONE_URL` pointing at the Square zone, either the
deployed `https://square-ark.vercel.app` or a local zone build of the Square.
No proxy is needed. Each app still runs alone.

## Alternatives considered

- **B. Shared package.** One codebase in effect, but it needs the Square split
  into a published package across two repositories, Tailwind v4 source scanning
  into `node_modules`, next-intl in a codebase that has no i18n, and aligned Next
  versions. Months of work for soft navigation.
- **C. Native port, as mobile did.** Seamless, but 90k lines rebuilt to this
  repo's rules, five locales, and a second copy of a product that changes daily.
  The riskiest part is money: the Square's KASH proxy accepts only the session's
  embedded wallet, this app falls back to any linked wallet, and the two
  `/api/kash` routes share a name.
- **Keep the current Home port and link out.** What exists today; rejected by
  the maintainer as not "fully".
- **Subdomain only.** Already live at `square.tsionark.com`; it is a separate
  site, not "inside Ark".

## Consequences

- **Cost.** No platform feature: the rewrite is an ordinary external rewrite,
  and the Square zone is one more Vercel project.
- **Navigation.** Crossing between trading and Square pages reloads the page.
- **Two deployments, one domain.** Each app deploys independently; a Square
  release no longer needs a WSWS release. A wrong `SQUARE_ZONE_URL` on the
  `wsws` project takes `/square` down; the rewrite rules are guarded by tests.
- **Share links change host.** Canonical post and profile URLs become
  `www.tsionark.com/square/...`; the old host keeps serving and points its
  canonical tags at the new one.
- **Shared chrome is a versioned package.** A change to Ark's menus reaches the
  Square only when the Square bumps the tag; the plan tests both hosts render
  the same version.
- **Push notifications.** The service worker's scope and notification URLs move
  under `/square`; existing push subscriptions registered on
  `square.tsionark.com` belong to a different origin and must re-subscribe.
- **Local storage.** Anything the Square keeps in local storage on
  `square.tsionark.com` (drafts, dismissed banners) does not carry over.
- **Bundle budgets.** Each app keeps its own; this app's first-load budgets are
  unaffected.
- **Rollback.** Unsetting `SQUARE_ZONE_URL` removes the rewrite;
  `square.tsionark.com` keeps working throughout.

## Rollout

1. The Square zone deployment (`square-ark.vercel.app`) created by the
   maintainer; `SQUARE_ZONE_URL` set on the `wsws` project.
2. The Square's route, API, asset, service-worker and share-link move, verified
   on its own preview at `/square/*`.
3. This app's links and the removal of the Home port, verified on the combined
   preview.
4. Production promotion of both; canonical tags checked on both hosts.

## Verification

- Every one of the 46 Square routes loads on the combined preview under
  `/square`, signed in and signed out, with its CSS and images.
- Sign-in once on `/portfolio` carries to `/square` and back.
- Posting with media, a comment with a reply, a DM with a voice note, joining a
  live room with audio, a `$TICKER` buy, a KASH action and a push notification
  click all work under the prefix.
- `square.tsionark.com/p/{id}` and `/u/{name}` still load, and their canonical
  tags point at `www.tsionark.com/square/...`.
- Ark's sidebar and tab bar render identically on `/portfolio` and on `/square`,
  from the same package version.
- Link previews for `/square/p/{id}` render in a chat app.

## Decided by the maintainer (2026-09-16)

1. `square.tsionark.com` stays as its own address; canonical URLs point at
   `www.tsionark.com/square`.
2. Ark's sidebar and tab bar show on Square pages from the start (section 6).
3. The `market-square-frontend` session makes the Square-side changes; this
   session makes Ark's side and the chrome package.
4. Amended 2026-09-17: Multi-Zones, with the Square zone at
   `square-ark.vercel.app`, set up by the maintainer.

## Release notes

`docs/release-notes/<date>-square-microfrontend.md` in each pull request that
changes app code, `scenario-impact: updated`.
