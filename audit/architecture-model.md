# Architecture model — intended vs actual

Summarized from `docs/ARCHITECTURE.md` and `docs/RESTRUCTURE-LOG.md`, cross-checked against the tree at commit `bf2770e`.

## Intended model

Strictly **downward-pointing layers**, enforced by `eslint-plugin-boundaries`:

```
app/                 routes + BFF proxy (app/api/*). No business logic; secrets server-side.
  └─ components/layout/   the only shell that composes features (DashboardShell, Topbar, …)
       └─ features/*      vertical slices; a slice NEVER imports a sibling slice
            ├─ components/ui/ + hooks/   shared, cross-feature primitives
            └─ lib/        framework-free pure logic (money math, api clients, formatting)
```

**Fixed data flow:** `component → hook (TanStack Query) → lib client → app/api/<service> → gateway`. Components never `fetch` directly. Upstream payloads are Zod-validated at the proxy boundary and passed through untransformed. Money is `bigint` base units, converted only at the display edge.

**Cross-feature composition** is done three sanctioned ways only: slot prop, callback-to-route, or render prop — never by importing another slice.

## Actual state (measured)

- ✅ **Boundaries hold.** Zero cross-feature imports across ~600 feature files. Feature→`lib` usage is heavy and appropriate (top: `@/lib/trade`, `@/lib/toast`, `@/lib/errors`, `@/lib/analytics`, `@/lib/api`). This is the healthiest part of the codebase.
- ✅ **Shell is clean.** `dashboard-shell.tsx` owns only chrome-local modal state; children pass through, so shell modal toggles don't re-render feature content.
- ⚠️ **Barrels are façade-only.** Slices import their own internals by absolute alias path rather than through `index.ts`, so barrels are a thin public face with no compiler-enforced internal surface. (Acceptable, but refactors have no guardrail.)
- ⚠️ **Concentrated debt in `casino`** — 8 of the 12 largest files (see [ARCH-001](./findings/ARCH-001.md)).
- ⚠️ **`portfolio-view` mixes three jobs** and computes hidden UI (see [PERF-005](./findings/PERF-005.md)).
- ⚠️ **Docs drift** — the "read before adding a directory" doc lists 9 slices/329 files; the tree has **12 slices / ~600 files** (`referrals`, `square`, `tour` undocumented). See [ARCH-005](./findings/ARCH-005.md).

## Render / state-ownership model

Where shared state lives and how widely a change fans out (the crux of the perf findings):

| Source                                            | Mechanism              | Consumers | Fan-out behavior                                                                                          |
| ------------------------------------------------- | ---------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `components/broadcast/broadcast-session.tsx`      | React Context          | 11        | ⚠️ 1s clock in the value → all re-render/sec while live ([PERF-001](./findings/PERF-001.md))              |
| `components/ui/currency-select.tsx` (`useMoney`)  | module store + emit    | ~23       | ⚠️ intended shared selection, but unmemoized formatters break `memo` ([PERF-002](./findings/PERF-002.md)) |
| `hooks/use-portfolio.ts`                          | TanStack Query, 60s    | 35        | ⚠️ unstable `tokens` array each tick ([PERF-003](./findings/PERF-003.md))                                 |
| `hooks/use-fx.ts`                                 | Query, 10min           | ~23       | ⚠️ new `rates` identity cascades ([PERF-007])                                                             |
| `components/ui/balance-visibility.tsx`            | `useSyncExternalStore` | 7         | ✅ memoized value; intended                                                                               |
| `components/ui/section-visibility.tsx`            | Context (boolean)      | 4         | ✅ primitive value; only flips                                                                            |
| `lib/api/circuit-store.ts`                        | store, no-op publish   | many      | ✅ skips notify when unchanged                                                                            |
| `features/casino/components/casino-nav-guard.tsx` | ref-based Context      | —         | ✅ stable identity, never re-renders                                                                      |

## Reference patterns

Hold these up as the standard to converge outliers onto:

- **`hooks/use-prices.ts`** — request batching (25ms window) **and** a `useRef` value-equality guard so an unchanged refetch does _not_ hand consumers a new object. This is exactly what `use-portfolio` lacks.
- **`lib/api/circuit-store.ts`** — `publish` skips notifying when state is unchanged, so one banner speaks for all requests instead of dozens of rows re-rendering.
- **`features/casino/components/casino-nav-guard.tsx`** — ref-based Context with an empty-dep memo: shared value, zero consumer re-renders.
- **`features/portfolio/components/balance-card.tsx`** — thin dispatcher over a shared view-model (`balance-card-view.ts`); the correct mobile/desktop split (contrast `kash-card`, [ARCH-003](./findings/ARCH-003.md)).
- **`app/dashboard/page.tsx`** scroll-spy sections — `memo`-wrapped with stable handlers, so modal toggles don't re-render them.
