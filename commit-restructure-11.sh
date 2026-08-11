#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "refactor(remit): move the cross-border corridor into features/remit

The 9 remit components, use-offramp, cross-border and the payment-service
offramp/pending helpers move into features/remit. lib/pouch/* and
use-pouch-offramp stay in the shared layers: they read like remit, but they
are the PouchPay NGN bank rail, with six consumers across funds, portfolio
and two API routes.

Relocating the banner surfaced a portfolio -> remit import, which the 3.2
boundary rules rejected. Fixed by composing at the route instead: the
dashboard passes CrossBorderBanner to PortfolioView as a slot, so no feature
imports another. docs/ARCHITECTURE.md now states that rule the way the lint
enforces it, replacing the looser 'go through the index' wording."

git push
