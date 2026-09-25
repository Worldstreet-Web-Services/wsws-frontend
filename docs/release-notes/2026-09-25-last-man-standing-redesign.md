---
date: 2026-09-25
feature: The Last Man wears its new design, on the state machine it already had
scope: feat
scenario-impact: needs_automation
---

# The Last Man, re-skinned

The arcade screen at `/casino/last-standing/[gameId]` now draws the rebranded
design: a breadcrumb and status pill over a two column layout, the stage card
on the left, one rail card on the right, and a tabbed activity panel across the
foot.

Nothing under the presentation moved. The socket, the polling cadence, the
countdown's freeze on a degraded connection, the bigint money maths, the
round-end sequence, the settle and claim paths, the coin flight, the music, the
pop-out prompt and the reveal overlay are the code that was already there.
See `docs/adr/ADR-2026-09-25-last-man-standing-redesign.md`.

## What changed

`features/casino/components/last-standing/last-standing-section.tsx` keeps
every hook, effect and handler it had and hands its numbers to three
presentational components instead of drawing them itself:

- `stage-card.tsx` takes the phase, the formatted clock, the ring's progress,
  the leader strip and the two stat tiles.
- `rail-cards.tsx` takes whichever single card the state allows, under a pager.
- `activity-panel.tsx` takes the feed as formatted rows, with the game rules
  and the past rounds behind its other two tabs.

The design draws four states. The screen has about sixteen, and the eleven the
design never drew are restyled rather than dropped:

| State                   | How it reads now                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Loading                 | A skeleton the stage's own height, not an empty clock                                         |
| Load failed / not found | The same alert, retry and lobby link, under the new header                                    |
| Connection lost         | The clock dims and freezes; a banner above says why                                           |
| Final ten seconds       | The stage's own edge pulses red, through its overlay slot                                     |
| You are leading         | The leader strip is marked as yours, with a "You" chip, plus the tension line under the stage |
| Someone else leading    | The strip names them and the rail badges you as behind                                        |
| Needs funds             | The rail's action button reads "Add money to play" and opens the deposit flow                 |
| Placing a play          | The button spins and locks                                                                    |
| Round ended, unsettled  | The rail's claim card carries the settle action, and says "Not Claimed"                       |
| Round ended, settled    | The claim card leaves, and the stage points at a new game                                     |
| Pending winnings        | The claim card offers "Claim {amount}"                                                        |
| Empty feed              | The table says nobody has played                                                              |

## The rail

The state picks the card and the pager reaches the rest. A card whose action
cannot be taken is never listed, so the pager's length is the state's own
answer to "what can I do here": play while a round runs, settle or claim when
one has ended owing money, and invite at every moment, because the starter
earns from everyone who joins through the link.

## Money

The stake is held in the game asset's base units as a `bigint` and stepped by
the game's own minimum, never below it and never past the wallet balance. The
figure on screen is derived from those units at the display edge, so what is
shown and what is signed cannot drift apart. The free-typed liquidity field it
replaces is gone; a larger stake is now the same control, stepped up.

## Additions to the finished components

Two optional props, each with its own tests, both to keep behaviour that
existed before:

- `RailActionCardProps.ctaRef` gives the section the action button's box, which
  is where the wager's coin flight launches from.
- `ActivityRow.href` links a row's player cell to the play on chain, which the
  old feed did on every row.

`components/ui/qr-code.tsx` gained a `bare` prop so the invite card's own white
tile is not nested inside a second one, and `useVaultFeeds` now reports
`activitiesLoading` so the table can tell a first paint from an empty round.
`share-game.tsx` grew a `useGameShare` hook, which the card, the header button
and the rail's invite card all share instead of holding three copies of the
link, the toasts and the native-sheet fallback.

## Locales

All 56 new keys were already in `en`, `de`, `es`, `fr` and `pt`. No key was
added, renamed or removed by this change. Activity timestamps go through
`next-intl`'s own relative time formatter, so they are localised rather than
English-only.

## Tests

`features/casino/components/last-standing/last-standing-section.test.tsx` is
new: 25 tests with every hook mocked, covering each stage phase, the rail
showing the right card and never an impossible one, the pager reaching the
invite, settle still reachable on a round that ended unsettled, the frozen
clock, the needs-funds CTA, the stepper's floor and ceiling, and the tabs
reaching the rules and the past rounds. Four more were added to the rail and
activity suites for the two new props.

Every existing test passed unedited. `pnpm vitest run features/casino
app/api/vault lib/i18n-catalogs.test.ts`: 108 files, 921 tests, all passing
(892 before). Typecheck, lint at zero warnings, Prettier and the production
build are clean.

## Still to do

Player faces are the deterministic fallback mark everywhere, because the market
square exposes no lookup from a wallet address to a profile yet. When it does,
the avatars fill in with no change to these components.
