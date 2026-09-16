# Plan: the whole Market Square at `www.tsionark.com/square`

Decision: `docs/adr/ADR-2026-09-16-square-microfrontend.md` (proposed). Nothing
here starts before the maintainer approves both records.

## Ownership

| Repository                                | Owner                                | Rule                                                                                                                 |
| ----------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `wsws-frontend`                           | this session                         | branches off `origin/staging`, PRs to `staging`                                                                      |
| `market-square-frontend`                  | the `market-square-frontend` session | no write from this session without agreeing it first; the Square-side PR is that repository's, under its `CLAUDE.md` |
| Vercel team `emmanuels-projects-18d0cf4f` | the maintainer                       | the group is created by someone with rights on the team, after the plan's cost is confirmed                          |

## Pull requests, in order

### PR 1 — WSWS: microfrontends plumbing (default app), no routing change (0.5 day)

| Step                                                                                                                                                   | Files                            | Check                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `@vercel/microfrontends`; wrap `next.config.ts` in `withMicrofrontends`, composed with the existing next-intl and Sentry wrappers                  | `package.json`, `next.config.ts` | `pnpm build` output unchanged in size; `bundle:check` green                                                                                              |
| `microfrontends.json` with `wsws` default and `market-square-frontend` at `/square`, `/square/:path*`; development fallback `https://www.tsionark.com` | `microfrontends.json`            | a unit test parses the file, asserts the child owns exactly `/square` and `/square/:path*`, and that no WSWS route lives under `/square` once PR 3 lands |
| `dev:mf` script: `microfrontends proxy --local-apps wsws` + `next dev --port $(microfrontends port)`                                                   | `package.json`, `README`         | proxy serves `/portfolio` locally, `/square` from the fallback                                                                                           |

### PR 2 — Square: move under `/square` (market-square-frontend session; 1–2 weeks)

| Step                                                                                                             | Check                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `app/<route>` → `app/square/<route>`, `/` → `/square`                                                            | every one of the 46 routes answers under `/square` on its preview |
| `app/api/*` → `app/square/api/*`; one path helper for the ~22 client fetch paths                                 | no request from the Square hits a bare `/api/` (network log test) |
| One route helper replacing the ~250 hard-coded route literals; lint rule forbidding new bare-root internal links | lint fails on `href="/u/` etc.                                    |
| `public/*` → `public/square/*`; the 104 raw `<img>` and 2 CSS `url()` updated                                    | no 404 for any asset on the preview                               |
| Service worker at `/square/sw.js`, scope `/square/`, notification URLs prefixed                                  | push click opens `/square/...`                                    |
| `SITE_ORIGIN` and the 10 `window.location.origin` share links → `https://www.tsionark.com/square`                | share preview for `/square/p/{id}` renders                        |
| Shell route rules (`compose-surfaces.ts`, `WIDE`) on the prefix                                                  | composer and wide routes unchanged on the preview                 |
| `withMicrofrontends`, `@vercel/microfrontends`                                                                   | assets served under the automatic prefix                          |

### PR 3 — WSWS: hand `/square` to the Square (1 day)

| Step                                                                                    | Files                                                                           | Check                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| Remove the Home port route and its components/tests                                     | `app/(session)/(app)/square/`, `features/square/components/square-home*`, tests | no route under `/square` in this build       |
| Sidebar and phone tab bar Square seat: `<a href="/square">`, active state from the path | `sidebar.tsx`, `curved-tab-bar.tsx`, tests                                      | cross-app link is an anchor, not `next/link` |
| `lib/square/links.ts` → same-origin `/square/...`, no `target="_blank"`                 | `links.ts`, callers, tests                                                      | every deep link same-origin                  |
| Prefetch the Square entry where the seat is visible                                     | shell                                                                           | warm navigation measured on preview          |
| Release note, locale check, preflight                                                   | docs                                                                            | five gates green                             |

### PR 4 — Production promotion and redirect (maintainer-gated)

Both apps promoted; `square.tsionark.com/*` → 301 `https://www.tsionark.com/square/*`
after the combined production check below.

## How the work is run: departments

Each PR runs through the same loop, by separate agents that do not share
context. The loop repeats until the judge scores the PR at the top grade.

1. **Builder** implements the PR's steps, test-first.
2. **Adversarial auditor** attacks the result: broken or colliding paths,
   assets that 404 under the prefix, a cross-app link done with `next/link`,
   auth that does not carry across, CSP and service-worker scope mistakes,
   anything that routes a request to the wrong app, regressions in money flows.
   Every finding carries a reproduction.
3. **Fixer** fixes each finding with a regression test that fails first.
4. **Design researcher** studies how the best products move between a trading
   surface and a social surface on one domain (Binance Square, Bitget, eToro)
   and raises the crossing: loading states, prefetch, where the Square seat
   sits, what the reader sees during the page load.
5. **Judge** grades against the rubric below and names exactly what loses
   points. Nothing merges below the top grade.

### Rubric (100 points)

| Criterion      | Points | Top grade means                                                                                        |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Routes         | 20     | all 46 Square routes load under `/square`, signed in and out, with CSS and images                      |
| Sign-in        | 10     | one sign-in carries across both apps and back                                                          |
| Critical flows | 25     | post with media, comment reply, DM voice note, live room audio, `$TICKER` buy, KASH action, push click |
| No collisions  | 10     | no request reaches the wrong app; no shared `/api` name                                                |
| Links and SEO  | 10     | old `square.tsionark.com` links redirect; share previews render                                        |
| Crossing UX    | 10     | warm, prefetched navigation with no blank flash                                                        |
| Governance     | 10     | ADRs, release notes, 5 locales where strings change, preflight, bundle budgets                         |
| Rollback       | 5      | removing the child from `microfrontends.json` restores `/square` cleanly on a preview                  |

## Risks and how they are caught

| Risk                                               | Caught by                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| A missed bare-root path in the Square              | lint rule + preview network log with zero 404s                                   |
| Two `/api/kash` routes with different wallet rules | PR 2 moves the Square's to `/square/api/kash`; auditor checks no request crosses |
| Service worker scope or old push subscriptions     | explicit re-subscribe path; push click test                                      |
| `microfrontends.json` typo takes `/square` down    | parse test in PR 1                                                               |
| The Square changes during the move                 | PR 2 is one rebase-friendly branch in its own repo, owned by its session         |
