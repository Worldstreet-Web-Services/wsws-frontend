# PERF-003 — usePortfolio() returns a fresh wrapper object every render

|                 |                                                                             |
| --------------- | --------------------------------------------------------------------------- |
| **Category**    | Performance                                                                 |
| **Severity**    | High                                                                        |
| **Confidence**  | Confirmed                                                                   |
| **Effort**      | M                                                                           |
| **Status**      | 🟢 Fixed                                                                    |
| **Location(s)** | `hooks/use-portfolio.ts:166` (pre-fix return), now `hooks/use-portfolio.ts` |

## Summary

`usePortfolio()` built and returned a brand-new object literal on every render.
The hook is mounted app-global (via `AnalyticsSegments`) and read by ~40
consumers directly, plus ~32 more through `useCasinoWallet`. Because the wrapper
had a new identity every render, every consumer that destructured it saw a
changed reference on every parent render and on every 60s poll tick, defeating
`React.memo` and `useMemo`/`useEffect` dependency checks downstream.

The underlying pieces were already stable: `tokens` falls back to a module-level
`EMPTY_TOKENS` singleton and React Query's structural sharing keeps
`query.data.tokens` at a stable identity across unchanged polls, and the four
callbacks (`refetch`, `refetchFresh`, `refetchUntilChanged`,
`waitForTokenBalance`) are `useCallback`-stable. Only the wrapper object was
churning.

## Impact

- One shared hook, ~72 consumers (40 direct + 32 via `useCasinoWallet`).
- Before: a new wrapper identity on every render of the app-global mount and on
  every 60s background poll, so any consumer relying on referential equality of
  the returned object re-rendered needlessly and re-ran memos/effects keyed on
  it.
- After: the wrapper keeps a stable identity until a value a consumer actually
  reads (`totalUsd`, `tokens`, `loading`, `refreshing`, `error`, or a callback)
  changes.

## Evidence / Repro

Static: `hooks/use-portfolio.ts` returned an inline object literal
(`return { totalUsd: ..., tokens: ..., ... }`) with no `useMemo`, so its
identity changed every render by construction.

Dynamic (pending): React DevTools Profiler capture on the dashboard while the
60s poll fires, comparing committed renders of `BalanceCard` and the casino
wallet strip before and after. Expected: the "why did this render" reason
"Hook 1 changed" for `usePortfolio` disappears on ticks where no read value
changed. Not yet captured.

## Recommendation / Fix applied

Two parts, both landed in `hooks/use-portfolio.ts`:

1. **Stable wrapper.** The return is now wrapped in `useMemo`, keyed on the real
   inputs: `totalUsd`, `tokens`, `loading`, `refreshing`, `error`, and the four
   already-stable callbacks. No dep was trimmed to fake stability;
   `react-hooks/exhaustive-deps` passes. `tokens` identity stability rides on
   React Query's default structural sharing (the same behavior the pre-fix code
   relied on), so prices that move on a poll still change `tokens` identity and
   consumers still see them.

2. **Slice-selector reads.** Added `usePortfolioTotal()` (selects `totalUsd`) and
   `usePortfolioTokens()` (selects `tokens`) alongside the full hook, using
   TanStack Query's `select`. They share the same `queryKey`, fetch, and polling
   knobs (extracted into `usePortfolioIdentity()`, `fetchPortfolio()`, and
   `PORTFOLIO_QUERY_BEHAVIOR`) so all three mount against one cache entry and one
   background poll. A display-only consumer that reads just the total or just the
   token rows now subscribes to that slice alone and does not re-render when the
   other slice or a status flag ticks. The pattern is documented in a comment
   above the selectors.

### Consumers in the assigned file set

- `features/portfolio/components/balance-card.tsx`: **kept on the full hook.** It
  reads every field the hook exposes (`totalUsd`, `tokens`, `loading`,
  `refreshing`, `error`), so a slice read would give no subscription benefit and
  could not drop the status flags without changing behavior (it shows a
  refreshing hint and an error state). Its per-render churn is fully addressed by
  part 1's `useMemo`.
- `features/casino/components/last-standing/game-balance-card.tsx`: **not a
  portfolio consumer.** It is prop-driven (`balanceUsd`), and that value is the
  game wallet's ETH-on-Base converted to USD, sourced via `useCasinoWallet` in
  its parents (`last-standing-section.tsx`, `last-standing-lobby.tsx`), not the
  portfolio total or token list. The slice selectors are semantically wrong for
  it, so it is unchanged.

The real narrow-read beneficiaries (a header/topbar total display, trade
token-only lists) live in files outside this assignment and can adopt
`usePortfolioTotal()` / `usePortfolioTokens()` in their owning changes.

## References

- Part of the coordinated re-render sweep (sibling PERF findings).
- `lib/react/stable-empty.ts` (frozen empty singletons; `tokens` here keeps its
  existing module-level `EMPTY_TOKENS` to avoid a `readonly[]` type change
  rippling into ~40 out-of-scope consumers).
- TanStack Query `select` docs (slice subscriptions).

## Notes

- Verification: static evidence confirmed; ESLint clean on the changed file;
  `tsc` reports no errors in `hooks/use-portfolio.ts`. Dynamic Profiler capture
  pending.
- Coordination: a concurrent edit had added a manual `useRef`-based
  ref-equality guard for `tokens` in this file. It failed the `react-hooks/refs`
  lint (reads and writes a ref during render inside `useMemo`) and it changed
  behavior (it compared only `symbol`/`rawBalance`/`network`, suppressing the
  identity change when only `priceUsd`/`valueUsd` moved, so price-only updates
  went stale). It was reverted to the original structural-sharing behavior, which
  already gives stable `tokens` identity across unchanged polls without touching
  refs during render. Flagged for the orchestrator.
