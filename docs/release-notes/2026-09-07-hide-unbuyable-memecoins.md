---
scenario-impact: updated
---

# Release Note: the memecoin board shows only coins that can be bought

## Summary

On the maintainers' instruction ("all these meme coins that can't be
bought, hide them"). Discovery (board, trending, search, dashboard brief)
now drops any row the trade service marks `buyEnabled: false`, any row whose
`status` is present and not `ACTIVE`, and any row with less than $10,000 of
liquidity, where a buy fails at the quote or moves the price by the whole
order. Rows with no liquidity figure (trending and search omit it) are kept.
Holdings are unaffected: the allowlist reads the catalog directly and the
sell sheet fetches a held token by address.

On the live catalog at the time of the change every rated Base row was
already ACTIVE and buyable; the liquidity floor removes two (AAG at $20,
KRAV at $7.7k). The rule is there so the board cannot drift back.

## What changed

- `lib/meme/catalog.ts`: `isBuyableHere`, `MIN_DISCOVERY_LIQUIDITY_USD`,
  applied at the discovery boundary.
- `lib/meme/types.ts`: optional `status` on `MemeToken`.
- Tests in `lib/meme/catalog.test.ts`.

## Verification

Red then green; full preflight; live catalog counts above.

## Scenario impact

`updated`: two thin coins leave the Base board today; unbuyable rows can no
longer appear.
