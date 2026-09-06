# PERF-004 — Feature marquee runs 4 polls on every screen, even in background tabs

|                 |                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------- |
| **Category**    | Performance                                                                                  |
| **Severity**    | Medium                                                                                       |
| **Confidence**  | Confirmed                                                                                    |
| **Effort**      | S                                                                                            |
| **Status**      | 🟢 Fixed — remediated (parallel)                                                             |
| **Location(s)** | `components/layout/feature-marquee.tsx` (mounted by `components/layout/dashboard-shell.tsx`) |

## Summary

`FeatureMarquee` — present on **every dashboard route** — runs 4 `useQuery`s (`lastman`, `lastmanChain`, `chess`, `checkers`) each at `refetchInterval: pollUnlessFailing(LIVE_REFRESH_MS = 30_000)`. None set `refetchIntervalInBackground: false`, so they keep firing in hidden tabs. It also drives animation setState via `LIVE_CYCLE_MS = 4_000` / `LIVE_SWEEP_MS = 10_000`.

## Impact

4 network polls + periodic animation re-renders on a component that is always mounted, continuing when the tab is backgrounded — unlike most other polls in the app, which correctly pause on blur. Steady wasted network + wake-ups per user, multiplied across the whole session.

## Evidence / Repro

- Static: the 4 `useQuery` calls lack the background-pause flag.
- Dynamic: DevTools → Network, open a dashboard route, switch to another tab, confirm the 4 requests keep firing on the 30s cadence.

## Recommendation

Add `refetchIntervalInBackground: false` to the 4 queries (matches the rest of the app). Optionally gate the animation timers on document visibility. Consider whether the marquee needs to poll on _every_ route or only where it's visible.

## References

- Good pattern: `hooks/use-kash.ts` documents the background-pause it added after this was "the single most expensive call."
- Related: PERF-006 (same class in prediction hooks).

## Notes

**Verification (2026-09-06):** ✅ Resolved. All four marquee queries set `refetchIntervalInBackground: false` (`components/layout/feature-marquee.tsx:105, 116, 125, 133`), and the component also gates UI cadences via `useDocumentVisible` (`:69-79`). Polls pause in background tabs. No further action.
