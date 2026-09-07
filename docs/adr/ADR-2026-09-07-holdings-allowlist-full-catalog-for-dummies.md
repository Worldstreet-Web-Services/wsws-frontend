# ADR-2026-09-07: Why two of a user's assets vanished (Plain English Guide / ADR for Dummies)

## Status

Accepted — 2026-09-07, on the maintainer's delegation.

---

## What Is This Document?

The plain-English companion to
[`ADR-2026-09-07-holdings-allowlist-full-catalog.md`](ADR-2026-09-07-holdings-allowlist-full-catalog.md).

---

## The Problem

A user said two of their three assets disappeared from the portfolio. The
money did not move; the table stopped listing them.

The portfolio only lists tokens it recognises, to keep airdrop spam out.
For memecoins, "recognised" means "in the trade service's catalog". Our code
looked at the first page of that catalog only, 100 rows, and only the Base
rows on it, about 41. The catalog has nearly 700 rows. Anyone holding a coin
that was not on that first page saw it vanish, and it could reappear later
when the ordering changed. Solana coins were never looked at.

This was not caused by this morning's "Base only" board change; that only
touched what the board shows, not the portfolio.

## What We Do

Read the whole catalog, every page, including the Solana rows. Log it
loudly when a page fails instead of hiding holdings in silence.

## What This Does Not Fix

Selling. The trade service marks most delisted or unrated tokens as
"cannot sell", and the sell button obeys that. People holding those coins
can now see them but still cannot convert them back to USDC until the
backend allows selling out of delisted tokens. That decision is theirs.
