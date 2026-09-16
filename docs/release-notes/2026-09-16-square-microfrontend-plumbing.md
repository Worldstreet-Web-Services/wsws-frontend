---
date: 2026-09-16
feature: Microfrontends plumbing for the Square at /square
scope: build, proxy, local development, square
scenario-impact: none
---

# Microfrontends plumbing for the Square at /square

The first pull request of
`docs/plans/2026-09-16-square-microfrontend-plan.md`, under
`docs/adr/ADR-2026-09-16-square-microfrontend.md`. It prepares this app to be
the default application of a Vercel microfrontends group in which the Market
Square serves `/square`. Nobody using the site sees a difference yet.

## What changed

**`microfrontends.json`** at the repository root. Two applications, named after
their Vercel projects: `wsws`, the default, with `https://www.tsionark.com` as
its local development fallback and `packageName: "frontend"` so the local
tooling can find it; and `market-square-frontend`, which owns `/square` and
`/square/:path*`, with no flag.

**`next.config.ts`** is wrapped in `withMicrofrontends` from
`@vercel/microfrontends` 2.4.0 (peer range `next >=13`, installed next 16.2.11),
innermost, inside next-intl and Sentry. As the default application this app
gets no asset prefix, so its `/_next` URLs do not move. The wrapper also reads
`microfrontends.json` when the config loads, so an invalid file fails the build.

**`proxy.ts`**, the launch and maintenance gate, no longer matches `/square`,
anything under it, or the Square's asset prefix `vc-ap-ce7102`. On Vercel those
requests go to the Square's own deployment and never reach this app. Every
other path the gate matched still reaches it, `/squares` included. It now also
answers `/.well-known/vercel/microfrontends/client-config` through the package,
before the gate, so the routing table is served whether or not the site is
open.

**`pnpm dev:mf`** runs the package's local proxy on port 3024 in front of
`next dev` on port 7448, so one local address serves this app and `/square`
from the fallback. The README documents it.

## What did not change

- **Production routing.** Vercel routes by `microfrontends.json` only for
  projects in a microfrontends group. No group exists on the team yet, so
  `/square` on `www.tsionark.com` is still this app's page. Creating the group
  is the maintainer's step, after the plan's cost is confirmed.
- **The in-app `/square` page.** It still builds and serves. PR 3 of the plan
  removes it; `microfrontends.test.ts` allows exactly that one route under
  `/square` until then.
- **First-load JavaScript.** Identical before and after on all 70 routes,
  measured to 0.01 kB: `/portfolio` 1767.55 kB, `/meme` 1606.05 kB, `/spot`
  1569.89 kB, `/square` 1529.01 kB, `/` 312.32 kB. No budget changed.

## Known consequence until PR 3

While the site is closed (`ALLOW_ACCESS=false`, or before
`NEXT_PUBLIC_LAUNCH_AT`), a direct request for `/square` is no longer turned
away by the proxy, because the gate cannot tell this app's `/square` from the
Square's. Checked against `next start` with `ALLOW_ACCESS=false`: `/square`
answers 200 while `/`, `/portfolio`, `/squares` and `/api/waitlist` answer 503.
The page's data still comes through `/api/market-square`, which the gate still
closes. Once the group exists `/square` is the Square's, which has its own
availability, and PR 3 removes this app's page.

## How it was verified

Tests were written first and seen failing for the reason they target:

- `microfrontends.test.ts`: the package's schema check, the two names and the
  fallback, the Square's exact paths, `validateRouting` for Square paths and
  for `/`, `/portfolio`, `/spot`, `/meme` and near misses, and a guard that the
  only route this app serves under `/square` is the Home port, with no
  `public/square`.
- `proxy.test.ts`: `validateMiddlewareConfig` against `microfrontends.json`,
  Next's own matcher (`unstable_doesMiddlewareMatch`) for Square paths, the
  asset prefix, the routes the gate kept and static files, and the client
  config endpoint while open, under maintenance and before launch.
- `next.config.test.ts`: the config as a Turbopack production build with source
  map upload loads it, checking the microfrontends define, no asset prefix, the
  next-intl request config alias and this app's own aliases, and Sentry's
  `runAfterProductionCompile` hook and browser source maps.

By hand: `pnpm dev:mf` served `/portfolio` from the local dev server through
port 3024, `/square` from Vercel (`server: Vercel`), and the client config
endpoint; stopping the dev server stopped the proxy. `next start` on the
production build served `/`, `/portfolio`, `/square` with its CSS, and the
client config endpoint.

Full `./scripts/preflight.sh` clean with no microfrontends group on Vercel:
5,118 tests. Lint reports 49 warnings, the same count as `origin/staging`
(`611aecf1`); none is in a file this change touches.
