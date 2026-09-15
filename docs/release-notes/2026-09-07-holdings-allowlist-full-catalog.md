---
scenario-impact: updated
---

# Release Note: memecoin holdings beyond the catalog's first page show again

## Summary

"I had three assets, two disappeared." The holdings allowlist admitted a
memecoin only if it appeared on page one of the trade catalog (100 of 692
rows) and only if it was on Base; anything else a wallet held vanished from
the table while the money stayed in the wallet, and Solana memecoins never
showed. The registry now reads every page and keeps the Solana rows, and it
logs a failing page instead of hiding holdings silently.

Decision record: `docs/adr/ADR-2026-09-07-holdings-allowlist-full-catalog.md`
and its plain-English companion.

## What changed

- `lib/server/buyable-registry.ts`: paged catalog read (cap ten pages),
  Solana rows under `solana-mainnet`, warnings on failure.
- `lib/server/buyable-registry.test.ts` (new).

## Not changed, and needs the backend

Selling a token the trade service marks `sellEnabled: false` (493 of 692 on
2026-09-07, every BLOCKED and DISCOVERED row) still fails at the service.
Holders of delisted tokens can see them now but cannot convert them to USDC
until the trade service allows selling out of delisted tokens.

## Verification

Red then green (four cases); full preflight. After deploy: the reporting
user's three assets are listed.

## Scenario impact

`updated`: memecoin holdings reappear in the portfolio; nothing else visible
changes.
