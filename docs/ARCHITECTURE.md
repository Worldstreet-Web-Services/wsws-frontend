# Frontend Architecture

The authoritative description of how this frontend is structured, why, and what
still has to move. Read it before adding a directory, a transport, or a shared
component. `.claude/skills/wsws-engineering-standards/SKILL.md` sets the coding
bar; this document sets the shape.

Status: the target structure below is agreed. The migration is in progress and
tracked in [Migration status](#migration-status). Until a slice is migrated, work
in it stays where it is. Do not half-move a feature.

---

## 1. The audit that produced this

Measured against `main` at `49e85b1`, by import graph and file count, not by
impression.

| Signal                  | Measured              | Read                                                                                                                                                                                            |
| ----------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BFF proxy routes        | 43                    | Keys never reach the browser. Paths allowlisted, sessions verified server side. Keep.                                                                                                           |
| Client transports       | 4 + `apiFetch`        | `vault-api`, `casino/api/client`, `casino/api/chess-client`, `earn/api/client` each redefine base path, error text, and unwrapping.                                                             |
| Envelope unwrappers     | 1 plus an alias       | `lib/api/envelope.ts` holds the logic. `lib/casino/api/envelope.ts` is a 12-line re-export kept so casino and chess call sites keep their old names. Delete it with the transport merge in 2.3. |
| Files over 400 lines    | 29                    | Largest: `play-section.tsx` 1,530, `last-standing-section.tsx` 1,172, `swiss/detail-section.tsx` 830.                                                                                           |
| Client components       | 246 of 327            | 75 percent. Two server pages, neither fetches data.                                                                                                                                             |
| Query hooks             | 57 of 105             | TanStack Query is the de facto data layer. Only 3 hooks still fetch inside `useEffect`.                                                                                                         |
| Tests                   | 985 across 94 files   | Logic is well covered. 4 component tests, 0 end to end.                                                                                                                                         |
| CI gates                | 4                     | format, lint, test, build. No `tsc --noEmit`.                                                                                                                                                   |
| `components/dashboard/` | 180 of 245 components | 73 percent of all components in one folder with 28 children.                                                                                                                                    |
| Cross-feature imports   | 3 files               | The only genuine coupling between features. Everything else was the shell mounting a view.                                                                                                      |

### Verdict

There is a real architecture here: a backend for frontend proxy layer, pure
tested logic in `lib/`, and one data layer. It is not documented and not
enforced, so each new feature reinvents its own transport, error envelope, and
folder. The fix is to name the architecture, delete what is dead, and put a
linter behind the boundaries. It is not a rewrite.

### Dead code confirmed

`casino-service/` is a Fastify backend committed inside this repository. 13
tracked files, its own `package.json`, `pnpm-workspace.yaml`, and lockfile. Last
touched 2026-07-30 in PR #63. Nothing in the frontend imports it and Vercel does
not deploy it. The nested workspace file can also confuse tooling that infers a
workspace root.

It left a client chain that is still wired into two shipped pages:

```
/casino, /casino/draw
  -> hooks/use-casino-hub.ts, hooks/use-casino-draw.ts
  -> lib/casino/api/{hub,draw}.ts
  -> casinoGet / casinoPost  (lib/casino/api/client.ts)
  -> app/api/casino/[...path]
  -> NEXT_PUBLIC_CASINO_API_URL     <- unset. Dead end.
```

Chess escaped this: it moved to its own service and transport
(`chess-client.ts` -> `/api/chess` -> the gateway). That is why half of
`lib/casino/api/` is live and half is not.

---

## 2. The one rule

Four layers. Every import points downward. That is the whole model.

```
app/            routes and BFF handlers. Composes features, owns no logic.
   |  may import
features/       vertical slices. Never import a sibling's internals.
   |  may import
components/ui/  design system primitives. Know nothing about any feature.
   |  may import
lib/            pure cross-cutting: api client, money, format, brand.
```

Reusable building blocks live in `components/ui/` and `lib/`. They are shared by
everyone precisely because they sit below the feature line and depend on nothing
above it. A feature slice is not a silo. It is the layer that consumes the
shared floor.

Three consequences worth stating plainly:

1. **Features never import each other's internals.** Cross-feature use goes
   through `features/<name>/index.ts`. Enforced by `eslint-plugin-boundaries`.
2. **`lib/` is for what two or more features need.** If only RWA uses it, it
   belongs in `features/rwa/lib/`.
3. **One transport.** One `apiFetch`, one envelope unwrapper, one `ApiError`.

### Deciding where a component belongs

Judge membership of `components/ui/` by whether the component knows anything
about a feature, not by how many places import it. A `Switch` is a primitive
even if used once. A `MoneyTicker` that understands casino wins is a feature
component that happens to live upstairs.

---

## 3. Target structure

```
app/                            routes and BFF only
  (marketing)/                  route group, no dashboard shell
  (app)/                        route group, shares the dashboard shell
  api/                          one folder per upstream service
  layout.tsx  providers.tsx  globals.css

features/                       a feature owns its whole vertical
  rwa/
    components/                 from components/dashboard/rwa/
    hooks/                      from hooks/use-rwa-*.ts
    lib/                        from lib/rwa/, pure and unit tested
    index.ts                    the only thing outside may import
  casino/                       sub-slices: chess/, last-standing/
  funds/                        deposit, withdraw, KYC, bank rails
  prediction/                   markets, positions, Polymarket cash out
  trade/                        spot, perps, buy and sell sheets, meme
  earn/                         listings, sponsors, submissions
  remit/                        cross-border off-ramp wizard
  portfolio/                    balance card, donut, holdings

components/
  ui/                           design system, used by three or more features
  layout/                       the shell itself: dashboard-shell, sidebar, topbar, nav-items

lib/                            cross-cutting only
  api/                          client.ts, envelope.ts, error.ts, schemas/
  money/  format/  brand.ts  currencies.ts  wsapi-base.ts
  server/                       server only, a client import must fail

messages/                       five locales, unchanged
config/                         chain registries, unchanged
```

`components/dashboard/` dissolves. Around 165 of its files are feature
components that move into their slice. The roughly 15 that are genuinely shell
move to `components/layout/`.

Tests colocate as `*.test.ts` beside the code they cover, so a slice can be
read, moved, or deleted with its tests.

---

## 4. Data flow

This does not change. It is already correct and is written down here so it stops
being folklore.

```
component -> hook (TanStack Query) -> lib client -> app/api/<service> -> gateway
```

- A component never calls `fetch` directly and never holds a base URL.
- Every upstream call goes through a route handler in `app/api/`. The handler
  holds the secret, allowlists the path, and verifies the Privy session.
- Every service URL derives from `WSAPI_BASE_URL` via `wsapiService("<service>")`.
  Per-service environment variables exist only as local overrides.
- Upstream payloads are validated at the proxy boundary and never reach a
  component raw. Zod schemas live in `lib/api/schemas/`.
- Pure derivation, validation, and money math live in a `lib/` file with tests.
  Components render, hooks orchestrate.

---

## 5. Conventions

**Feature public surface.** Each slice exports only what others may use:

```ts
// features/rwa/index.ts
export { RwaSection } from "./components/rwa-section";
export { useRwaAssets } from "./hooks/use-rwa-assets";
export type { RwaAsset } from "./lib/types";
```

**Naming.** Files are kebab-case. Components are PascalCase and named for what
they are. Hooks are `use<Thing>`. A pure module is named for its domain, not its
shape: `presenter.ts`, `gas-buffer.ts`, not `utils.ts` or `helpers.ts`.

**Size.** A component over roughly 300 lines is usually holding three jobs:
server state, derivation, and layout. Extract the first two. There is no hard
limit, but 400 lines is where a reviewer should ask.

**Server components.** Default to server. Reach for `"use client"` only for
interactivity, browser APIs, or client state, and push the boundary as deep as
possible. New read-heavy pages should fetch on the server.

---

## 6. Migration status

Update this table in the same PR that does the work. One line per step, with the
PR number, so this file is the single place to see where the restructure stands.

Legend: `[ ]` not started, `[~]` in progress, `[x]` done.

### Open branches

Nothing here is merged yet. Keep this list current so no branch is forgotten.

| Branch                    | Holds                                                         | State                                             |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `docs/architecture-guide` | This document, `CONTRIBUTING.md`, SKILL and PR template edits | Pushed, no PR. Docs only, safe to merge any time. |
| `refactor/architecture`   | Phases 1 and 2. Branched off `main`, carries the docs commit  | Pushed, no PR. Held until tested end to end.      |

Merge order when the time comes: `docs/architecture-guide` first, then
`refactor/architecture`, which will need a trivial conflict resolution on this
file (take the restructure branch's version, it is further ahead).

### Phase 1: cleanup

Independent of the restructure. Pure subtraction and CI hardening.

- [x] **1.1 Delete the dead casino stack.** `casino-service/` (13 files), the
      hub's dead live-data path (`use-casino-hub`, `lib/casino/api/hub.ts`, the
      orphaned wins ticker), and with 1.2 resolved: `app/api/casino/`,
      `lib/casino/api/{client,draw}.ts`, `hooks/use-casino-draw.ts` and the
      `NEXT_PUBLIC_CASINO_API_URL` / `CASINO_API_KEY` entries.
      Branch: `refactor/architecture`
- [x] **1.2 Draw removed.** `/casino` degrades by design and stays. Draw did
      not: it was ~771 lines of finished lottery UI with a backend that was never
      built. The deleted service carried the proof, a handler commented
      `Draw (not implemented yet)` that threw `NOT_CONFIGURED`, because a draw needs
      a scheduler and an auditable randomness source. Nothing linked to it either:
      the games tile is `href: null, comingSoon: true`, and the `/casino/draw` entry
      in `SECTION_LABEL` was a back-link label, not navigation. The only way in was
      typing the URL, which showed a permanent error card. Removed the two routes,
      four components, hook, api module, transport, proxy route, its tests, and 26
      i18n keys per locale. The tile stays so the product intent is still visible,
      and `git` history keeps the UI if the backend ever ships.
      Branch: `refactor/architecture`
- [x] **1.3 Add `tsc --noEmit` to CI.** Added `pnpm typecheck` and a CI step
      after ESLint. `next build` only typechecks what the build graph reaches.
      Branch: `refactor/architecture`
- [ ] **1.4 Add `knip` to CI as a warning.** Finds unused files, exports, and
      dependencies. It would have found 1.1 on its own. PR: _n/a_
- [ ] **1.5 Prune stale branches.** 35 remote branches are superseded by squash
      merges and will never show as merged. Enable "Automatically delete head
      branches" in repository settings, then delete the existing set. PR: _n/a_
- [ ] **1.6 Fix the PR template.** It still tells contributors to target `dev`,
      which was removed on 2026-07-29. PR: _n/a_
- [ ] **1.7 Retire `PREDICTION_INTEGRATION_TODO.md`.** Move any live items into
      issues; the file is a working note at the repository root. PR: _n/a_

### Phase 2: boundaries

- [x] **2.1 Promote three shared primitives to `components/ui/`.**
      `sheet-nav.tsx` (12 consumers across funds, casino, remit, trade),
      `qr-code.tsx` (funds, casino), `deposit-status.tsx` (funds, casino). These
      were the only genuine cross-feature couplings in the codebase.
      Branch: `refactor/architecture`
- [x] **2.2 Demote feature components out of `components/ui/`.**
      `side-panel.tsx` and `image-upload-field.tsx` to earn, `money-ticker.tsx`
      to casino/last-standing. They move to their current feature folder, not to
      `features/`, so they travel with the slice when it migrates.
      **`sparkline.tsx` stays in `ui/`.** The earlier plan listed it for
      demotion on usage count, but its only consumer is a shared modal, not a
      feature, and a sparkline knows nothing about any feature. By the rule in
      section 2 it is a primitive. Branch: `refactor/architecture`
- [~] **2.3 Collapse to one transport.** New `lib/api/service.ts` exposes
  `createServiceClient(basePath, fallbackMessage)`, so a service is defined
  by those two facts rather than by a copied wrapper. Earn, chess and vault
  now bind to it and keep their existing export names, so no call site
  changed. Vault lost a genuinely duplicated `unwrap` that swallowed
  plain-text upstream errors and never checked `res.ok`; it also gains typed
  error codes. Query building is now uniform: `undefined` values are dropped
  instead of being sent as the string "undefined", which only earn did
  before. Covered by `__tests__/api-service-client.test.ts` (9 cases).
  Complete. `lib/casino/api/client.ts` went with Draw, and the
  `lib/casino/api/envelope.ts` alias is gone: its three live importers
  (`cashier`, `chess`, `swiss`) now use `lib/api/envelope` directly, with
  `CasinoApiError` renamed to its real name, `GatewayApiError`.
  Branch: `refactor/architecture`
- [x] **2.4 Zod at the proxy boundary, money paths first.** Pattern established
      and payment done. `lib/api/schemas/payment.ts` describes what the off-ramp
      flow depends on; `lib/server/validate-upstream.ts` is the guard every proxy
      runs. Two rules make it safe on a live route: it **validates without
      transforming**, so the original payload still reaches the client and a
      field the schema does not model is never dropped, and it **only judges
      successful envelopes**, so an upstream error passes through with its own
      status. A schema miss is a 502 plus a log line naming the service, path and
      failing key. Verified against four live gateway responses. Covered by
      `__tests__/validate-upstream.test.ts` (11 cases), including both real
      breakages that already shipped: `fiat.totalFee` disappearing, and a type
      change under an existing key.

  RWA is done too, guarding assets, categories, quote and build. The build
  response matters most, because its steps are the transactions a user is asked
  to sign, so an unrecognised step `kind` now stops at the proxy. Checking the
  schema against the live registry immediately found a contract lie: the gateway
  types `yieldApyBps` as an integer but returns `null` for 29 of its 45 assets,
  and our own `RwaAsset` declared `number | undefined`. Not a user-visible bug,
  because `formatApy` compares with `==`, but the type was wrong and is now
  `number | null`. Covered by `__tests__/rwa-schema.test.ts` (10 cases) using
  fixtures captured verbatim from the registry.

  Trade is done, guarding the token lists and the swap quote whose calls the
  wallet signs. Live checking paid off again: `/tokens/search` returns a bare
  array while `/tokens` and `/tokens/trending` return `{ items }`, so the three
  do not share a schema. A non-JSON upstream body is passed through rather than
  treated as a validation failure. Covered by `__tests__/trade-schema.test.ts`
  (8 cases).

  2.4 is complete for the money paths. Apply the same pattern to a proxy when
  you next touch it; the guard and the schema folder already exist.
  Branch: `refactor/architecture`

### Phase 3: slices

Migrate a feature when you are already working in it. Moves only, no edits in
the same commit, so `git` tracks renames and review stays readable.

- [x] **3.1 `features/rwa/`** the pilot. 18 files: 10 components, 5 hooks, 2 lib
      modules and the index. `app/dashboard` and `use-global-search` reach it only
      through `features/rwa/index.ts`. Zero deep imports from outside, zero upward
      imports from `lib/` or `components/`. The move disproved the claim in section 3
      that this slice was self-contained: `lib/rwa/funding.ts` is the cross-chain
      funding engine that `use-sell`, `use-solana-funding` and `use-solana-proceeds`
      all depend on, and `USDC_BY_CHAIN` is a chain constant, not an RWA concept.
      Both came out first, to `lib/trade/funding.ts` and `lib/trade/usdc.ts`, or the
      slice would have inherited false ownership. Expect this on every slice: what
      looks like feature code is often cross-cutting code that arrived with the first
      feature to need it. Branch: `refactor/architecture`

- [ ] **3.2 Add `eslint-plugin-boundaries`.** After the second slice exists, so
      the rule has something to catch. PR: _n/a_
- [ ] **3.3 `features/portfolio/`** PR: _n/a_
- [ ] **3.4 `features/funds/`** PR: _n/a_
- [ ] **3.5 `features/remit/`** PR: _n/a_
- [ ] **3.6 `features/prediction/`** PR: _n/a_
- [ ] **3.7 `features/trade/`** PR: _n/a_
- [ ] **3.8 `features/earn/`** PR: _n/a_
- [ ] **3.9 `features/casino/`** last. 39 components, and the two files over
      1,000 lines want splitting on the way in. PR: _n/a_
- [ ] **3.10 `components/layout/`** move the shell out of
      `components/dashboard/`, then delete the empty folder. PR: _n/a_
- [ ] **3.11 Colocate tests.** Move `__tests__/*` beside their subjects. PR: _n/a_

### Phase 4: confidence

- [ ] **4.1 Five Playwright specs against a preview deployment.** Log in,
      deposit, withdraw, buy, sell. This is what turns "the diff looks fine" into
      "the money still moves". PR: _n/a_
- [ ] **4.2 Split the files over 1,000 lines.** `play-section.tsx`,
      `last-standing-section.tsx`. Extract server state into hooks and derivation
      into tested `lib/` functions. PR: _n/a_
- [ ] **4.3 `CODEOWNERS`.** Route `lib/trade`, `lib/payment`, `app/api/**` to a
      reviewer by default. PR: _n/a_

---

## 7. Packages

Add these. The dependency list is otherwise lean and should stay that way.

| Package                         | Why                                                                                                                                                                                              | Priority |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `zod`                           | Validates upstream responses at the boundary and infers the type. Replaces the hand-written normalizers. A backend shape change then fails loudly at the proxy instead of rendering `undefined`. | High     |
| `eslint-plugin-boundaries`      | Makes the layering a CI failure rather than a review opinion. Without it the structure decays.                                                                                                   | High     |
| `@playwright/test`              | No end to end coverage today on an app that moves money.                                                                                                                                         | High     |
| `knip`                          | Finds unused files, exports, and dependencies.                                                                                                                                                   | Medium   |
| `@tanstack/eslint-plugin-query` | Catches query key and dependency mistakes across 57 hooks.                                                                                                                                       | Medium   |

Deliberately not adding: a state manager (Query plus local state covers it), a
component library (there is a real design system in `globals.css` and adding one
now would fragment it), a form library (forms are small), Storybook (high
maintenance for this team size; Playwright buys more).

---

## 8. Open decisions

Recorded so they are chosen rather than defaulted into.

1. **Client versus server components.** 75 percent client with no server data
   fetching means the App Router is being used as a client side router with a
   proxy layer. That is a legitimate architecture, but it should be a decision.
   Current position: new read-heavy pages fetch on the server; existing pages are
   not migrated for their own sake.
2. **The Arkade hub and Draw pages.** See task 1.2. They are live routes with a
   dead data layer.
3. **Slice boundaries.** If two slices keep reaching for each other, that is
   evidence they are one feature. Merging them is the correct response. The
   structure serves the code, not the other way round.
