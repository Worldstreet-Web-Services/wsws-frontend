---
date: 2026-09-17
feature: The Market Square served inside Ark at /square
scope: square
scenario-impact: updated
---

# The Market Square at `/square`

`www.tsionark.com/square` now serves the whole Market Square: the feed, posts,
profiles, messages, houses and live rooms, from the Square's own zone
deployment (`ADR-2026-09-16-square-microfrontend`, amended 2026-09-17 to
Next.js Multi-Zones).

## What a reader sees

- **Square** in the desktop sidebar and the Square seat in the phone tab bar
  open the full Square in the same tab. They used to open Ark's copy of the
  Square's front page, and anything past it sent people to
  `square.tsionark.com`.
- The "Open Square" and "Open the feed" pills on the dashboard's conversation
  cards go to the same place.
- Moving between a trading page and a Square page is a full page load. Moving
  around inside either stays instant.
- `square.tsionark.com` keeps working as before.

## What changed here

- `next.config.ts` rewrites `/square` and `/square/:path*` to
  `SQUARE_ZONE_URL` before this app's own files. With the variable unset there
  is no rewrite.
- `proxy.ts` no longer matches `/square` or anything below it (`/squares` is
  still this app's).
- Ark's copy of the Square's front page (`/square` route, `SquareHome` and the
  27 components and hooks only it used) is removed. A test fails if any route
  here answers under `/square`.
- The rail entry, the tab-bar seat and the conversation-card pills are plain
  anchors, since `next/link` cannot reach another zone.

## Configuration

`SQUARE_ZONE_URL` on the `wsws` Vercel project, for example
`https://square-ark.vercel.app`, with no trailing slash (one is tolerated).

## Verified

- Preflight: format, lint, typecheck, 5,219 tests, production build. Bundle
  budgets green.
- `next start` with `SQUARE_ZONE_URL` set: `/square`, `/square/houses`,
  `/square/messages` and `/square/notifications` answer as the zone does, the
  zone's CSS and JavaScript load under `/square/_next`, and the page renders
  styled at 1440 and 402 wide. `/portfolio` is still this app.
