# PERF-001 — 1-second clock bundled in broadcast context re-renders all consumers every second

|                 |                                              |
| --------------- | -------------------------------------------- |
| **Category**    | Performance                                  |
| **Severity**    | High                                         |
| **Confidence**  | Confirmed                                    |
| **Effort**      | M                                            |
| **Status**      | 🔴 Open — still present                      |
| **Location(s)** | `components/broadcast/broadcast-session.tsx` |

## Summary

`BroadcastSessionProvider` (mounted app-wide in `app/providers.tsx`) exposes a **single** memoized context `value` that bundles a per-second clock (`elapsedMs`, `reconnectingMs`, derived from a `now` that ticks every `CLOCK_TICK_MS = 1000`) together with stable session flags and action callbacks. Because the ticking values are in the memo deps, the whole value object gets a **new identity every second** while a broadcast is live.

## Impact

All **11** components using `useBroadcastSession` re-render **once per second** for the entire duration of a live broadcast — including consumers that only read `live`/`phase` and never touch the clock. This is a strong candidate for the "re-rendering all over the app" symptom whenever broadcasting is active.

## Evidence / Repro

- Static: the `useMemo` for the context value lists `elapsedMs`/`reconnectingMs` (1s-cadence) alongside the stable `goLiveWith`/`stop`/etc.
- Dynamic: dev server → React DevTools **Profiler**, start a broadcast, record ~5s. Expect ~1 commit/second with all 11 consumers in the render list. Note which consumers don't read the clock.

## Recommendation

Split the volatile clock out of the stable session value:

- **Two contexts** — a stable `SessionContext` (flags + actions) and a separate volatile `ClockContext`; only the live-bar/timer subscribes to the clock. **or**
- Expose the clock via `useSyncExternalStore` with a selector so only components that read elapsed time re-render.

Mirror the split discipline already used well in `components/ui/section-visibility.tsx` (primitive value) and the ref-based `casino-nav-guard.tsx`.

## References

- [`../architecture-model.md`](../architecture-model.md#render--state-ownership-model)
- Related: PERF-002, PERF-003 (fan-out family).

## Notes

**Verification (2026-09-06):** 🔴 Confirmed still present. `components/broadcast/broadcast-session.tsx:678-755` is a single `SessionContext` whose memoized `value` includes `elapsedMs`/`reconnectingMs` in both the object and its deps; `CLOCK_TICK_MS = 1_000` drives `setNow(Date.now())` every second (`:173, :276`). No clock/session split yet. Still open for remediation (may be in a parallel fixer's queue — re-check before starting to avoid a collision).
