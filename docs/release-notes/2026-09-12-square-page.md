---
date: 2026-09-12
feature: Market Square is a page in the app, drawn as the Square draws its Home
scope: square, navigation, discovery
scenario-impact: updated
---

# Market Square is a page in the app

## What changed

- **A Market Square page at `/square`.** The sidebar entry between Prediction
  and Arkade opens it in the same tab, like every other rail row, instead of
  leaving for the Square's own deployment. It lights up on its route the way
  the other rows do on theirs.
- **The page is the Square's own Home, carried over as the Square draws it.**
  The maintainer asked (2026-09-12) that it be the same UI, not a version of
  it in this app's language. So the page is Home's column in Home's order and
  on Home's own cards: the search row and the gistroom banner, then "Top
  GistRooms", "Make some friends", "Coming Soon", "Popular Houses" and "Post
  For You", each with its two-tone Manrope heading and its "View more" pill.
  The cards are the Square's components brought across with their numbers,
  their glass, their purple ramp, their glyphs and their exports: the
  338-by-120 gist-room invite, the 479-by-147 upcoming-room card in
  container units, the white-to-lavender pal card with its follow badge and
  its pass and wink discs, the 356-by-120 house card. A section with nothing
  to show does not appear.
- **What already works here keeps working.** Posts render on the post card
  the dashboard uses: like, repost, reply and follow stay in the app, and a
  `$TICKER` the app trades still opens the buy sheet. Following from a
  person's badge stays in the app; passing takes the card off the rail.
- **Everything else is a trip to the Square**, in a new tab, on exactly the
  thing the card shows: "Join Gistroom" and "Remind me" open the room, the
  wink and the photo open the person's profile, "Join House" opens the house,
  the post's arrow opens the thread, "Host Room" opens the rooms page with the
  create sheet up, a search opens the Square's Explore with the words typed,
  and each "View more" opens the Square's matching page. "Open the Square"
  sits where Home keeps its Explore settings, for anyone who wants all of it.
- **The home page's band points at the page** where it only opened the
  Square before: "Open the feed" and the idle "Open Square" go to `/square`
  in the app. "Join live" on a live room and "Start a room" still leave for
  the Square, because joining and broadcasting are the Square's.
- **The portfolio is untouched.** The square's sections there stay off
  (`IN_APP_SQUARE_SHOWN` is still false), and the page does not read that
  switch. It follows the rail entry's switch alone: a hidden square has no
  page.

## What is not carried over, and why

- Home's search answers in place from reads this app's relay does not carry
  (room codes, the people filter), so a search here opens the Square's
  Explore with the query. Home's Explore-settings pill acts on the Square's
  session (location, filters), so its seat carries "Open the Square" instead.
- The gist-room card's hover preview listens to the room's audio through the
  Square's LiveKit session; this app has no room session, so the card is the
  file's resting state.
- The people deck's swipe gesture and verdict stamps, the Square's post card
  (which composes its tips, KASH balance and wink slices), the "Suggested
  pals" foot and the ecosystem partners rail are the Square's own and are
  not here. The Square's post card is 1,194 lines over four of its slices; a
  port is a decision of its own.

## The relay

`GET conversations/discover`, the house directory, is now relayed, as a public
read like profiles and the feed, and its payload is judged at the boundary.
Nothing that joins a house, winks, hosts or sets a reminder is relayed; those
stay in the Square, which is what "do more" means.

## Cost

Six reads on first visit (live rooms, people, scheduled rooms, houses, the
feed, the topic vocabulary), each kept for a minute or longer, none on an
interval. The dashboard's own reads are unchanged. The page reports as
`market_square` in analytics. The root layout now loads Manrope (600, 700)
and Roboto (400, 600) for this page's headings and people cards; eight of the
Square's exports sit under `public/square-home/`.

## Tests

- `lib/sections.test.ts`: `square` is a section whose route is `/square`,
  and it stays out of the reorderable rail list.
- `lib/square/links.test.ts`: `house(id)`, `pals()`, `gistRooms()`,
  `houses()`, `feed()`, `hostRoom()` and `search(q)` are the Square's own
  routes, escaped.
- `lib/square/starts-in.test.ts` (new): the "starts in" chip counts the
  largest whole unit and says now for a room whose time has come.
- `lib/api/market-square-proxy-paths.test.ts`: the house directory is a
  public GET; nothing under `conversations/` is written to.
- `lib/api/schemas/market-square.test.ts`: the directory payload is modelled,
  and a house without an id is refused.
- `lib/api/market-square.test.ts`: the live, scheduled and house reads ask
  for what Home asks for and treat an absent list as nothing to show.
- `features/square/components/square-home.test.tsx` (new): the five sections
  in Home's order and words, an empty one omitted, a topic labelled from the
  vocabulary, every "do more" control on its Square deep link in a new tab,
  the banner and the search row, the reader left out of the deck, follow kept
  in the app, a passed person taken off the rail, and nothing rendered while
  the square is hidden.
- `components/layout/sidebar.test.tsx`: the entry links to `/square` in the
  same tab and lights up on it.
- `features/discovery/components/conversation-cards.test.tsx` and
  `conversation-row.test.tsx`: the feed pill and the idle rooms card open
  `/square`; Join and Start stay outbound.
- `__tests__/mixpanel.test.ts`: the page reports as `market_square`.
