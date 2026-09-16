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
innermost, inside next-intl and Sentry, with `appName: "wsws"`. The name is
fixed because the package otherwise takes it from `VERCEL_PROJECT_NAME`, and
the staging branch builds on the `wsws-test` project, where the config would
look up `wsws-test` and fail to load. As the default application this app gets
no asset prefix, so its `/_next` URLs do not move. The wrapper also reads
`microfrontends.json` when the config loads, so an invalid file fails the build.

Besides the define and `transpilePackages`, the wrapper:

- turns on `experimental.multiZoneDraftMode`, which stops Next clearing a
  draft-mode cookie another application of the group set. This app uses no
  draft mode, so nothing it does changes.
- reshapes `rewrites()` into `{ beforeFiles: [], afterFiles: undefined,
fallback }`, adding no rewrite of its own; the 16 chess fallback rewrites are
  unchanged.
- prepends a redirect to the local proxy only inside a Turborepo task that runs
  the proxy, which this repository does not use, so `redirects()` is unchanged.

`next.config.test.ts` pins all three, and the keys the wrapper adds to an empty
config, so a package upgrade that changes them fails a test.

**`proxy.ts`**, the launch and maintenance gate, no longer matches the Square's
asset prefix `vc-ap-ce7102`, where this app serves nothing. It still matches
`/square` and everything under it, which is this app's own page until PR 3; a
maintenance window or the launch clock closes it like every other page. Once a
group routes `/square` to the Square those requests never reach this app, so
matching them costs nothing then. `validateMiddlewareConfig` is given
`/square` and `/square/:path*` as deliberate production matches and fails if
they stop being matched; PR 3 removes both the exception and the match. It now
also
answers `/.well-known/vercel/microfrontends/client-config` through the package,
before the gate, so the routing table is served whether or not the site is
open.

**`pnpm dev:mf`** runs the package's local proxy on port 3024 in front of
`next dev` on port 7448, so one local address serves this app and `/square`
from the fallback. Both run in process groups of their own. However the script
is stopped (Ctrl-C, `SIGTERM` from a task runner, `SIGHUP` from a closed
terminal) it stops both groups, ignores further signals while it does, waits up
to five seconds and then kills a group still running, so it never returns with
port 3024 or 7448 held. The README documents it.

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

## How it was verified

Tests were written first and seen failing for the reason they target. The
fixes after review are each a pair of commits, the failing test and then the
fix, with the failure quoted in the test commit. For the first three commits,
which added tests and code together, the failure was re-run afterwards by
putting the `origin/staging` code back under the new tests:

- `proxy.ts` from `origin/staging`: 6 of 20 `proxy.test.ts` tests fail (the
  client config endpoint open, under maintenance and before launch;
  `validateMiddlewareConfig`; the asset prefix; the endpoint in the matcher).
- `next.config.ts` from `origin/staging`: 4 of 11 `next.config.test.ts` tests
  fail (the wrapper applied, the `wsws-test` load, the draft mode flag, the
  rewrites shape).
- `microfrontends.json` removed: `microfrontends.test.ts` fails to load
  (`Could not find a microfrontends.json file ... that contains the "wsws"
application`).

The tests:

- `microfrontends.test.ts`: the package's schema check, the two names and the
  fallback, the Square's exact paths, `validateRouting` for Square paths and
  for `/`, `/portfolio`, `/spot`, `/meme` and near misses, and a guard that the
  only route this app serves under `/square` is the Home port. The guard counts
  pages, route handlers and metadata routes (`opengraph-image`, `icon` and the
  rest), treats a dynamic or catch-all first segment as answering `/square`
  (checked on a scratch app), rejects any `next.config` redirect or rewrite that
  matches a Square path or sends a request into `/square`, and allows no
  `public/square`.
- `proxy.test.ts`: `validateMiddlewareConfig` against `microfrontends.json`
  with the `/square` exception, Next's own matcher
  (`unstable_doesMiddlewareMatch`) for `/square` still gated, the asset prefix
  skipped, the routes the gate kept and static files, `/square` answering 503
  under maintenance, and the client config endpoint while open, under
  maintenance and before launch.
- `next.config.test.ts`: the config as a Turbopack production build with source
  map upload loads it, checking the microfrontends define, no asset prefix, the
  next-intl request config alias and this app's own aliases, and Sentry's
  `runAfterProductionCompile` hook and browser source maps; the config loading
  as `wsws` with `VERCEL_PROJECT_NAME=wsws-test`; and the wrapper's draft mode,
  rewrites and redirects footprint.
- `scripts/dev-mf.test.ts`: with stub commands on `PATH`, the script stops both
  commands and their children on `SIGINT`, `SIGTERM` and `SIGHUP`, under
  repeated signals, and when a command ignores `SIGTERM`.

By hand, `pnpm dev:mf` under a real terminal: `/portfolio` answered 200
through port 3024 from the local dev server, in the same time as asked of port
7448 directly (6.9 s against 7.0 s, both logged by the local `next dev`);
`/privacy` answered with `x-powered-by: Next.js`; `/square` came from Vercel
(`server: Vercel`). Stopped with Ctrl-C and, separately, with `SIGTERM` to the
script, including while a `/portfolio` request was still in flight, both ports
were free within the grace period with no process left.

`next start` on the production build with `ALLOW_ACCESS=false`: `/square`,
`/square/p/x` and `/portfolio` answer 503 with `X-Robots-Tag: noindex`,
`/privacy` answers 200. In the built middleware manifest the matcher covers
`/square`, `/square/`, `/square/p/x`, `/portfolio`, `/squares` and the client
config endpoint, and skips `/vc-ap-ce7102/_next/static/...`. The config also
loads for a production build with `VERCEL_PROJECT_NAME=wsws-test`, and with a
`.vercel/project.json` naming `wsws-test`.

Full `./scripts/preflight.sh` clean with no microfrontends group on Vercel:
5,132 tests passed, 3 skipped. Lint reports 49 warnings, the same count as
`origin/staging` (`611aecf1`, measured on an export of that commit); none is in
a file this change touches. `pnpm bundle:check` passes with first-load sizes as
before: `/portfolio` 1768 kB, `/meme` 1606 kB, `/spot` 1570 kB, `/square`
1529 kB.
