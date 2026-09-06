# ARCH-003 — Inconsistent mobile/desktop split: `kash-card` diverges where `balance-card` unifies

|                 |                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------- |
| **Category**    | Architecture                                                                                |
| **Severity**    | Medium                                                                                      |
| **Confidence**  | Confirmed                                                                                   |
| **Effort**      | M                                                                                           |
| **Status**      | 🔴 Open                                                                                     |
| **Location(s)** | `features/portfolio/components/kash-card.tsx`, `kash-card-mobile.tsx`, `portfolio-view.tsx` |

## Summary

The mobile/desktop split pattern is applied two different ways, and the inconsistency is the finding:

- ✅ **`balance-card` does it right** — `balance-card.tsx` (74L) is a thin dispatcher that renders `BalanceCardDesktop` or `BalanceCardMobile`, both consuming a shared view-model type `balance-card-view.ts`. Callers import one component; the split is internal.
- ⚠️ **`kash-card` does not** — `kash-card.tsx` (319L) and `kash-card-mobile.tsx` (142L) are **two separate public components**, both imported directly into `portfolio-view.tsx` and switched with Tailwind `hidden sm:block` / `sm:hidden`. No shared dispatcher, no shared prop type.

## Impact

The two Kash card variants can drift in props and behavior (the 319-vs-142 line gap suggests they already have). Every caller must know to render both and hide one. This is exactly the class of inconsistency that produced the recent carousel height/edge breakage between the balance and kash cards.

## Evidence / Repro

- `portfolio-view.tsx` imports both kash components and toggles them with `hidden`.
- `balance-card.tsx` + `balance-card-view.ts` demonstrate the intended dispatcher pattern in the same folder.

## Recommendation

Refactor `kash-card` to the `balance-card` shape: a `kash-card.tsx` dispatcher + a shared `kash-card-view.ts` view-model consumed by `KashCardDesktop`/`KashCardMobile`. Callers import one component. This also removes the double-render / hidden-toggle at the call site.

## References

- Reference pattern: `features/portfolio/components/balance-card.tsx` + `balance-card-view.ts`.

## Notes

Confirmed via imports. Effort **M** — mechanical but touches the two variants and their call site.
