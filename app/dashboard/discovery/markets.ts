"use client";

import { useEffect, useMemo, useState } from "react";
import { usePredictions } from "@/features/prediction/hooks/use-predictions";
import { useMarkets } from "@/features/prediction/hooks/use-prediction-markets";
import { useGroups } from "@/features/prediction/hooks/use-prediction-detail";
import type { GroupOutcome, Market, MarketGroup } from "@/features/prediction/lib/types";
import type { PredictionSpot } from "@/features/discovery/types";
import type { Prediction } from "@/lib/types";

/*
 * The prediction adapter for the discovery row.
 *
 * Discovery may not import prediction, so the route composes the two: this
 * module calls the prediction feature's own hook and maps what it returns into
 * the display-ready shape the card takes as a prop. app/ importing features/ is
 * downward, so this is where the two slices are allowed to meet.
 *
 * This is the formatting boundary. Everything the card renders is a finished
 * string by the time it leaves here, including the countdown.
 */

/*
 * Two sources, in order of preference, and never mixed.
 *
 * `useMarkets` is our own on-chain CPMM markets and stays the first choice.
 * Three of the five fields a `PredictionSpot` declares only exist on a `Market`:
 * an id, a close time and market artwork. The close time is the one the row is
 * built around, because "Your Next Prediction Starts Here" is a promise about
 * imminence and the chip is a live clock.
 *
 * The gateway can serve no open CPMM market at all, though, and when it does the
 * card has nothing to rotate through and sits on its editorial sample forever.
 * So `/api/predictions`, the Polymarket feed, is the fallback. A `Prediction`
 * carries a question and artwork, which is what the card draws, but no deadline,
 * so every spot built from one has a null countdown and the chip reads "No
 * deadline". Five live questions under a repeated "No deadline" chip is a duller
 * card than five countdowns, and a better one than a single fixed sample that
 * never changes: the card is there to show what is on the market right now.
 *
 * The fallback is all or nothing. It does not top up a short on-chain row to
 * five, because a rotation where two cards count down and three say "No
 * deadline" reads as a broken clock, where a row that never counts down reads as
 * a deliberate state. Either every card on the row has a deadline or none does.
 */

/*
 * Where the collage's second photo comes from.
 *
 * The card draws a pair of tilted photos, and a `Market` carries exactly one
 * `imageUrl`. There is no second picture anywhere on the market read model: no
 * gallery, no event id, nothing the row already holds. The one place the gateway
 * keeps more than one picture of the same event is `/groups`.
 *
 * A group is a multi-outcome event: "Ligue 1 title", with a market per club.
 * Each member is a real binary market and comes back from `listMarkets` on its
 * own, which is why members already appear on this row. The group carries the
 * event's banner and each outcome carries its own portrait, so a member market
 * has a genuine second picture of the same event to sit behind it.
 *
 * So the row reads the group list and joins it to the markets on member market
 * id. That costs one request, once, not one per card: `/groups` is a list, it
 * does not poll, and asking for the Open groups puts it on the same cache entry
 * the prediction browse page opens, so whichever surface mounts first pays for
 * both. It cannot be gated on "is any featured market grouped", because that
 * answer is in the response. It is gated on whether there is anything to join
 * to: the markets are picked before the list is asked for, so a row that is
 * still loading, a row with no on-chain market, and a row that has fallen back
 * to the Polymarket feed all cost nothing.
 *
 * A standalone binary market gains nothing from this, and there is nothing
 * upstream to give it. It keeps its one photo and the card lays out the single
 * front tile it already draws for that case. The second tile is never filled by
 * repeating the first, and never from a market outside this market's own event:
 * a pair of photos reads as two views of one thing, so an unrelated market's
 * artwork in the collage would misreport what the card is showing.
 *
 * The Polymarket fallback stays on one photo. Gamma does carry two, a market
 * image and its parent event's banner, but `lib/server/polymarket.ts` picks one
 * of the four candidate URLs and drops the rest before a `Prediction` is built,
 * so a second never reaches this file. Recovering it means changing that mapping
 * and the `Prediction` type, not this adapter.
 */

/** How many markets the card cycles through unless the caller says otherwise. */
const DEFAULT_LIMIT = 5;

/** The countdown carries seconds, so it is re-formatted every second. */
const TICK_MS = 1_000;

const NO_SPOTS: readonly PredictionSpot[] = Object.freeze([]);
const NO_MARKETS: readonly Market[] = Object.freeze([]);
const NO_FEED: readonly Prediction[] = Object.freeze([]);
const NO_GROUPS: readonly MarketGroup[] = Object.freeze([]);
const NO_IMAGES: readonly string[] = Object.freeze([]);

/*
 * The groups filter, matching the one the browse page mounts with.
 *
 * `useGroups` keys on the filter, so a different one here would open a second
 * cache entry and pay for the same list twice the moment both surfaces are up.
 * Open is also the only status this row features, so the narrower read is the
 * correct one on its own terms.
 */
const OPEN_GROUPS = Object.freeze({ status: "Open" });

/*
 * Where a feed market leads: the browse page, not a detail route.
 *
 * `/prediction/[id]` renders `MarketDetail`, which reads `/markets/{id}` on our
 * own prediction gateway. That gateway knows CPMM market ids and nothing about a
 * Polymarket condition id, so the deep link would land on the detail page's
 * error state. `/prediction/event/[id]` is no better: it reads `/groups/{id}` on
 * the same gateway, and a `Prediction` carries a market's condition id rather
 * than an event id or slug in any case.
 *
 * `/prediction` opens on the Polymarket tab, which is the list these markets
 * come from, so the tap lands on the market the card promised. It is also where
 * the card's own editorial fallback already points.
 */
const PREDICTION_BROWSE = "/prediction";

/**
 * The markets the discovery row features, soonest to close first.
 *
 * Returns an empty array while the markets load, when both reads fail, and when
 * no market qualifies. That is not an error state: the card falls back to the
 * editorial pair the design ships with.
 */
export function usePredictionSpots(limit: number = DEFAULT_LIMIT): readonly PredictionSpot[] {
  // No status argument, so this shares the one unfiltered markets cache entry
  // with the rest of the app rather than opening a second one. Open markets are
  // picked out below, where the close time has to be checked anyway.
  const { data, isPending } = useMarkets();

  // The clock the countdown strings are cut against. Held in state and advanced
  // by the effect below rather than read during render, so a render is pure and
  // two renders in the same tick agree. Seeding it with the real clock cannot
  // desync a hydration: the query has no data on the server, so the strings this
  // seeds are never part of the server-rendered HTML.
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Which markets the row features, chosen before any artwork is asked for. The
  // choice does not depend on the group list, only the photos do, so this is
  // what lets the list be gated on there being a market to put a photo behind.
  const markets = data ?? NO_MARKETS;
  const featured = useMemo(() => selectFeatured(markets, nowMs, limit), [markets, nowMs, limit]);

  // The multi-outcome events, for the second half of the collage. One list read
  // on the browse page's cache entry, no poll, and the row still renders without
  // it: a market with no event behind it simply keeps its single photo.
  //
  // Nothing to enrich, nothing to fetch. An empty row draws the card's
  // editorial fallback and the feed path below has no market ids the group list
  // could ever match, so in both cases the request would be paid for and thrown
  // away.
  const { data: groups } = useGroups(OPEN_GROUPS, { enabled: featured.length > 0 });
  const eventArt = useMemo(() => buildEventArt(groups ?? NO_GROUPS), [groups]);

  const onChain = useMemo(
    () => (featured.length > 0 ? featured.map((m) => toSpot(m, eventArt, nowMs)) : NO_SPOTS),
    [featured, eventArt, nowMs]
  );

  // Pending is not empty. Asking for the feed on the first render would fetch
  // both sources on every dashboard load, which is the request this gate exists
  // to avoid: the fallback is only worth a round trip once the on-chain read has
  // actually settled on nothing.
  const feedNeeded = limit > 0 && !isPending && onChain.length === 0;
  const { data: feed } = usePredictions({ enabled: feedNeeded });
  const offChain = useMemo(
    () => (feedNeeded ? buildFeedSpots(feed ?? NO_FEED, limit) : NO_SPOTS),
    [feedNeeded, feed, limit]
  );

  const spots = onChain.length > 0 ? onChain : offChain;
  const stable = useStableSpots(spots);

  // A live countdown that is formatted once reads as a broken clock, so it is
  // recut every second. The card's own rotation is driven by `useRotatingIndex`,
  // which takes a count rather than the array, so a new array each second does
  // not restart it: the length only changes when a market actually closes.
  //
  // No deadline on screen, no timer. The feed fallback has no deadlines at all,
  // a row of undated on-chain markets has none either, and a closed market
  // leaves the set entirely, so the last one closing also stops the tick.
  const ticking = stable.some((spot) => spot.countdown !== null);

  useEffect(() => {
    if (!ticking) return;
    const recut = () => setNowMs(Date.now());
    // The clock only moves while something counts down, so by the time a
    // deadline reappears it can be minutes or hours behind: the row spent that
    // whole time on the feed fallback, where there was nothing to tick for. The
    // catch-up is what stops the first on-chain countdown reading minutes too
    // long. It has to be scheduled rather than called here: reading the clock
    // during render is impure and setting state in an effect body cascades, so
    // the soonest honest moment to re-read it is the next turn of the loop.
    const catchUp = setTimeout(recut, 0);
    const timer = setInterval(recut, TICK_MS);
    return () => {
      clearTimeout(catchUp);
      clearInterval(timer);
    };
  }, [ticking]);

  return stable;
}

/*
 * The Polymarket feed, read only when the on-chain markets came back empty.
 *
 * The prediction feature owns this query; this row passes `enabled` so it costs
 * nothing in the common case. The browse page always wants the feed, the
 * dashboard wants it only when the gateway is serving no on-chain markets. Both
 * read the one `["predictions"]` cache entry, so whichever mounts first owns the
 * request and the other reads the result.
 */

/*
 * Which markets, and in what order.
 *
 * "Your Next Prediction Starts Here" is a promise about imminence, so the row
 * leads with the market closing soonest rather than the one trading heaviest.
 * Volume only breaks a tie between two markets closing in the same second, and
 * the id breaks that, so the order is total and two renders never disagree.
 *
 * A market whose close time has already passed is dropped rather than shown with
 * an empty clock. Its status often still reads Open, because the backend flips
 * that on its own schedule, and a card inviting a trade on a market that has
 * stopped taking them is worse than one card fewer.
 *
 * A market with no close time at all can still be featured, but never ahead of
 * one with a deadline: it cannot be the "next" anything. It is there to fill the
 * five, ordered by volume, which is the only signal of interest such a market
 * carries. Its countdown is null and the card drops the chip.
 */
function selectFeatured(
  markets: readonly Market[],
  nowMs: number,
  limit: number
): readonly Market[] {
  if (limit <= 0) return NO_MARKETS;
  const nowSeconds = nowMs / 1000;

  // A market with no question has no headline, and the headline is the card.
  const open = markets.filter((m) => m.status === "Open" && (m.question ?? "").trim() !== "");
  const closing = open.filter((m) => m.closeTime > nowSeconds).sort(bySoonestClose);
  const undated = open.filter((m) => !(m.closeTime > 0)).sort(byLargestVolume);

  const featured = [...closing, ...undated].slice(0, limit);
  // One identity for "nothing to feature", so the group gate and the source
  // choice above both compare on a single empty value.
  return featured.length > 0 ? featured : NO_MARKETS;
}

function bySoonestClose(a: Market, b: Market): number {
  if (a.closeTime !== b.closeTime) return a.closeTime - b.closeTime;
  return byLargestVolume(a, b);
}

function byLargestVolume(a: Market, b: Market): number {
  if (a.volumeUsdc !== b.volumeUsdc) return a.volumeUsdc > b.volumeUsdc ? -1 : 1;
  return a.marketId === b.marketId ? 0 : a.marketId < b.marketId ? -1 : 1;
}

function toSpot(
  market: Market,
  eventArt: ReadonlyMap<string, string>,
  nowMs: number
): PredictionSpot {
  return {
    id: String(market.marketId),
    // The market's own words. Not translated, and not shortened: the card lays
    // its headline out to wrap.
    question: (market.question ?? "").trim(),
    countdown: market.closeTime > 0 ? formatCountdown(market.closeTime, nowMs) : null,
    images: collageFor(market, eventArt),
    href: `/prediction/${market.marketId}`,
  };
}

/*
 * The photos this market hands the collage, in the order the card stacks them.
 *
 * Index 1 is the front tile and index 0 the one behind it, and a lone photo
 * takes the front tile. So the market's own artwork stays at index 1 either way:
 * finding an event photo puts a picture behind this market's, it does not move
 * it. The event photo alone still goes to the front, because a single tile is a
 * single tile whichever picture fills it.
 *
 * Two identical URLs are never returned. `collageTiles` would draw the same
 * photo twice, offset and tilted, which reads as a rendering fault rather than
 * as a design.
 */
function collageFor(market: Market, eventArt: ReadonlyMap<string, string>): readonly string[] {
  const own = market.imageUrl;
  const event = eventArt.get(market.marketId.toString()) ?? null;
  if (own && event && event !== own) return [event, own];
  if (own) return [own];
  if (event) return [event];
  return NO_IMAGES;
}

/*
 * A second photo for each market that is an outcome of a multi-outcome event,
 * keyed by that market's own id.
 *
 * Built once per group list rather than searched per card: the row features five
 * markets out of a list that holds every open one, so a scan per card would walk
 * every group five times over.
 *
 * A group with no outcomes contributes nothing, which is the shape an
 * interrupted event create leaves behind, and a group whose only picture is the
 * outcome's own picture contributes nothing either.
 */
function buildEventArt(groups: readonly MarketGroup[]): ReadonlyMap<string, string> {
  const art = new Map<string, string>();
  for (const group of groups) {
    for (const outcome of group.outcomes) {
      const photo = eventPhotoFor(group, outcome);
      if (photo) art.set(outcome.marketId.toString(), photo);
    }
  }
  return art;
}

/*
 * The event's picture, as seen from one of its outcomes.
 *
 * The group's own banner comes first: it is a picture of the whole event, so it
 * sits behind any outcome of it without claiming to be that outcome. An event
 * created without a banner falls back to a sibling outcome's portrait, which is
 * still a picture of this event, taken from inside it. Both are the same event
 * the card's headline is asking about, which is the whole test the second tile
 * has to pass.
 */
function eventPhotoFor(group: MarketGroup, outcome: GroupOutcome): string | null {
  if (group.imageUrl && group.imageUrl !== outcome.imageUrl) return group.imageUrl;
  const sibling = group.outcomes.find(
    (o) => o.marketId !== outcome.marketId && o.imageUrl && o.imageUrl !== outcome.imageUrl
  );
  return sibling?.imageUrl ?? null;
}

/*
 * The feed's markets, in the order it hands them over.
 *
 * Nothing here is re-sorted. `/api/predictions` asks Gamma for events ordered by
 * 24 hour volume and preserves that order, so the head of the feed is already the
 * biggest live markets and taking the first five is taking the top five.
 *
 * Re-deriving that order on this side is not possible without making it worse.
 * The only volume a `Prediction` carries is `vol`, and `vol` is a display string
 * the server already formatted: "$1.2M vol", or "" for a market with none. Money
 * does not survive that round trip. Every market between $1.15M and $1.25M reads
 * back as the same 1.2, an empty string is indistinguishable from a parse that
 * failed, and a suffix the formatter can emit but a parser forgot would quietly
 * rank a billion dollar market below a thousand dollar one. So no number is
 * parsed out of a formatted string in this file, and `vol` is never read at all.
 */
function buildFeedSpots(feed: readonly Prediction[], limit: number): readonly PredictionSpot[] {
  if (limit <= 0) return NO_SPOTS;

  const spots: PredictionSpot[] = [];
  for (const prediction of feed) {
    if (spots.length >= limit) break;
    // Same rule as the on-chain path: no question, no headline, no card.
    const question = (prediction.q ?? "").trim();
    if (question === "") continue;
    spots.push({
      // The condition id is the only identifier the feed carries, and it is
      // optional. The question stands in when it is missing: the server drops a
      // market whose question it has already used, so a question is unique
      // within a page of the feed, and the id has only to be a stable key.
      id: prediction.conditionId?.trim() || question,
      question,
      // No close time anywhere on a `Prediction`. The card keeps the chip and
      // labels it "No deadline".
      countdown: null,
      // One photo. The feed's second picture is discarded server-side, before a
      // `Prediction` is built; see the note at the top of this file.
      images: prediction.image ? [prediction.image] : NO_IMAGES,
      href: PREDICTION_BROWSE,
    });
  }
  return spots.length > 0 ? spots : NO_SPOTS;
}

/*
 * The countdown, as the design draws it: days, hours, minutes and seconds, each
 * zero-padded, e.g. "01:46:55:22". Null once the deadline passes, so a card is
 * never left holding a negative clock.
 *
 * `timeUntil` in the prediction feature is not reused here, deliberately. It
 * formats for the trading surfaces ("2d 4h", "35m 12s") and is the right shape
 * there; this chip is a fixed-width digit string the designer sized to a sample.
 * The two are different presentation contracts over the same value.
 *
 * A market more than 99 days out prints three digits rather than losing a day.
 */
function formatCountdown(closeSeconds: number, nowMs: number): string | null {
  const remaining = Math.floor(closeSeconds - nowMs / 1000);
  if (remaining <= 0) return null;
  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor((remaining % 86_400) / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const seconds = remaining % 60;
  return [days, hours, minutes, seconds].map(pad).join(":");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/*
 * The same array back whenever nothing on it changed.
 *
 * The clock ticks every second and the map runs again each time, so without this
 * every consumer downstream sees a new array once a second even when no digit
 * moved: a market with no deadline, a row that is briefly empty, a parent that
 * re-rendered for its own reasons. The feed fallback needs it for a different
 * reason: `/api/predictions` is polled on its own schedule and hands back a new
 * array of equal objects each time. Holding the previous value keeps the whole
 * array and every spot on it referentially stable until a rendered string
 * actually differs, whichever source produced it.
 *
 * The held array is state adjusted during render rather than a ref, which is the
 * pattern React documents for a value derived from something that changed. The
 * update only fires when a string actually differs, so it settles in one extra
 * pass and never loops.
 */
function useStableSpots(spots: readonly PredictionSpot[]): readonly PredictionSpot[] {
  const [held, setHeld] = useState(spots);
  const unchanged = sameSpots(held, spots);
  if (!unchanged) setHeld(spots);
  return unchanged ? held : spots;
}

function sameSpots(a: readonly PredictionSpot[], b: readonly PredictionSpot[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((spot, i) => sameSpot(spot, b[i]));
}

function sameSpot(a: PredictionSpot, b: PredictionSpot): boolean {
  return (
    a.id === b.id &&
    a.question === b.question &&
    a.countdown === b.countdown &&
    a.href === b.href &&
    a.images.length === b.images.length &&
    a.images.every((image, i) => image === b.images[i])
  );
}
