#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "refactor(funds): move deposit and withdraw into features/funds

17 screens, the KYC onboarding and the two modals that mount them. The modals
come along because app/dashboard was their only consumer, which makes them the
slice's entry points rather than shell chrome.

lib/pouch splits three ways to three: banks, kyc and session are funds-only and
move into the slice; offramp, onramp and pending stay shared, since four API
routes and the portfolio balance card read them. lib/deposit and use-deposit
stay as well, at 27 and 8 importers.

No boundary violations: everything the slice kept reaching for already lives
below it."

git push
