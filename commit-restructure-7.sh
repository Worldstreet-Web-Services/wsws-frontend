#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

git commit -S -m "refactor(arch): move RWA into features/, the first slice

Phase 3.1 in docs/ARCHITECTURE.md. 18 files: components, hooks, lib and the
index. app/dashboard and use-global-search now reach the slice only through
features/rwa/index.ts. No deep imports from outside, no upward imports from
lib/ or components/.

Two modules were filed under RWA by accident and had to come out first, or the
slice would have inherited ownership of code three other features depend on:

- lib/rwa/funding.ts is the cross-chain funding engine, used by use-sell,
  use-solana-funding and use-solana-proceeds. Now lib/trade/funding.ts.
- USDC_BY_CHAIN is a chain constant, not an RWA concept. Now lib/trade/usdc.ts
  with its own UsdcChain type, re-exported from the slice so RWA call sites are
  unchanged.

Moves only. Import rewrites are mechanical and tsc verified every one."

git push origin refactor/architecture
