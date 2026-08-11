#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "refactor(prediction): move the prediction slice into features/prediction

The largest slice so far: 29 components, 21 hooks, 16 lib files.

The first consumer sweep looked alarming, then turned out to be prediction code
shelved in other folders — the two views under components/dashboard/views, and
use-bet, use-settle, use-create-event and use-lp-auto-return sitting in the flat
hooks folder. Drawing the boundary correctly left exactly one real leak.

Three files stay behind, all for the server: lib/prediction-image, read by
lib/server/polymarket, and lib/polymarket/config and restricted, read by API
routes. Route handlers must not import the slice barrel, which would drag client
components into the server bundle.

app/prediction/* now imports through features/prediction. lib/prediction.ts is
renamed lib/positions.ts, since it models bet slips rather than the domain."

git push
