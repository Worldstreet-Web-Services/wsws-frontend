import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { MemeSpot, PredictionSpot, SpaceSpot, TokenSpot } from "@/features/discovery/types";
import { ConversationRow } from "./conversation-row";
import { Next100xRow } from "./next-100x-row";
import { PredictionStartsRow } from "./prediction-starts-row";
import { TokenMovesRow } from "./token-moves-row";

// Same stubs as `discovery.test.tsx`, for the same reasons: the translator
// echoes its key so the assertions are about the live content the cards are
// handed rather than about wording the design may still change, and `rich`
// renders the chunks without the markup the way next-intl does when no tag
// handler matches. A live item's own words, a token's symbol or a market's
// question, never pass through the translator, so they arrive intact.
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

/** The cadence every one of these cards was asked for. */
const TEN_SECONDS = 10_000;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/**
 * The slides a reader is actually being shown.
 *
 * By role, because the carousel loops by flanking its real slides with copies
 * of themselves, marked `inert` and `aria-hidden`. Those copies carry the same
 * copy as the slide they clone, so reading the container's text straight would
 * find a card two or three times over and could never tell a card that changed
 * from a card that did not. Only the slides in the accessible tree are content
 * anyone is being offered, and a role query is what leaves the clones out.
 */
function slidesOnShow(): HTMLElement[] {
  return screen.getAllByRole("group");
}

/** Everything on those slides, as one string to look for a line in. */
function textOnShow(): string {
  return slidesOnShow()
    .map((slide) => slide.textContent ?? "")
    .join(" · ");
}

/** The one slide on show that is displaying `line`, so a query can be scoped to it. */
function slideShowing(line: string): HTMLElement {
  const card = slidesOnShow().find((slide) => slide.textContent?.includes(line));
  if (!card) throw new Error(`No slide on show is displaying "${line}"`);
  return card;
}

/**
 * Rest the pointer on the card that is showing `line`.
 *
 * The target is the element carrying the line itself, so the pointer lands
 * inside the card that is rotating rather than on the shelf around it. Enter
 * events only reach the elements between the document root and the element the
 * pointer is over, so a target further out would leave the card's own handler
 * unfired and the test would pass on a card that never pauses.
 *
 * A real pointer arriving over a card sends pointerover and then mouseover, and
 * React derives its enter events from those two. Both go out here because the
 * cards do not agree on which pair they listen to, and which one a card picked
 * is not something this test should have an opinion about.
 */
function restPointerOn(line: string) {
  const card = slideShowing(line);

  const [target] = within(card).getAllByText(line);
  fireEvent.pointerOver(target);
  fireEvent.mouseOver(target);
}

interface RotationCase {
  /** The card, named the way the design names it. */
  name: string;
  /** The card with live items to feature. */
  live: React.ReactElement;
  /** The same card with nothing live to feature. */
  empty: React.ReactElement;
  /**
   * One line per live item, unique to that item, in the order a reader should
   * meet them. Each is the whole text of the element that renders it, so it can
   * be looked up as well as looked for.
   */
  featured: readonly [string, string, string];
  /**
   * Stops in one full turn of the loop, which is not always the number of live
   * items. The memecoin card keeps the design's Shiba in the cycle behind the
   * coins it is handed, so its loop is one stop longer than its feed. Stated
   * per card rather than derived, because the whole point of the wrap test is
   * to catch a card whose loop is not the length it should be.
   */
  stops: number;
  /** A line of the card's own editorial copy, which is what shows with no live items. */
  editorial: string;
}

const tokens: readonly TokenSpot[] = [
  {
    symbol: "NOVA",
    name: "Nova",
    price: "$41,900.00",
    change: "+8.10%",
    up: true,
    movePercent: "8.10%",
    logo: null,
    href: "/spot?asset=nova",
  },
  {
    symbol: "LUMA",
    name: "Luma",
    price: "$3.44",
    change: "-2.40%",
    up: false,
    movePercent: "2.40%",
    logo: null,
    href: "/spot?asset=luma",
  },
  {
    symbol: "ZEPH",
    name: "Zeph",
    price: "$0.91",
    change: "+31.00%",
    up: true,
    movePercent: "31.00%",
    logo: null,
    href: "/spot?asset=zeph",
  },
];

const markets: readonly PredictionSpot[] = [
  {
    id: "m1",
    question: "Will Nova ship before June?",
    countdown: "01:02:03:04",
    images: ["/market/prediction-a.png", "/market/prediction-b.png"],
    href: "/prediction/m1",
  },
  {
    id: "m2",
    question: "Will Luma clear the vote?",
    countdown: null,
    images: [],
    href: "/prediction/m2",
  },
  {
    id: "m3",
    question: "Will Zeph hold the lead?",
    countdown: "00:00:30:00",
    images: ["/market/prediction-c.png"],
    href: "/prediction/m3",
  },
];

const spaces: readonly SpaceSpot[] = [
  {
    id: "r1",
    room: "Nova Playroom",
    headline: "Six seats open on the board",
    avatars: [],
    href: "/casino/chess/watch",
    actionHref: "/casino/chess",
  },
  {
    id: "r2",
    room: "Luma Lounge",
    headline: "The rematch is running now",
    avatars: [],
    href: "/casino/chess/watch",
    actionHref: "/casino/chess",
  },
  {
    id: "r3",
    room: "Zeph Table",
    headline: "Blitz night, ten minute clocks",
    avatars: [],
    href: "/casino/chess/watch",
    actionHref: "/casino/chess",
  },
];

// The move, not the ticker, is the line each coin is identified by here. The
// medallion that carries the ticker is decorative and hidden from assistive
// technology, and the coin's name reaches the heading through the translator,
// which the stub above collapses to its key. The move is the one part of a live
// coin that lands in the accessible tree as the coin's own words.
const memecoins: readonly MemeSpot[] = [
  { symbol: "WAGZ", name: "Wagz", change: "+412%", up: true, image: null, href: "/meme/wagz" },
  { symbol: "MOOG", name: "Moog", change: "-63%", up: false, image: null, href: "/meme/moog" },
  { symbol: "FROG", name: "Frog", change: "+1,050%", up: true, image: null, href: "/meme/frog" },
];

const CARDS: readonly RotationCase[] = [
  {
    name: "Stay Ahead of Token Moves",
    live: <TokenMovesRow tokens={tokens} />,
    empty: <TokenMovesRow tokens={[]} />,
    featured: ["NOVA", "LUMA", "ZEPH"],
    stops: 3,
    // The design's own call, on the coin the card has always been drawn with.
    editorial: "BTC",
  },
  {
    name: "Your Next Prediction Starts Here",
    live: <PredictionStartsRow markets={markets} />,
    empty: <PredictionStartsRow markets={[]} />,
    featured: [
      "Will Nova ship before June?",
      "Will Luma clear the vote?",
      "Will Zeph hold the lead?",
    ],
    stops: 3,
    editorial: "predictionOneTitle",
  },
  {
    name: "Join the Conversation",
    live: <ConversationRow spaces={spaces} />,
    empty: <ConversationRow spaces={[]} />,
    featured: ["Nova Playroom", "Luma Lounge", "Zeph Table"],
    stops: 3,
    editorial: "conversationRoom",
  },
  {
    name: "Find the next 100X",
    live: <Next100xRow memecoins={memecoins} />,
    empty: <Next100xRow memecoins={[]} />,
    featured: ["+412%", "-63%", "+1,050%"],
    // Three coins and the Shiba behind them. The dog is a stop on this card's
    // loop, not only the card it falls back to.
    stops: 4,
    editorial: "shibaTitle",
  },
];

describe.each(CARDS)("$name", ({ live, empty, featured, stops, editorial }) => {
  const [first, second, last] = featured;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on the first item it was given", () => {
    render(live);

    expect(textOnShow()).toContain(first);
    expect(textOnShow()).not.toContain(second);
  });

  it("swaps the first item for the second after ten seconds", () => {
    render(live);
    advance(TEN_SECONDS);

    expect(textOnShow()).toContain(second);
    expect(textOnShow()).not.toContain(first);
  });

  // The last live item is reached in as many ticks as there are items before
  // it, and the loop closes over the rest of its stops, whatever the card puts
  // in them. Written against `stops` rather than against the number of items so
  // that a card whose loop is longer than its feed is still held to wrapping,
  // and a card that stopped wrapping still fails: it would be sitting on its
  // last stop when the loop was due back at the first.
  it("comes back round to the first item after the last one", () => {
    render(live);

    advance(TEN_SECONDS * (featured.length - 1));
    expect(textOnShow()).toContain(last);

    advance(TEN_SECONDS * (stops - featured.length + 1));
    expect(textOnShow()).toContain(first);
    expect(textOnShow()).not.toContain(last);
  });

  // The preview harness and `discovery.test.tsx` both render these rows with
  // nothing live, and the dashboard does the same for as long as the route has
  // fetched nothing. The card has to be the still, editorial card it has always
  // been in that case, not an empty box and not a crash.
  it("keeps its editorial card when it is given nothing live", () => {
    render(empty);
    expect(textOnShow()).toContain(editorial);

    advance(TEN_SECONDS * 3);
    expect(textOnShow()).toContain(editorial);
  });

  // WCAG 2.2.2 (Pause, Stop, Hide). This content starts on its own, updates
  // itself and runs well past five seconds, so a reader must be able to stop it
  // and finish reading. Losing this is silent: the card still rotates, still
  // looks right, and only a reader who was mid-sentence would ever notice.
  it("holds the item still while the pointer is resting on it", () => {
    render(live);
    restPointerOn(first);

    advance(TEN_SECONDS * 3);

    expect(textOnShow()).toContain(first);
    expect(textOnShow()).not.toContain(second);
  });
});

/**
 * The pictures drawn inside one slide.
 *
 * A decorative image carries `alt=""`, which ARIA maps to the presentation
 * role, so this is the accessible tree's own answer to "is a picture being
 * drawn here" rather than a reach into the card's markup. Hidden nodes are
 * included because artwork on these cards sits inside an `aria-hidden` slot,
 * which is exactly where a decorative picture belongs.
 */
function picturesOn(slide: HTMLElement): HTMLElement[] {
  return within(slide).queryAllByRole("presentation", { hidden: true });
}

/**
 * The one file the memecoin card draws to say a coin is rising.
 *
 * The arrow is decorative, so it has no accessible name to look it up by and
 * the asset is the only honest handle on it. Naming the file is a claim about
 * which drawing is on the card, which is the thing under test; naming its class
 * would be a claim about how that drawing is positioned, which is not.
 *
 * Nothing below asserts where the arrow sits or how big it is drawn, and that
 * is not an oversight. jsdom computes no layout, so every box on this card
 * measures zero here: size, placement and overlap are unreachable from this
 * suite whatever it asserts, and a class name asserted in their place would
 * only look like coverage. Those belong to a render of the real card.
 */
const RISING_ARROW = "/market/next100x-arrow-up.svg";

function risingArrowsOn(slide: HTMLElement): HTMLElement[] {
  return picturesOn(slide).filter((picture) => picture.getAttribute("src") === RISING_ARROW);
}

/*
 * The memecoin card, coin by coin.
 *
 * The five tests above are the same five for every card on the row. These are
 * about the one card that draws a coin: which coin is on show, what it claims
 * about that coin, and what it draws when the coin brings no picture.
 *
 * A coin is identified by its move, never by its ticker or its name. The name
 * reaches the heading through the translator, which the stub collapses to its
 * key, and the ticker is drawn only on the disc, which a coin the design ships
 * a drawing for does not get. The move is the one line every coin carries.
 */
describe("Find the next 100X, the coin on show", () => {
  // A rotation with a coin the design ships bespoke artwork for sitting between
  // two it does not. SHIB is the coin the card was drawn around, so it is the
  // one a symbol-to-artwork map is expected to answer for.
  //
  // Every coin here carries `image: null`, which is what a listing gives for a
  // coin with no logo of its own. So the map is the only thing that can put a
  // coin's own picture on this card, and the rotation is being watched with the
  // map doing the work.
  const withBespokeArt: readonly MemeSpot[] = [
    { symbol: "WAGZ", name: "Wagz", change: "+412%", up: true, image: null, href: "/meme/wagz" },
    {
      symbol: "SHIB",
      name: "Shiba Inu",
      change: "+777%",
      up: true,
      image: null,
      href: "/meme/shib",
    },
    { symbol: "MOOG", name: "Moog", change: "-63%", up: false, image: null, href: "/meme/moog" },
  ];

  // Named apart because the three differ in what the card owes them: a plain
  // rising coin, a rising coin the design ships a drawing for, and a falling
  // coin.
  const plainRiser: MemeSpot = withBespokeArt[0];
  const drawnRiser: MemeSpot = withBespokeArt[1];
  const faller: MemeSpot = withBespokeArt[2];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Artwork and rotation are two different jobs, and the card does them in the
  // same render. A map that answers for SHIB and not for the coins around it is
  // one `key`, one early return or one memo away from holding SHIB on the card
  // or from skipping it. Nothing else in this file would notice: the other
  // rotation tests are run on coins the map has no opinion about.
  it("gives the bespoke-art coin its turn and takes it back on the next tick", () => {
    render(<Next100xRow memecoins={withBespokeArt} />);

    expect(textOnShow()).toContain("+412%");
    expect(textOnShow()).not.toContain("+777%");

    advance(TEN_SECONDS);
    expect(textOnShow()).toContain("+777%");
    expect(textOnShow()).not.toContain("+412%");

    advance(TEN_SECONDS);
    expect(textOnShow()).toContain("-63%");
    expect(textOnShow()).not.toContain("+777%");
  });

  // The dog is a stop on the loop rather than only the card shown when the feed
  // is empty, which is what makes this card's loop one longer than its feed. He
  // goes behind the live coins, so the card still opens on the freshest one.
  it("brings the editorial Shiba round behind the live coins", () => {
    render(<Next100xRow memecoins={withBespokeArt} />);

    expect(textOnShow()).not.toContain("shibaTitle");

    advance(TEN_SECONDS * 3);
    expect(textOnShow()).toContain("shibaTitle");
    expect(textOnShow()).not.toContain("-63%");
  });

  /*
   * The direction the card commits to.
   *
   * Two claims are made about it, and both are made in the same render. In
   * words, the heading says up or down. In pictures, a green arrow is drawn
   * behind the coin, only when the coin is up. Getting either wrong tells a
   * reader a falling coin is rising, which is the one mistake this card can
   * make that costs money, and the picture is the half a reader takes in first.
   *
   * Each is written as absence as well as presence, because a card that drew
   * every direction at once would pass a presence-only test.
   */
  it("says a rising coin is up, and never that it is down", () => {
    render(<Next100xRow memecoins={[plainRiser]} />);

    const slide = slideShowing(plainRiser.change);
    expect(slide.textContent).toContain("memeUpTitle");
    expect(slide.textContent).not.toContain("memeDownTitle");
  });

  it("says a falling coin is down, and never that it is up", () => {
    render(<Next100xRow memecoins={[faller]} />);

    const slide = slideShowing(faller.change);
    expect(slide.textContent).toContain("memeDownTitle");
    expect(slide.textContent).not.toContain("memeUpTitle");
  });

  it("draws the rising arrow behind a coin that is up", () => {
    render(<Next100xRow memecoins={[plainRiser]} />);

    expect(risingArrowsOn(slideShowing(plainRiser.change))).toHaveLength(1);
  });

  it("draws no rising arrow behind a coin that is down", () => {
    render(<Next100xRow memecoins={[faller]} />);

    expect(risingArrowsOn(slideShowing(faller.change))).toHaveLength(0);
  });

  // The Shiba illustration has the arrow drawn into it, so adding the card's
  // own would put two arrows on one coin. One arrow either way is the rule,
  // and this is the only coin where the drawing is the one supplying it. It
  // fails both ways round: a card that had stopped answering for SHIB would
  // draw the medallion and its own arrow, which is the second arrow this test
  // is looking for.
  it("draws no second arrow behind a rising coin whose own drawing carries one", () => {
    render(<Next100xRow memecoins={[drawnRiser]} />);

    expect(risingArrowsOn(slideShowing(drawnRiser.change))).toHaveLength(0);
  });

  // The third case in the rule, and the one nothing above reaches. The two
  // tests either side are a coin the design ships no drawing for and a coin
  // whose drawing brings its own arrow. PEPE is neither: the design ships a
  // portrait for it and that portrait has no arrow in it, so the card owes it
  // the arrow exactly as it owes a coin drawn on the plain disc.
  //
  // Worth its own test because the arrow is drawn in the coin's slot, behind
  // whichever picture that slot holds. Tying it to one of those pictures
  // instead of to the slot is a small edit and would leave both tests above
  // green: the disc coin would keep its arrow and the dog would still have
  // none. This is the coin that would quietly stop reading as rising.
  it("draws the rising arrow behind a coin whose own drawing carries none", () => {
    const portraitRiser: MemeSpot = {
      symbol: "PEPE",
      name: "Pepe",
      change: "+184%",
      up: true,
      image: null,
      href: "/meme/pepe",
    };
    render(<Next100xRow memecoins={[portraitRiser]} />);

    const slide = slideShowing(portraitRiser.change);
    expect(risingArrowsOn(slide)).toHaveLength(1);
    // The coin's own portrait is still drawn over the arrow. Without this the
    // test would pass on a card that had dropped the drawing and left the arrow
    // standing on its own.
    expect(picturesOn(slide)).toHaveLength(2);
  });

  // A coin with no logo is the common case, not the edge: most of what a
  // trending listing returns has no picture with it. The slot is a fixed disc
  // beside the heading, so leaving it empty is a hole in the artwork, and the
  // ticker is what fills it. The heading here is the translator's key, so the
  // ticker is the only thing on the slide that can be naming this coin.
  //
  // The falling coin is the one to ask, because it is owed no arrow either: no
  // picture at all should be drawn on this slide, so an empty frame has nowhere
  // to hide.
  it("draws the coin's ticker when it has no logo, rather than an empty frame", () => {
    render(<Next100xRow memecoins={[faller]} />);

    const slide = slideShowing(faller.change);
    expect(slide.textContent).toContain("MOOG");
    expect(picturesOn(slide)).toHaveLength(0);
  });

  // Logo URLs come from an upstream listing and some of them do not resolve.
  // The reader must not be left with the browser's broken-image glyph in the
  // middle of the card, so a logo that fails is taken off the disc and the
  // ticker under it is what is left standing.
  //
  // The ticker is painted first and the logo sits over it, so the disc reads
  // even while the logo is still on the wire. That means the ticker being on
  // the slide proves nothing on its own, and what this test turns on is the
  // logo: drawn to begin with, gone once it has failed.
  it("takes the coin's logo off the disc when it fails to load", () => {
    const withLogo: MemeSpot = { ...faller, image: "https://logos.example/moog.png" };
    render(<Next100xRow memecoins={[withLogo]} />);

    const slide = slideShowing(withLogo.change);
    // The falling coin again, so the logo is the only picture on the slide and
    // the count below cannot be answered by the arrow. Asserting the source
    // first is what stops the test passing on a card that drew no logo at all.
    const [logo] = picturesOn(slide);
    expect(logo).toHaveAttribute("src", withLogo.image);
    expect(slide.textContent).toContain("MOOG");

    fireEvent.error(logo);

    const settled = slideShowing(withLogo.change);
    expect(picturesOn(settled)).toHaveLength(0);
    expect(settled.textContent).toContain("MOOG");
  });
});

/*
 * The prediction card on markets with no deadline.
 *
 * The countdown chip is the first thing on the card and the design's geometry
 * starts at it, so a market with no clock has to keep the chip and put a word
 * in it. `PredictionSpot.countdown` has always been nullable, but the feed the
 * card was built against always filled it, so until now nothing was rendering
 * the null branch on purpose. The Polymarket fallback returns markets with no
 * deadline on them, so it is now the ordinary case rather than the rare one.
 */
describe("Your Next Prediction Starts Here, a market with no deadline", () => {
  const undated: readonly PredictionSpot[] = [
    {
      id: "p1",
      question: "Will the fallback source reach the card?",
      countdown: null,
      images: [],
      href: "/prediction/p1",
    },
    {
      id: "p2",
      question: "Will the second undated market take its turn?",
      countdown: null,
      images: [],
      href: "/prediction/p2",
    },
  ];

  const [firstUndated, secondUndated] = undated;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts the no-deadline label in the chip instead of leaving it empty", () => {
    render(<PredictionStartsRow markets={undated} />);

    const slide = slideShowing(firstUndated.question);
    expect(within(slide).getAllByText("predictionNoDeadline")).not.toHaveLength(0);
  });

  // The other half of the same claim, and what stops the test above passing on
  // a card that had simply stopped reading the countdown at all.
  it("shows the countdown itself when the market has one", () => {
    render(<PredictionStartsRow markets={markets} />);

    expect(textOnShow()).toContain("01:02:03:04");
    expect(textOnShow()).not.toContain("predictionNoDeadline");
  });

  // The chip is the only thing on this card that changes shape with a null
  // countdown, and it sits above the question the rotation moves. A card that
  // threw or bailed on the null would leave the reader on the first market for
  // good, which looks exactly like a card with one market in it.
  it("keeps rotating through markets that have no deadline", () => {
    render(<PredictionStartsRow markets={undated} />);

    expect(textOnShow()).toContain(firstUndated.question);
    expect(textOnShow()).not.toContain(secondUndated.question);

    advance(TEN_SECONDS);

    expect(textOnShow()).toContain(secondUndated.question);
    expect(textOnShow()).not.toContain(firstUndated.question);
    expect(textOnShow()).toContain("predictionNoDeadline");
  });
});
