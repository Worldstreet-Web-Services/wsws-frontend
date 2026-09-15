# ADR-2026-09-07: The holdings allowlist reads the whole trade catalog

## Status

Accepted — 2026-09-07, on the maintainer's delegation of the day's
incidents ("let another agent be handling this").

## Context

A user reported "I had three assets, two disappeared" with a portfolio
screenshot. The team's working theory was that the morning's Base-only
memecoin discovery (#395) had hidden them. It had not: #395 changed the
board's discovery filter and the navigation, not the holdings allowlist.

The holdings table shows a token only if `isAllowedHolding()` admits it, and
for memecoins that means the trade catalog names it (`lib/server/buyable-registry.ts`,
`addTradeCatalog`). That function read **one page of 100** of a catalog that
held **692 rows over seven pages** on 2026-09-07, and kept only the Base rows
of that page (41 of them), dropping the 59 Solana rows. So:

- a memecoin held on Base that is not among the ~41 Base rows of page one
  fails the allowlist and vanishes from the table while the money stays in
  the wallet, and comes back whenever the catalog's ordering moves it onto
  page one, which is exactly the "disappeared" experience;
- a memecoin held on Solana never appears at all.

Both registry fetches also swallowed failures silently, so an outage of the
catalog hid every memecoin holding for everyone with nothing in the logs.

Two neighbouring facts matter for the sell path the team asked about ("as
we are removing stuff we need to find a way to convert people's money back
to USDC"): a held memecoin sells through the meme trade sheet, which honours
the catalog's `sellEnabled`; and on 2026-09-07 the catalog marked 493 of 692
tokens `sellEnabled: false` (every `BLOCKED` and `DISCOVERED` row). A holding
of such a token is visible after this change but cannot be sold until the
trade service allows selling out of delisted tokens. That is a backend policy
decision, not a frontend one.

## Decision

1. `addTradeCatalog` reads every page of the catalog: page one, then the rest
   in parallel up to a cap of ten pages (generous against today's seven,
   still bounded), each page cached ten minutes as before.
2. Rows on the trade service's Solana chain id (101) join the registry under
   `solana-mainnet`, lowercased like every other registry key because the
   allowlist lookup lowercases before it asks.
3. A page that fails is logged with its status and the rest is kept; a
   failed Dextopus destinations call is logged too. Nothing is thrown, since
   a registry failure must never blank the portfolio, but nothing is silent.
4. The allowlist stays strict: nothing outside the registries is admitted,
   so spam is still excluded.

### Alternatives considered

- **Remember per wallet what was once held.** Correct in principle and the
  only way to show a holding the catalog forgets entirely, but it needs a
  store and a definition of "forgotten"; the catalog persists every traded
  token today, so the whole catalog suffices.
- **Ask the trade service per held token.** Requires knowing the held set
  first, which the allowlist is what produces.
- **Drop the allowlist for memecoins.** Reintroduces spam and fake-price
  tokens for every user.

## Consequences

- Memecoin holdings on Base beyond page one, and on Solana, show again with
  the catalog's logo and price.
- The Base allowlist grows from ~41 to ~366 contracts and Solana gains ~326;
  the Portfolio API filter and the on-chain multicall reader both take the
  larger list without a code change (one `aggregate3` per network).
- Six extra catalog requests per ten-minute cache window per instance.
- Selling a token the catalog has marked `sellEnabled: false` still fails at
  the trade service. Backend action needed: keep `sellEnabled` true for
  delisted tokens with holders, or provide a sell-only route.
- Scenario impact: `updated`; holdings reappear, nothing else visible moves.

## Verification plan

1. Red: a page-three Base token and a Solana row are missing from the
   registry; a failed page is silent. Four failing tests.
2. Green: pagination, Solana mapping, logging.
3. `./scripts/preflight.sh` in full. After deploy: the reporting user's
   portfolio lists all three assets.
