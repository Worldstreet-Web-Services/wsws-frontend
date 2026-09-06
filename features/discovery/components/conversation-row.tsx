"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Carousel } from "@/components/ui/carousel";
import { DiscoveryRow } from "@/features/discovery/components/discovery-row";
import { DiscoveryCta } from "@/features/discovery/components/discovery-cta";
import type { SpaceSpot } from "@/features/discovery/types";
import { useRotatingIndex } from "@/hooks/use-rotating-index";

// Every illustration on these two cards is a Figma export under public/market.
// They are decorative, so they carry no alt text and never take a click.
const artLayer = "pointer-events-none absolute select-none";

// The design draws both cards 482px wide, but each gets a carousel slide out of
// a 1456px column, so roughly 690px. Nothing horizontal may be pinned at a
// design pixel or it drifts to an edge as the card grows: every x offset is a
// share of the card instead. Vertical offsets stay in pixels because the card
// keeps the height it was drawn at.
const CARD_WIDTH = 482;

/** A design x offset, as the percentage of the card it sits at. */
function across(x: number): string {
  return `${((x / CARD_WIDTH) * 100).toFixed(4)}%`;
}

/** The chess card's member scatter is laid out inside its own 408px box. */
const CLUSTER_WIDTH = 408;

interface ClusterPiece {
  /**
   * The committed export this slot draws when no live member reaches it. The
   * two mic discs always draw theirs: they are furniture, not members.
   */
  fallback: string;
  /** Square in every case: the photos are circles and the badges are discs. */
  size: number;
  /** Inside the 408x83 box the cluster is centred on, in design pixels. */
  left: number;
  top: number;
  tilt: number;
  /** A member photo, so it is masked to a circle. The badges ship their frame. */
  photo?: boolean;
  /** Only the large face is drawn with a dark rim. */
  outlined?: boolean;
  shadow?: string;
}

// The scatter of members across the top of the chess card. Order is the design's
// paint order, so a face laid over a badge stays over it. The two mic discs sit
// between the small faces and the large one.
const CHESS_CLUSTER: ClusterPiece[] = [
  {
    fallback: "/market/convo-avatar-1.png",
    size: 30.551,
    left: 253.22,
    top: 3.65,
    tilt: -16.19,
    photo: true,
    shadow: "0 4.155px 2.078px rgba(0,0,0,0.3)",
  },
  {
    fallback: "/market/convo-avatar-2.png",
    size: 30.551,
    left: 36.69,
    top: -2.31,
    tilt: 11.28,
    photo: true,
    shadow: "0 4.155px 2.078px rgba(0,0,0,0.3)",
  },
  {
    fallback: "/market/convo-avatar-3.png",
    size: 28.295,
    left: 57.4,
    top: 48.4,
    tilt: -16.31,
    photo: true,
    shadow: "0 2.881px 1.44px rgba(0,0,0,0.3)",
  },
  {
    fallback: "/market/convo-avatar-badge-large.svg",
    size: 36.451,
    left: 228.46,
    top: 47.62,
    tilt: -21.2,
  },
  {
    fallback: "/market/convo-avatar-badge-small.svg",
    size: 26.64,
    left: 125.69,
    top: 31.82,
    tilt: 19.08,
  },
  {
    fallback: "/market/convo-avatar-4.png",
    size: 88.38,
    left: 304.64,
    top: -12.36,
    tilt: 14.47,
    photo: true,
    outlined: true,
    shadow: "0 6.769px 6.769px rgba(0,0,0,0.3)",
  },
  {
    fallback: "/market/convo-avatar-5.png",
    size: 30.551,
    left: -9,
    top: 45,
    tilt: 0,
    photo: true,
    shadow: "0 4.155px 2.078px rgba(0,0,0,0.3)",
  },
  {
    fallback: "/market/convo-avatar-3.png",
    size: 51.524,
    left: 162.36,
    top: -5.64,
    tilt: 13.67,
    photo: true,
    shadow: "0 5.246px 2.623px rgba(0,0,0,0.3)",
  },
];

// The photo for each of the eight slots, in paint order, for one room.
//
// The choreography is fixed: eight pieces at sizes, offsets and tilts the
// design drew, six of them faces. A live room supplies whatever member photos
// it has, which is rarely six, so the list wraps: a three-member room draws its
// three faces twice rather than leaving three empty discs in the middle of the
// composition. The design already repeats a face itself, so a repeat reads as
// the scatter it was drawn as. Members past the sixth are not drawn.
//
// An empty list keeps every committed photo, which is the card the design draws
// and the one the preview harness and the tests render.
function scatterSources(avatars: readonly string[]): string[] {
  let member = 0;
  return CHESS_CLUSTER.map((piece) => {
    if (!piece.photo || avatars.length === 0) return piece.fallback;
    const src = avatars[member % avatars.length];
    member += 1;
    return src;
  });
}

interface RoomPillProps {
  href: string;
  label: string;
  /** Trailing glyph, sized by the caller. */
  icon: React.ReactNode;
  /** "solid" is the red Join Space pill, "outline" the white-ruled Play Chess one. */
  tone: "solid" | "outline";
}

// The chess card's two pills. Neither matches DiscoveryCta: the design fills one
// in the room's red and rules the other in white, and both put the glyph after
// the label rather than before it.
//
// Neither carries a width or a height. The design draws both 112x34.4, and both
// of those numbers are floors here rather than sizes. The width comes from the
// column, which asks for 112px as a minimum and grows to whatever the longest
// label needs. The height comes from the padding: 17.224px each side, and the
// vertical padding that puts a single line of label on the drawn height, which
// is 10px inside the solid pill and 8.8px inside the ruled one because the
// rule is 1.435px of the 35px. That is the gap the design leaves around "Join
// Space", and because it is padding rather than slack it is still there around
// "Rejoindre l'espace". English renders at exactly the size it is drawn.
//
// The label wraps instead of ellipsising. On a card narrow enough that even the
// column's cap cannot hold the longest label on one line, a second line inside
// the pill keeps the whole call to action readable and the padding intact; an
// ellipsis would save the pill's shape by throwing the word away.
function RoomPill({ href, label, icon, tone }: RoomPillProps) {
  return (
    <Link
      href={href}
      className={`ws-pressable flex items-center justify-center gap-[5.115px] rounded-full px-[17.224px] text-center font-serif text-[12px] leading-[1.2] font-medium text-white capitalize ${
        tone === "solid"
          ? "min-h-[34.447px] bg-[#d12727] py-[10px]"
          : "min-h-[35px] border-[1.435px] border-white py-[8.8px]"
      }`}
    >
      <span className="min-w-0 break-words hyphens-auto">{label}</span>
      {icon}
    </Link>
  );
}

interface ChessRoomCardProps {
  /** The room on show. It changes under the card as the rotation advances. */
  room: SpaceSpot;
  /** Reports this card holding the rotation still, and letting it go again. */
  onHold: (held: boolean) => void;
}

// The room the square is running right now. The backdrop, the badge discs and
// the two mic discs are exports; the room name, the headline, the member faces
// and both pill destinations come from the room on show. The backdrop is a
// full-card export and the export carries preserveAspectRatio="none", so it
// stretches edge to edge. It is a gradient washed with blur and dust, and it
// takes the extra width without any of it reading as distortion.
function ChessRoomCard({ room, onHold }: ChessRoomCardProps) {
  const t = useTranslations("discovery");
  const sources = scatterSources(room.avatars);

  // WCAG 2.2.2 (Pause, Stop, Hide): the room changes on its own every ten
  // seconds, so a reader needs a way to hold it still, and hover and
  // focus-within are that way. onFocus and onBlur are focusin and focusout in
  // React, so focus anywhere inside the card counts, not just on the card.
  //
  // The hold is reported upward rather than applied here because the rotation
  // is owned above the carousel: the carousel renders this card more than once
  // and a slide cannot hold state of its own.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;

  useEffect(() => {
    if (!held) return;
    onHold(true);
    // Released when the pointer leaves, when focus goes, and when the card
    // unmounts. A hold that outlived its card would stop the rotation for good.
    return () => onHold(false);
  }, [held, onHold]);

  return (
    <article
      className="relative h-[203px] overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,#140027_0%,#6023c2_100%)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <img
        src="/market/convo-chess-art.svg"
        alt=""
        aria-hidden
        width={482}
        height={203}
        className={`${artLayer} inset-0 h-full w-full`}
      />

      {/* The scatter spreads with the card rather than clumping at the left,
          so the box is proportional while the faces keep the size they were
          drawn at. */}
      <div className="absolute top-[9px] h-[83px]" style={{ left: across(37), right: across(37) }}>
        {CHESS_CLUSTER.map((piece, slot) => (
          <img
            // Keyed by the slot, not by the photo in it. The photo changes with
            // the room, and a key that changed with it would tear the scatter
            // down and rebuild it on every advance rather than swapping a src.
            key={piece.left}
            src={sources[slot]}
            alt=""
            aria-hidden
            // A member's photo is a remote URL and can fail. The committed face
            // takes the slot when it does, so a dead link is a face nobody
            // recognises rather than a hole in the middle of the composition.
            // Guarded on the attribute rather than on `src`, which reads back
            // absolute, so a committed photo that fails cannot loop.
            onError={(event) => {
              const image = event.currentTarget;
              if (image.getAttribute("src") !== piece.fallback) image.src = piece.fallback;
            }}
            width={Math.round(piece.size)}
            height={Math.round(piece.size)}
            style={{
              left: `${((piece.left / CLUSTER_WIDTH) * 100).toFixed(4)}%`,
              top: piece.top,
              width: piece.size,
              height: piece.size,
              transform: `rotate(${piece.tilt}deg)`,
              boxShadow: piece.shadow,
            }}
            className={`${artLayer} ${piece.photo ? "rounded-full object-cover" : ""} ${
              piece.outlined ? "border-[2.389px] border-[#1e2022]" : ""
            }`}
          />
        ))}
      </div>

      {/* Copy on the left, pills on the right, both inside the band the design
          rules between x=44.32 and the far edge less 34. They share one row so
          the two can negotiate: the pills take what their longest label needs
          and the copy keeps the rest, up to the width it is drawn at.
          The gap is 18px rather than the design's 12px. 12px is enough between
          "grandmaster" and "Join Space", and not enough between a German
          headline that fills its column and a pill that has grown to hold
          "Space beitreten": the two would read as one block.
          The row hangs off the bottom, not the top. The design puts it at
          y=103 with a 78.45px pill stack under it, so 21.553px is the gap it
          leaves to the card's bottom edge, and anchoring there reproduces
          y=103 exactly for as long as the stack is the height it was drawn at.
          It stops reproducing it the moment a pill takes a second line, and
          that is the point: the row grows upward into the card instead of down
          through the edge, which is where a top offset would have sent it. */}
      <div
        className="absolute bottom-[21.553px] flex items-start justify-between gap-[18px]"
        style={{ left: across(44.32), right: across(34) }}
      >
        {/* The design draws this column at 227.37px, which is 56.3245% of the
            band, and leaves a 64px gutter between it and the pills. The cap is
            62% instead. The extra 5.7% is gutter the design does not need at
            the width it was drawn at and the copy does need at the widths the
            card is actually rendered at: on a 1280px viewport the card is
            554px, and 56.3245% is a column the Spanish and Portuguese
            headlines run out of on the third line. At 62% both fit the two
            lines they are drawn on, and on a 1520px viewport the gutter is
            still the 64px the design draws, or more. The 18px row gap is the
            floor the gutter never goes under.
            The 2.32px is the copy sitting that much lower than the pills. */}
        <div className="mt-[2.32px] max-w-[62%] min-w-0 flex-1">
          {/* leading-[1.2] rather than leading-none, and the row is no taller
              for it: the 14.634px icon is what sets this row's height either
              way, so a one-line name renders exactly where it is drawn and a
              name that needs two lines gets leading between them. */}
          <p className="flex items-center gap-[4.878px] font-serif text-[11px] leading-[1.2] font-semibold text-white">
            <img
              src="/market/convo-house-icon.png"
              alt=""
              aria-hidden
              width={15}
              height={15}
              className="size-[14.634px] shrink-0 rounded-[3.659px] object-cover"
            />
            {/* The room's own name, so it wraps to a second line before it
                gives up any of itself. On a 768px viewport the card is 320px
                and "Mitolyx Playroom" does not fit the column on one line in
                four of the five locales; two lines is the whole name, and an
                ellipsis there would be the name with its second word cut. */}
            <span className="line-clamp-2">{room.room}</span>
          </p>
          {/* Two lines then an ellipsis, as drawn. The clamp is no longer what
              keeps the card whole, since the row is anchored to the bottom
              edge: it is what keeps the row's top clear of the member scatter
              above it, which ends 93px down. */}
          <h3 className="mt-[9.34px] line-clamp-2 font-serif text-[23px] leading-[1.1] font-bold text-white">
            {room.headline}
          </h3>
        </div>

        {/* 112px is the width the design draws both pills at, and the floor here
            rather than the width, so a longer locale widens the column instead
            of being clipped inside it. The cap keeps the column clear of the
            copy on a card narrower than the 482px it was drawn at; past the cap
            the label wraps inside the pill rather than being cut. 66% is where
            the cap sits because it is what the longest label needs at the
            narrowest card: the discovery area starts at a 768px viewport, and
            the 320px card that gives leaves the band 268px, of which
            "Rejoindre l'espace" and its padding want 154px. The cap never
            binds above that width, so it costs the copy nothing. */}
        <div className="flex max-w-[66%] min-w-[112px] shrink-0 flex-col items-stretch gap-[9px]">
          <RoomPill
            href={room.href}
            label={t("conversationJoin")}
            tone="solid"
            icon={
              <img
                src="/market/convo-icon-volume.svg"
                alt=""
                aria-hidden
                width={9}
                height={7}
                className="h-[7.465px] w-[9.17px] shrink-0"
              />
            }
          />
          <RoomPill
            href={room.actionHref}
            label={t("conversationPlay")}
            tone="outline"
            icon={
              <img
                src="/market/convo-icon-pawn.svg"
                alt=""
                aria-hidden
                width={7}
                height={9}
                className="h-[9.17px] w-[7.463px] shrink-0"
              />
            }
          />
        </div>
      </div>
    </article>
  );
}

// The arena copy sits a third of the way across the card. The offset is a
// spacer rather than a left edge because it is the part that gives way: the
// headline is a single 40px line in the design and a longer locale needs more
// room than the design leaves to the right of x=153, so the spacer shrinks and
// slides the whole column left before anything has to wrap.
const ARENA_COPY_INSET = across(153);

// The two orbs sit on the trend curve near the card's edges. Each export is the
// orb plus its glow, so the figure it centres on is the box centre.
interface ArenaOrb {
  src: string;
  width: number;
  height: number;
  /** Centre of the export, in design pixels across the card. */
  centre: number;
  top: number;
}

// Listed in the design's paint order, which draws the right orb first.
const ARENA_ORBS: ArenaOrb[] = [
  {
    src: "/market/convo-arena-orb-right.svg",
    width: 19,
    height: 19,
    centre: 449.669,
    top: 82.0845,
  },
  { src: "/market/convo-arena-orb-left.svg", width: 31, height: 32, centre: 39.1086, top: 87 },
];

// The leverage desk's doorway, in the layers the design draws it in. The card
// is drawn at 482px and rendered half again as wide, so every layer has to say
// what it does with the extra width.
//
// Star dust, trend curve and ray burst are backdrop and stretch with the card.
// The coin stack and the orbs are round and may not: the stack keeps its
// proportions and grows off the bottom edge, which is already a crop, so it
// still reaches both sides at any width; the orbs hold the size they were drawn
// at and ride the curve at a fixed share across, where the stretched curve
// still passes through them.
//
// Two of the layers blend rather than paint over: the dust is plus-lighter and
// the stack's glow is screen. An img is its own stacking context, so both
// blends are set on the element, not left inside the export where they would
// have nothing under them.
function ArenaCard() {
  const t = useTranslations("discovery");

  return (
    <article className="relative h-[204px] overflow-hidden rounded-[18px] bg-[linear-gradient(0deg,#7724bb_0%,#deb5ff_100%)]">
      <img
        src="/market/convo-arena-stars.svg"
        alt=""
        aria-hidden
        width={482}
        height={204}
        className={`${artLayer} inset-0 h-full w-full mix-blend-plus-lighter`}
      />
      <img
        src="/market/convo-arena-trend.svg"
        alt=""
        aria-hidden
        width={482}
        height={158}
        className={`${artLayer} top-[46.055px] left-0 h-[158px] w-full`}
      />
      {/* Width and bottom, never a right offset: an img given both offsets and
          no width falls back to its intrinsic size and ignores the far one. */}
      <img
        src="/market/convo-arena-coins.svg"
        alt=""
        aria-hidden
        width={482}
        height={121}
        className={`${artLayer} bottom-0 left-0 h-auto w-full`}
      />
      <img
        src="/market/convo-arena-coin-glow.svg"
        alt=""
        aria-hidden
        width={482}
        height={121}
        className={`${artLayer} bottom-0 left-0 h-auto w-full mix-blend-screen`}
      />
      {ARENA_ORBS.map((orb) => (
        <img
          key={orb.src}
          src={orb.src}
          alt=""
          aria-hidden
          width={orb.width}
          height={orb.height}
          style={{
            left: `calc(${across(orb.centre)} - ${orb.width / 2}px)`,
            top: orb.top,
            width: orb.width,
            height: orb.height,
          }}
          className={artLayer}
        />
      ))}
      <img
        src="/market/convo-arena-rays.svg"
        alt=""
        aria-hidden
        width={482}
        height={204}
        className={`${artLayer} inset-0 h-full w-full`}
      />

      {/* Headline, body and pill are one column in the design, so they travel
          together and keep the offsets they have from each other. They stack in
          flow rather than at three absolute tops: the offsets below reproduce
          the design's 21px, 69px and 105.73px exactly for a one-line headline
          and a two-line body, and a locale that needs another line of either
          pushes what follows down instead of landing on top of it.
          The 18px padding is the gutter the column stops at on the right, and
          it hangs off the column rather than the row so that the row's width
          stays the card's and the spacer keeps resolving against it. The design
          leaves 10px, which is the slack a short English headline happens to
          end at, not a margin: "Entrez dans l'arène" is long enough to reach
          the gutter, and 18px is what keeps it off the card's edge.
          The spacer never closes all the way. It is what gives way as the
          headline grows, but at zero the headline would start at the card's
          left edge, so it keeps an 18px gutter of its own and the column is
          capped to what is left beside it. */}
      <div className="absolute inset-y-0 left-0 flex w-full items-start">
        <div className="min-w-[18px] shrink" style={{ width: ARENA_COPY_INSET }} />
        <div className="max-w-[calc(100%-18px)] shrink-0 pt-[21px] pr-[18px]">
          {/*
           * The design's drop shadow, and it has to be a filter. `text-shadow`
           * paints above the element's own background, and the fill here is a
           * background clipped to the glyphs, so the purple lands on top of the
           * letters and turns them the colour of the card. `drop-shadow` takes
           * the element as already painted and puts the shadow behind it, which
           * is what Figma draws.
           *
           * w-fit keeps the gradient box the width of the glyphs it is clipped
           * to, whatever the column around it ends up. The card is drawn 204px
           * tall and stays that, so the two clamps here and on the body are what
           * keep a long locale off the coin stack: two lines of headline and two
           * of body is the tallest stack the card has room for.
           */}
          <h3
            className="ws-poster ws-arena-ink ml-[4.563px] line-clamp-2 w-fit text-[40px] leading-[1.2] tracking-[-0.8px] text-balance capitalize"
            style={{ filter: "drop-shadow(0 3.397px 3.397px #b46cf0)" }}
          >
            {t("arenaTitle")}
          </h3>
          <p className="ml-[1.563px] line-clamp-2 w-[250px] max-w-full font-serif text-[13px] leading-normal font-semibold tracking-[-0.26px] text-white">
            {t("arenaBody")}
          </p>
          {/* The pill is inline-flex, so it goes in a block of its own: on a
              line of its own it would pick up leading above and below and lose
              the 6.73px the design leaves under the body copy. */}
          <div className="mt-[6.73px] flex">
            <DiscoveryCta
              href="/perps"
              label={t("arenaCta")}
              tone="light"
              size={12}
              icon={
                <img
                  src="/market/convo-icon-coins.svg"
                  alt=""
                  aria-hidden
                  width={12}
                  height={12}
                  className="size-[12.012px] shrink-0"
                />
              }
              className="border-[0.479px] border-[#9e5ad0] tracking-[-0.12px]"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

// The square's chess room, under its own heading. The heading goes straight to
// the chess service whatever room is on show, so the shelf does not depend on
// Market Square being switched on and always renders.
function ChessShelf(props: ChessRoomCardProps) {
  const t = useTranslations("discovery");

  return (
    <DiscoveryRow title={t("conversationTitle")} href="/casino/chess">
      <ChessRoomCard {...props} />
    </DiscoveryRow>
  );
}

// The leverage desk, under its own heading.
function ArenaShelf() {
  const t = useTranslations("discovery");

  return (
    <DiscoveryRow title={t("ownMarketTitle")} href="/perps">
      <ArenaCard />
    </DiscoveryRow>
  );
}

// The one band on the discovery area that is not a heading over a pair of
// cards. It is two separate shelves side by side, each with its own heading and
// its own chevron through to its own service, and the design pairs them at one
// height rather than stacking them.
//
// So the slide here is the whole shelf, heading included, not the card alone.
// The other three rows put the carousel inside DiscoveryRow because they have
// one heading to hold still above it. This band has two, and each names the card
// under it: "Join the Conversation" over the arena card would be wrong within a
// second of the first advance. Moving the heading with its card is the only
// arrangement that keeps both headings truthful, and it costs nothing, because
// the two headings are the same height and travel level with each other.
//
// Two shelves cannot cycle, so the chess room is dealt twice. It is the shelf
// carrying a room that is live right now, which is the one worth coming back
// around to; the arena is an evergreen doorway to the perps desk and reads the
// same whenever it lands. The repeat is third rather than second so the first
// two views, room then desk and desk then room, are both a genuine pair.
//
// The room itself rotates. `spaces` is every room worth featuring, and the card
// steps through them on a ten second timer, taking each room's name, headline,
// member faces and two destinations in turn. The rotation is owned here rather
// than on the card because the carousel draws every slide more than once: two
// real room slides, plus the clones it flanks the row with to loop. State on a
// slide would leave those copies showing different rooms side by side.
export function ConversationRow({ spaces = [] }: { spaces?: readonly SpaceSpot[] }) {
  const t = useTranslations("discovery");

  // Every copy of the card reports its own hold, so this counts holds rather
  // than flagging one: a pointer can reach the second copy before it has left
  // the first, and one release must not let go of the other's hold.
  const [holds, setHolds] = useState(0);
  const hold = useCallback((held: boolean) => setHolds((n) => n + (held ? 1 : -1)), []);

  // The room the design draws, from the discovery copy and the committed
  // photos. It is what the card shows when the route has nothing live to give
  // it, and a single room does not rotate, so the card is then exactly the
  // still card it is today.
  const chessRoom: SpaceSpot = {
    id: "chess",
    room: t("conversationRoom"),
    headline: t("conversationHeadline"),
    avatars: [],
    href: "/casino/chess/watch",
    actionHref: "/casino/chess",
  };
  const rooms = spaces.length > 0 ? spaces : [chessRoom];
  const index = useRotatingIndex(rooms.length, { paused: holds > 0 });
  const room = rooms[index];

  return (
    <Carousel label={t("conversationCarousel")} gapPx={20} trimPx={50}>
      <ChessShelf room={room} onHold={hold} />
      <ArenaShelf />
      <ChessShelf room={room} onHold={hold} />
    </Carousel>
  );
}
