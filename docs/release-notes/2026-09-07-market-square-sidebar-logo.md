---
scenario-impact: updated
---

# Release Note: the Market Square entry in the sidebar carries the square's logo

## Summary

On the maintainer's instruction, the sidebar's Market Square entry shows the
square's own logo mark instead of a generic four-dot square glyph, so the
rail names the destination the way the destination names itself.

## What changed

- `public/market-square-mark.svg`: the mark, copied byte for byte from the
  Market Square repo's `public/logo-mark.svg` (60×45, brand gradient).
- `components/layout/sidebar.tsx`: `SquareIcon` renders the mark through
  `next/image` at 20×15, its natural 4:3 proportion, unoptimised (SVG).
- `components/layout/sidebar.test.tsx`: the entry carries the mark.

## Verification

Red then green; full preflight; checked on the local dev server.

## Scenario impact

`updated`: the sidebar entry's icon changes; nothing else moves.
