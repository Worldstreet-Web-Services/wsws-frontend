# ARCH-005 — Architecture documentation has drifted from the codebase

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| **Category**    | Architecture                                      |
| **Severity**    | Medium                                            |
| **Confidence**  | Confirmed                                         |
| **Effort**      | S                                                 |
| **Status**      | 🔴 Open                                           |
| **Location(s)** | `docs/ARCHITECTURE.md`, `docs/RESTRUCTURE-LOG.md` |

## Summary

`docs/ARCHITECTURE.md` — explicitly the doc to "read before adding a directory" — describes **9 slices / 329 files**. The tree at commit `bf2770e` has **12 slices / ~600 feature files**: `referrals`, `square`, and `tour` were added after the restructure and appear in neither the slice list nor the structure section.

## Impact

The canonical onboarding/decision doc no longer matches reality, so it can't be trusted for boundary decisions or "where does this go" questions — the exact thing it exists to answer. New contributors get stale guidance.

## Evidence / Repro

- `ls features/` → 12 slices; the doc lists 9.
- Feature-file count (~600) vs the doc's 329.
- `referrals`/`square`/`tour` absent from the doc's slice enumeration.

## Recommendation

Refresh `ARCHITECTURE.md`: update the slice list and counts, add the three missing slices, and re-record the god-component targets (see ARCH-001, which regressed). Explicitly document the `globals.css` `@source` requirement for new top-level dirs (the silent-failure trap the log notes — a new dir whose classes silently drop with a green build). Consider a lightweight check that fails CI when a new `features/*` dir isn't listed.

## References

- `docs/RESTRUCTURE-LOG.md` (tail notes the trap and the split targets).
- Related: ARCH-001.

## Notes

Confirmed. Low effort — a doc refresh — but high leverage for keeping the (strong) boundary discipline intact.
