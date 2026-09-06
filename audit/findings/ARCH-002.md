# ARCH-002 — `mini-timer.tsx` (678 lines) mixes state, derivation, and layout

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Category**    | Architecture                                              |
| **Severity**    | Medium                                                    |
| **Confidence**  | Likely                                                    |
| **Effort**      | M                                                         |
| **Status**      | 🔴 Open                                                   |
| **Location(s)** | `features/casino/components/last-standing/mini-timer.tsx` |

## Summary

A component named "mini-timer" carrying **678 lines** is a smell: a timer widget almost certainly should not hold that much code. It bundles socket/subscription state, time derivation, and layout in one file. `MiniTimerHost` is also mounted app-wide via `app/providers.tsx` (though it only subscribes while the pop-out is open).

## Impact

Hard to test and optimize; a likely re-render hot-spot given it combines a ticking timer with layout. Being provider-mounted, any accidental broadening of its subscription would have app-wide reach.

## Evidence / Repro

- Objective line count at commit `bf2770e`.
- Provider mount in `app/providers.tsx` (`MiniTimerHost`).

## Recommendation

Split into: a subscription/state hook (`use-*`), a pure time-derivation util in `features/casino/lib/*`, and thin presentational components. Confirm the subscription stays scoped to when the pop-out is open (align with the ticking-clock separation in PERF-001).

## References

- Related: PERF-001 (clock/volatile-state separation), ARCH-001 (casino god-components).

## Notes

Seeded at **Likely**; read the file to confirm the responsibility mix before decomposing.
