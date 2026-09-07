# Plan: holdings allowlist reads the whole trade catalog

Decision: `docs/adr/ADR-2026-09-07-holdings-allowlist-full-catalog.md`.
Branch: `fix/holdings-registry-full-catalog`, off `origin/main`.

## Steps

1. Research: live catalog size and paging (692 rows, 7 pages, chain ids 8453
   and 101), `isAllowedHolding` dependency, sell path and `sellEnabled`.
2. Red: `lib/server/buyable-registry.test.ts` (page three token, Solana row,
   failed page logged, page cap).
3. Green: `catalogPage`, `addCatalogRows`, parallel pages after the first,
   `TRADE_CHAIN_TO_NETWORK`, warnings.
4. Release note; preflight; PR against `main`.

## Out of scope

Selling out of `sellEnabled: false` tokens (trade service policy).
