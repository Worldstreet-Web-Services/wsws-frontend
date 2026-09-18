# The whole Market Square inside Ark on the web (plain English)

**Date:** 2026-09-16 · **Status:** approved by the maintainer; being built

## What is the problem?

The Ark mobile app now has the whole Market Square built in: the feed, posts,
profiles, chat, live rooms, houses. On the web, Ark only shows the Square's front
page, and almost every tap sends people to a separate website,
`square.tsionark.com`. The team wants the web to match mobile: the whole Square,
inside Ark.

## Why not just copy what mobile did?

Mobile had to rebuild the Square, because a phone app cannot show a website
inside itself. A website can. And copying would be expensive:

- The Square's website is about 90,000 lines of code, almost four times what
  mobile rebuilt.
- It changes every day. A copy would start going out of date the moment it
  landed, and every change would have to be done twice.
- The riskiest parts move money (KASH, buying a coin from a post). Rebuilding
  those is where mistakes cost real funds.

## What are we going to do?

1. **Serve the real Square at `www.tsionark.com/square`.** A second copy of
   the Square's website runs at `square-ark.vercel.app`, set up to live under
   `/square`. Ark passes every `/square` request to it. Everything under
   `/square` comes from the Square; everything else stays Ark. (Updated
   2026-09-17: this used to rely on a paid Vercel feature; the new way needs
   none.)
2. **One sign-in.** Both apps use the same login, and on the same address the
   browser shares it, so people sign in once.
3. **The Square's team moves its pages under `/square`.** Its links, pictures and
   notifications are updated to the new address.
4. **Ark's Square button opens `/square`** on both desktop and phone. Ark's
   current copy of the Square's front page is retired, because the real one
   takes its place.
5. **Both addresses keep working.** `square.tsionark.com` stays up, and every
   page tells search engines and chat apps that `www.tsionark.com/square` is the
   main address, so a post does not compete with itself.
6. **Ark's menus on Square pages from day one.** The same sidebar and phone tab
   bar people see on trading pages also appear on Square pages. They are built
   once and shared by both apps, so they never look different.

## What does it cost?

- Roughly 1.5 to 3 weeks, mostly on the Square's side.
- Going from a trading page to a Square page is a full page load, not an instant
  switch. Everything inside the Square, and everything inside trading, stays
  instant.
- No extra Vercel feature to pay for: the Square's second copy is one more
  ordinary project.
- People who allowed Square notifications on the old address will be asked again.

## What we decided not to do

- **Copy the whole Square into Ark.** Two to three months, two copies to keep in
  sync, and the most risk around money.
- **Share the code as a package.** Months of restructuring across two
  repositories.
- **Keep linking out.** That is today, and it is not "fully".

## What the maintainer decided

1. Keep both addresses.
2. Show Ark's sidebar and tab bar on Square pages from the start.
3. The Square's session changes the Square; this session changes Ark and builds
   the shared menus.
4. Updated 2026-09-17: the maintainer set up the Square's second copy at
   `square-ark.vercel.app`, and Ark sends `/square` to it.
