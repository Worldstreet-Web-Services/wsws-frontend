#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "refactor(trade): move spot, perps, buy, sell and meme into features/trade

20 components and 10 hooks. All of lib/ stays where it is: lib/sell and
lib/meme/api are read by prediction and portfolio, and lib/buy is anchored by
lib/buy-quote, which lib/sell reads in turn. use-trade-prefill and
use-evm-swap-execute stay for the same reason — rwa and prediction call them.

Two couplings needed fixing rather than exempting:

PerpConfirmModal held no perp knowledge at all, only a title, rows and two
callbacks, and prediction was already importing it. It moves to
components/ui/confirm-dialog as ConfirmDialog, which is what it always was.

The meme sell sheet moves up to app/dashboard. PortfolioView now raises
onOpenMemeSell, matching the onOpen* convention it already used for buy, sell,
detail and rwa, so portfolio no longer reaches into trade."

git push
