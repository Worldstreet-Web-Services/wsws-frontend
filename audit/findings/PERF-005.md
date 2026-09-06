# PERF-005 — `portfolio-view` runs a full table engine every render to feed hidden UI

|                 |                                                    |
| --------------- | -------------------------------------------------- |
| **Category**    | Performance                                        |
| **Severity**    | Medium                                             |
| **Confidence**  | Confirmed                                          |
| **Effort**      | S                                                  |
| **Status**      | 🔴 Open — still present                            |
| **Location(s)** | `features/portfolio/components/portfolio-view.tsx` |

## Summary

`PortfolioView` builds a full `useReactTable` instance (sorting, filtering, pagination) on every render to drive the holdings UI — but both the mobile `HoldingsMobile` block and the desktop holdings table are wrapped in `hidden` "per the 2.0 design," so the computed table feeds UI that never displays. `crossBorderSlot` is destructured-but-unused and `exploreTokensSlot` is commented out.

## Impact

Every render (including each 60s `use-portfolio` tick, PERF-003) does the table's sort/filter/paginate work for nothing. Dead-but-computed cost concentrated in a top-level dashboard component that many things re-render.

## Evidence / Repro

- Static: `useReactTable(...)` output flows only into subtrees under `className="hidden"`; `crossBorderSlot` unused.
- Dynamic: Profiler on the dashboard; confirm the table hook runs on ticks though nothing renders it. Temporarily `console.count` the table build to see frequency.

## Recommendation

Gate the table engine behind whether the holdings UI is actually shown (conditionally construct it, or lazy-mount the holdings block), and remove the unused `crossBorderSlot`/commented `exploreTokensSlot`. Revisit whether the hidden 2.0 holdings surfaces should be deleted or restored.

## References

- Related: PERF-003 (the 60s driver), ARCH-007 (dashboard as coupling hub).

## Notes

**Verification (2026-09-06):** 🔴 Confirmed still present. `features/portfolio/components/portfolio-view.tsx:161` builds `useReactTable` (+ `getSortedRowModel` `:171`), but the holdings UI it feeds is rendered under `hidden` — mobile `:378`, desktop `:396`. `crossBorderSlot` remains destructured-but-unused (`:56`, comment `:102`, commented render `:344`); `exploreTokensSlot` commented at `:528`. Dead-but-computed on every render. Still open for remediation.
