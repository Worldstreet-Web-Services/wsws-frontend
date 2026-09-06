# ARCH-001 — Casino mega-components; the files the docs promised to split have grown

|                 |                                  |
| --------------- | -------------------------------- |
| **Category**    | Architecture                     |
| **Severity**    | High                             |
| **Confidence**  | Confirmed                        |
| **Effort**      | L                                |
| **Status**      | 🔴 Open                          |
| **Location(s)** | `features/casino/**` (see table) |

## Summary

The `casino` slice concentrates the codebase's structural debt: it owns **8 of the 12 largest files**, and the two files `docs/ARCHITECTURE.md` explicitly recorded for splitting have **grown instead of shrinking**.

| Lines | File                                                                 | Docs recorded    |
| ----- | -------------------------------------------------------------------- | ---------------- |
| 2,604 | `features/casino/components/chess/play-section.tsx`                  | 1,530 (to split) |
| 1,427 | `features/casino/components/last-standing/last-standing-section.tsx` | 1,177 (to split) |
| 1,318 | `features/casino/components/chess/review-section.tsx`                | —                |
| 1,063 | `features/casino/hooks/use-casino-chess.ts`                          | —                |
| 1,041 | `features/casino/components/chess/swiss/detail-section.tsx`          | —                |
| 1,002 | `features/casino/components/draughts/checkers-play.tsx`              | —                |

## Impact

God-components mix state, derivation, and layout, making them hard to reason about, review, test, and optimize — and they are prime re-render offenders (a change anywhere re-renders the whole tree). That the recorded remediation regressed signals the split target isn't being enforced.

## Evidence / Repro

- Objective line counts (`wc -l`) at commit `bf2770e`.
- `docs/ARCHITECTURE.md` §8/§9 lists `play-section` at 1,530 and `last-standing-section` at 1,177 as split candidates.

## Recommendation

Re-ratify a max-file-size target and decompose the worst offenders by responsibility (extract derivation into `features/casino/lib/*` and hooks, split layout into subcomponents). Start with `play-section.tsx`. Consider a lint rule (`max-lines`) as a ratchet so the target can't silently regress again.

## References

- `docs/ARCHITECTURE.md` §8/§9; `docs/RESTRUCTURE-LOG.md`.
- Related: ARCH-002 (`mini-timer.tsx`).

## Notes

Confirmed via line counts. Effort **L** — decomposition is real work; prioritize the files that are actively edited.
