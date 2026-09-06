# PERF-002 — `useMoney` returns unmemoized formatter closures, defeating `React.memo`

|                 |                                                                  |
| --------------- | ---------------------------------------------------------------- |
| **Category**    | Performance                                                      |
| **Severity**    | High                                                             |
| **Confidence**  | Confirmed                                                        |
| **Effort**      | S                                                                |
| **Status**      | 🟢 Fixed — remediated (parallel)                                 |
| **Location(s)** | `components/ui/currency-select.tsx` (`useMoney` / `useCurrency`) |

## Summary

`useMoney` returns a **fresh object with inline `format` / `formatExact` closures on every render**. Any child that receives these as props gets a new function identity each render, so `React.memo` on downstream rows can never short-circuit.

## Impact

The formatters flow into the ~**23** money-rendering consumers (balance cards, holdings rows, mini-timer, etc.). Memoized child rows re-render whenever a parent renders, regardless of whether their own data changed — a broad, silent tax on every money surface. Low individual cost, wide reach.

## Evidence / Repro

- Static: the returned object and its `format`/`formatExact` are constructed inline in the hook body with no `useCallback`/`useMemo`.
- Dynamic: Profiler → render a parent of a memoized holdings row, change unrelated state, confirm the row still re-renders; then apply the fix and confirm it stops.

## Recommendation

Wrap the returned formatters in `useCallback` (deps: currency + `rates`) and the returned object in `useMemo`. This is the single lowest-effort, highest-reach win in the audit. Note it **compounds** with PERF-007 (a new `rates` identity every 10 min legitimately re-derives the formatters).

## References

- Good model: the reference-stable shape of `hooks/use-prices.ts`.
- Related: PERF-007, PERF-003.

## Notes

**Verification (2026-09-06):** ✅ Resolved. `components/ui/currency-select.tsx:109-121` wraps `format`/`formatExact` in `useCallback([active, activeRate])` and the returned object in `useMemo`. The formatters are reference-stable across renders, so `React.memo` downstream is preserved. No further action.
