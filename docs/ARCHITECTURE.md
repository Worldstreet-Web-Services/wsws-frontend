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
hooks/          cross-cutting React hooks. Same rule, same layer.
   |  may import
lib/            pure cross-cutting: api client, money, format, brand.
```

`components/ui/` and `hooks/` are siblings on the shared layer: one holds
presentation primitives, the other behaviour every feature needs. `lib/` sits
below both and stays framework-free, so a hook cannot live there.

Reusable building blocks live in `components/ui/` and `lib/`. They are shared by
everyone precisely because they sit below the feature line and depend on nothing
above it. A feature slice is not a silo. It is the layer that consumes the
shared floor.

Three consequences worth stating plainly:

1. **Features never import each other, at all.** Not even through the index.
   Features are siblings; the route composes them. When one feature's view needs
   to display another's, the page passes it down as a slot: `app/dashboard`
   renders `<PortfolioView crossBorderSlot={<CrossBorderBanner … />} />` rather
   than letting portfolio reach for remit. This keeps the feature graph flat, so
   no pair of slices can become mutually undeletable. Enforced by
   `eslint-plugin-boundaries`.
2. **`lib/` is for what two or more features need.** If only RWA uses it, it
   belongs in `features/rwa/lib/`.
3. **One transport.** One `apiFetch`, one envelope unwrapper, one `ApiError`.
4. **A hook used by three or more features is shared,** and belongs in `hooks/`.
   `usePortfolio` is the clearest case: 34 importers across funds, trade,
   casino, rwa, sell, remit and meme. It is the app's balance source, not a
   feature's, and putting it inside `features/portfolio/` would have forced
   every other slice to import through that feature's index.

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
  activity/                     the transaction feed

components/
  ui/                           design system, used by three or more features
  layout/                       the shell itself: dashboard-shell, sidebar, topbar, nav-items

hooks/                          cross-cutting hooks, e.g. usePortfolio

lib/                            cross-cutting only
  api/                          client.ts, envelope.ts, error.ts, schemas/
  money/  format/  brand.ts  currencies.ts  wsapi-base.ts
  server/                       server only, a client import must fail

messages/                       five locales, unchanged
config/                         chain registries, unchanged
```

`components/dashboard/` dissolves. It held 190 files. 165 were feature
components and went to their slice; 12 were genuinely shell and went to
`components/layout/`. The remaining 13 landed in three other places, which is
the useful part of the count: `async-state` and `avatar` were design-system
primitives, `modal-types` was a pure type contract that belonged on the shared
floor in `lib/`, and the rest were feature components filed under the shell,
including a whole activity slice split across two folders.

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
- [x] **1.4 Run `knip`, delete what it proves is dead.** `npx knip`, with the
      committed `knip.json`. The first run reported 28 unused files; 11 were genuinely
      dead and are deleted. The largest was the Jupiter swap path, `lib/trade/jupiter`
      plus `use-swap-execute` and `use-trade-quote`, which the holdings buy and sell
      flow superseded in PR #33 and nothing has imported since. Alongside it,
      `use-polymarket-withdraw` with its only dependency `use-evm-swap-execute`, the
      Polymarket `public-client`, four retired funds screens, and a confetti component
      that the round overlay replaced with the `canvas-confetti` package. The other 17
      are not dead, which is why the tool is configured rather than trusted blindly.
      Three are referenced by string and so invisible to static analysis:
      `public/sw.js` is passed to `navigator.serviceWorker.register` in
      `use-push-notifications`, the Stockfish build is a `workerUrl`, and
      `vitest.server-only-stub` is a `vitest.config` alias. Deleting the first would
      have silently killed push notifications. The other 14 were the in-house voice
      pipeline, and chasing them down showed the assistant is not gone: `app/layout.tsx`
      loads an external Vivid widget script, and `VividWidgetDock` renders `null` and
      only positions it. The in-house recorder, orb, transcript panel, wake word and
      ElevenLabs proxy were that widget's predecessor, left commented out in
      `app/providers.tsx` rather than removed. All 19 files went, along with
      `app/api/tts` and five environment variables that nothing read any more.
      `lib/voice/{intent,prefill,chain-match,dock}` stayed: they carry the deposit and
      trade prefill types that funds, trade and rwa still use, which is why the folder
      survives its own feature. `knip.json` now ignores only the three string-referenced
      entries. Branch: `refactor/architecture`
- [ ] **1.5 Prune stale branches.** 35 remote branches are superseded by squash
      merges and will never show as merged. Enable "Automatically delete head
      branches" in repository settings, then delete the existing set. PR: _n/a_
- [ ] **1.6 Fix the PR template.** It still tells contributors to target `dev`,
      which was removed on 2026-07-29. PR: _n/a_
- [x] **1.7 Retire `PREDICTION_INTEGRATION_TODO.md`.** Deleted. It was the
      v1.2.0 integration guide from the backend team, and every step in it shipped in
      PR #183. It carried no open items, and each path it named had since moved, so
      it could only mislead. Branch: `refactor/architecture`

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

- [x] **3.2 `eslint-plugin-boundaries`.** Two policies on
      `boundaries/dependencies`: a feature may not import another feature, and
      `lib`, `components/ui` and `hooks` may not import upward into `features`,
      `app` or the unmigrated shell. `components/**` is typed `legacy` and may still
      reach anything until its slice moves, so the rule guards what is migrated
      without blocking the rest. Verified by planting each violation type and
      confirming the right message fires, then reverting.

  Two things the plugin's v7 API cost us, worth knowing before editing this
  config: element patterns match partially by default, so `lib/**` also matched
  the `lib/` folder inside a slice and misattributed errors until every
  descriptor got `partialMatch: false`. And `internalPath` inside a `to` selector
  is silently ignored, so the "import a feature through its index" rule could not
  be expressed; it is convention, currently true, and visible as zero deep
  imports from outside either slice.

  The rule immediately caught one real violation: `use-global-search` sat in the
  shared `hooks/` layer while importing `@/features/rwa`. It aggregates
  portfolio, market tokens and RWA for one consumer, the topbar, which makes it
  shell composition rather than shared infrastructure. Moved beside its consumer;
  it travels to `components/layout/` with task 3.10.
  Branch: `refactor/architecture`

- [x] **3.3 `features/portfolio/`** the display layer only: balance card, donut,
      wallet list, portfolio view, plus `holdings` and `breakdown`. `usePortfolio`
      deliberately stayed in `hooks/`: 34 importers across every feature area make it
      infrastructure, not a feature's, and burying it in this slice would have forced
      every other slice to import through a portfolio index. That gap is now named in
      section 2, `hooks/` is the shared behaviour layer beside `components/ui/`.
      Branch: `refactor/architecture`
- [x] **3.4 `features/funds/`** deposit and withdraw: 17 screens, the KYC
      onboarding, and the two modals that mount them. The modals came along because
      `app/dashboard` was their only consumer, which makes them the slice's entry
      points rather than shell chrome. `lib/pouch/` split three to three:
      `banks`, `kyc` and `session` proved funds-only and moved; `offramp`, `onramp`
      and `pending` stayed, since the API routes and the portfolio balance card read
      them. `lib/deposit` and `use-deposit` stayed too, at 27 and 8 importers.
      Branch: `refactor/architecture`
- [x] **3.5 `features/remit/`** the cross-border corridor: 9 components,
      `use-offramp`, `cross-border`, and the payment-service `offramp` and `pending`
      helpers. `lib/pouch/*` and `use-pouch-offramp` stayed shared. They read like
      remit, but they are the PouchPay NGN bank rail, with six consumers across funds,
      portfolio and two API routes. Two different off-ramps, one name. Moving the
      banner into this slice exposed a portfolio-to-remit import, which the 3.2 rules
      caught. Resolved with a slot prop rather than a relaxed rule. Branch:
      `refactor/architecture`
- [x] **3.6 `features/prediction/`** the largest slice: 29 components, 21 hooks
      and 16 lib files. The first consumer sweep looked alarming, until it turned out
      almost every "external" importer was prediction code shelved elsewhere: the two
      views under `components/dashboard/views/`, and `use-bet`, `use-settle`,
      `use-create-event`, `use-lp-auto-return` sitting in the flat hooks folder. Once
      the boundary was drawn correctly, exactly one true leak remained. Three files
      stayed behind for the server: `lib/prediction-image` (read by
      `lib/server/polymarket`) and `lib/polymarket/config` and `restricted`, both read
      by API routes, which must not pull a client barrel into a route handler.
      `lib/prediction.ts` became `lib/positions.ts`. Branch: `refactor/architecture`
- [x] **3.7 `features/trade/`** spot, perps, buy, sell and meme: 20 components and
      10 hooks. All of `lib/` stayed. `lib/sell` and `lib/meme/api` are read by
      prediction and portfolio, and `lib/buy` is anchored by `lib/buy-quote`, which
      `lib/sell` reads in turn. `use-trade-prefill` and `use-evm-swap-execute` stayed
      for the same reason, since rwa and prediction call them. Two couplings needed
      real fixes rather than exemptions: `PerpConfirmModal` had no perp knowledge at
      all, only title, rows and callbacks, so it became `components/ui/confirm-dialog`
      where prediction can use it honestly; and the meme sell sheet moved up to
      `app/dashboard`, following the `onOpen*` convention portfolio already used for
      buy, sell, detail and rwa. Branch: `refactor/architecture`
- [x] **3.8 `features/earn/`** the bounty board: 24 components, 8 hooks and 18 lib
      files, and the first slice that moved whole. One sweep, one hit, and that hit was
      `use-image-upload`, an earn component's own hook parked in the flat folder. Ten
      route pages under `app/earn/` now import from the index instead of reaching for
      section files. It stayed clean because earn talks to its own gateway service and
      shares no money rails with the rest of the app.
      Branch: `refactor/architecture`
- [x] **3.9 `features/casino/`** chess, Swiss tournaments and Last Man Standing:
      35 components, 10 hooks, 23 lib files. `lib/casino/chess-identity` left the
      folder entirely rather than joining the slice. It imports `@privy-io/node` and
      only two route handlers call it, one of them the perp proxy, so it was server
      code filed under a client feature and now lives in `lib/server/`. Last Man
      Standing rendered trade's `SellSheet` from its own state deep inside an
      1,100-line component: the fix was a render prop supplied by the route, which
      inverts the dependency while leaving the JSX tree untouched. Splitting the two
      files over 1,000 lines is deferred to 4.2, so this move stays reviewable.
      Branch: `refactor/architecture`
- [x] **3.10 `components/layout/`** `components/dashboard/` is gone. Twelve files
      were the shell and moved to `components/layout/`. The other thirteen were not:
      `async-state` and `avatar` were `ui/` primitives, `modal-types` was a pure type
      contract read by six features and moved to `lib/`, the kash cards belonged to
      portfolio, the spot, perps, meme and markets views belonged to trade, and the
      activity feed was a ninth slice split across two folders. The lint element map
      lost its `legacy` escape hatch in the same commit: `components/layout/` is now
      its own type, and everything else under `components/` is `shared-ui`, which may
      not import upward. Branch: `refactor/architecture`
- [x] **3.11 Colocate tests.** 87 of 98 test files now sit beside their subject and
      carry its name, so `presenter.ts` is covered by `presenter.test.ts` in the same
      folder. The 11 left in `__tests__/` are the ones with no single subject: route
      handlers, the two live-registry probes, and the smoke test. `vitest` needed no
      change, since its include glob was already repository-wide. Colocation put the
      boundary rules over the tests too, which immediately caught a schema test in
      `lib/` reaching into `features/rwa` for `formatApy`. It was testing two layers
      at once; the presenter half moved to the presenter's own test.
      Branch: `refactor/architecture`

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
