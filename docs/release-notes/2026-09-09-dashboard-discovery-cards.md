---
title: The dashboard's discovery shelves show what is live
date: 2026-09-09
area: ui
scenario-impact: needs_automation
---

# Release Note: discovery shelves, one live thing to a card

## What changed

The four shelves under the dashboard's balance cards now deal live content
rather than editorial stand-ins, and every button on every card is a link
that works.

- **Stay Ahead of Token Moves on Spot.** Renamed from "Stay Ahead of Token
  Moves". The Eth Africa promo is gone; the shelf deals up to three coins
  from the spot ranking, one to a card, and every card moves one place when
  the featured coin advances. With nothing to feature the shelf is not drawn.
- **Join the Conversation.** Four cards join the chess room: the Last Man
  round (the richest open round, its pot and its clock, a link into it),
  the rooms live on Market Square (host, title, faces, links into the room
  and to the square in a new tab), Checkers (matches live right now, links
  to play and to the rules) and ArkBall (links to the game and the Arkade).
  The heading opens Market Square in a new tab. A hidden square drops its
  card and the heading falls back to chess.
- **Find the next 100X on Memes.** Renamed. The two Pepe cards are gone;
  the shelf deals up to three trending memecoins, black card, orange card,
  black card, each with its own move on the chips and its ticker in the
  heading. A listing named after a link (a repository, a website) is no
  longer featured. With nothing to feature the design's Pepe and Shiba
  stand in as before.
- **Your Next Prediction Starts Here.** Each card carries one pill, Predict
  Now, into the market on show.

## The bug fixed

The looping carousel switched every cloned slide off with `inert`. On the
last real position, a three-slide two-up loop fills the frame beside the
last slide with a copy of the first, so the card the reader saw had a
button that did nothing. A copy that is in the frame is now live; copies
behind the frame stay inert so nothing is read out or tabbed through twice.
Regression test: `components/ui/carousel.test.tsx`.

## Files

- `features/discovery/components/conversation-card.tsx` (new): the shared
  frame, face scatter, pills with new-tab support.
- `features/discovery/components/conversation-cards.tsx` (new): the four
  cards.
- `features/discovery/hooks/use-live-conversations.ts` (new): the square's
  live lane, polled every minute, idle when the square is hidden.
- `features/discovery/components/conversation-row.tsx`,
  `token-moves-row.tsx`, `next-100x-row.tsx`, `prediction-starts-row.tsx`,
  `discovery-row.tsx`, `components/ui/carousel.tsx`.
- `app/(session)/(app)/dashboard/discovery/memecoins.ts`: link-named
  listings are not promotable.
- `messages/{en,de,es,fr,pt}.json`: new `discovery.*` strings; the Eth
  Africa and "See Other Prediction" strings removed.
- `public/market/token-coin.svg`, `token-coin-right.svg`,
  `token-crowd.svg` removed.

## Scenarios

Manual, on the preview: step every shelf with the arrows and click a pill
on each visible card, including the one beside the last slide. Open the
square card's links and confirm they land on square.tsionark.com in a new
tab. Automation for the carousel's last-frame case exists; the shelf-level
flows still need a browser scenario.

## The phone home

The same three changes, on the phone's own sections:

- "Join the Conversation" is the desktop row, one card to a frame, in
  place of the static chess image with link zones over it.
- "Stay Ahead of Token Moves on Spot" shows the featured mover and the
  mover after it, in place of the Eth Africa promo.
- The prediction banner carries Predict Now only.
