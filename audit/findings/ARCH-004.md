# ARCH-004 — Trade surface proliferation; order logic likely copied rather than shared

|                 |                                |
| --------------- | ------------------------------ |
| **Category**    | Architecture                   |
| **Severity**    | Medium                         |
| **Confidence**  | Speculative                    |
| **Effort**      | M                              |
| **Status**      | 🔴 Open                        |
| **Location(s)** | `features/trade/components/**` |

## Summary

Each trade product has many parallel views: spot has `spot-panel`, `spot-section`, `spot-simple-view`, `spot-overview`, `spot-mode`, `mobile-spot-trade`, `mobile-spot-page`; perps has `simple-perps` (588L), `pro-perps` (782L), `perps-view`, `perps-section`, `perps-overview`, `perps-intro`; meme mirrors both. `simple-perps` vs `pro-perps` are the most likely place order/derivation logic has been copied instead of extracted to `features/trade/lib/` (the architecture's stated home for derivation).

## Impact

If order-sizing / validation / fee math is duplicated across simple and pro views, fixes and correctness guarantees have to be made in multiple places — a real risk on money paths. Even if not, the surface count raises the maintenance and re-render-optimization cost.

## Evidence / Repro

- Directory listing of `features/trade/components/` (many parallel `*-view`/`*-section`/`*-panel`/`mobile-*` files per product).
- **To confirm:** diff `simple-perps.tsx` against `pro-perps.tsx` (and the spot equivalents) for shared order logic; grep `features/trade/lib/` for whether that logic already has a home there.

## Recommendation

Run the targeted diff. Extract any shared order/derivation logic into `features/trade/lib/*` and have the simple/pro views consume it. Where views are near-duplicates, consider a dispatcher (as in ARCH-003).

## References

- `docs/ARCHITECTURE.md` — `lib/` is the stated home for derivation.
- Related: ARCH-003 (dispatcher pattern).

## Notes

**Speculative** until the diff is run — this pass identified the proliferation, not confirmed duplication. Do the diff before scoping the refactor.
