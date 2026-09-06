# PERF-006 — Prediction hooks run ~8 concurrent polls, none paused in background

|                 |                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Category**    | Performance                                                                                                      |
| **Severity**    | ~~Medium~~ → Low (downgraded on verification)                                                                    |
| **Confidence**  | Confirmed                                                                                                        |
| **Effort**      | S                                                                                                                |
| **Status**      | 🟡 Mostly mitigated                                                                                              |
| **Location(s)** | `features/prediction/hooks/use-prediction-markets.ts`, `use-prediction-detail.ts`, `use-prediction-portfolio.ts` |

## Summary

The prediction REST hooks are poll-heavy: `use-prediction-markets` (4 queries at 15/20/30/60s), `use-prediction-portfolio` (5 queries mostly 20s), `use-prediction-detail` (3 queries 20–30s). On a detail page the live stream **plus** ~8 polls run concurrently, and none set `refetchIntervalInBackground: false`, so they continue in hidden tabs.

## Impact

Sustained network + re-render pressure on prediction screens, continuing when backgrounded. Compounds with the always-on marquee polls (PERF-004).

## Evidence / Repro

- Static: the polling `useQuery`s lack the background-pause flag.
- Dynamic: open a prediction detail route, background the tab, watch DevTools → Network keep firing all ~8 polls.

## Recommendation

Add `refetchIntervalInBackground: false` across the prediction hooks. Consider pausing offscreen via the existing `useSectionActive` gating already used by the perp market hooks (`features/trade/hooks/use-perp-markets.ts`), and widening intervals for the slower-moving queries.

## References

- Good pattern: perp hooks pause via `subscribed: active` and slow down when the socket is healthy.
- Related: PERF-004, PERF-008.

## Notes

**Verification (2026-09-06):** ⚠️ Largely mitigated already. All prediction queries pass `subscribed: active` where `active = useSectionActive()` (`use-prediction-markets.ts:19/28`, `use-prediction-portfolio.ts:22/31`, `use-prediction-detail.ts:24/34`), so polling unsubscribes when the section is offscreen — a stronger gate than the background flag. Residual: only `use-prediction-detail.ts:33` sets `refetchIntervalInBackground: false`; adding it to the others is a minor belt-and-suspenders tweak for the backgrounded-but-in-view edge case. Downgraded **Medium → Low**.
