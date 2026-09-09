"use client";

import { useTranslations } from "next-intl";
import type { CasinoGame } from "@/features/casino/lib/games";

/**
 * One row of the desktop Arkade catalogue (node 173:47144): three game cards
 * side by side, 13px apart, each 203.8px tall at the 20px corner.
 *
 * The comp draws each card 370px wide inside a 1038px strip, which does not
 * fit: 3x370 plus two gaps is 1136px, so the comp's own third card is sliced
 * vertically with half a Play button. That is a file defect, not a spec, so the
 * width is not transcribed. The row is a three-column grid that divides
 * whatever container it is given, which keeps the comp's rhythm and card height
 * while never slicing a card at any width. See the report for the ruling this
 * needs.
 *
 * Presentational only. Games arrive as props, and opening one is the caller's
 * job through `onSelectGame`.
 */

// How many placeholder cards a loading row draws. Three fills the row, so the
// skeleton occupies the same band the real cards will.
const SKELETON_COUNT = 3;

// The card frame from the comp, minus its fixed width: the grid cell sets that.
// ws-card carries the 5% fill, the 12% hairline and the inset top light;
// rounded-card overrides its 22px radius down to the design's 20px.
const CARD_FRAME = "ws-card rounded-card relative h-[204px] w-full overflow-hidden text-left";

// The comp's legibility treatment, three layers deep rather than one colour,
// which is why it lives here instead of in a token. A vertical wash sinks the
// bottom of the art to black, and a 153.72deg diagonal darkens the lower-left
// corner where the title and the one-liner sit.
const SCRIM_VERTICAL = "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.35) 45%, #000)";
const SCRIM_DIAGONAL = "linear-gradient(153.72deg, #000 0%, rgba(10,10,10,0) 60%)";

// The call to action pill, bottom right. It is the brushed chrome of
// ws-chrome-pill dropped to 20% alpha so the artwork reads through it, which
// the opaque utility cannot express, plus the comp's white edge and top light.
// No token exists for a translucent chrome, so the stops are literal here.
const CTA_CHROME =
  "linear-gradient(178.79deg, rgba(255,255,255,0.2) 2.36%, rgba(237,237,240,0.2) 38.57%, rgba(203,203,209,0.2) 62.39%, rgba(245,245,248,0.2) 97.64%)";
const CTA_SHADOW = "inset 0 0.667px 0 rgba(255,255,255,0.95), 0 1.335px 5.338px rgba(0,0,0,0.5)";

export interface ArkadeDesktopRowProps {
  // The games this row shows, already filtered and ordered by the caller.
  games: CasinoGame[];
  // Accessible name for the row, since the comp gives it no visible title.
  label: string;
  // Fired with the whole catalogue entry when a playable tile is activated.
  // Navigation belongs to the route, not to a presentational row.
  onSelectGame?: (game: CasinoGame) => void;
  // Draws placeholder cards instead of tiles or the empty treatment.
  loading?: boolean;
}

// The artwork layer. `game.image` mixes local /public paths with absolute
// Unsplash and Wikimedia URLs, and the app configures no next/image
// remotePatterns, so a next/image here would reject the remote half outright.
// A raw img is what the existing tiles use, and object-cover crops the frame
// without distorting a photograph, a logo or a character.
function TileArt({ game }: { game: CasinoGame }) {
  if (!game.image) {
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_70%_20%,rgba(212,212,216,0.08),transparent_60%)]"
      >
        <span className="ws-display -rotate-8 text-[110px] leading-none text-white/10 select-none">
          {game.glyph}
        </span>
      </span>
    );
  }
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={game.image}
        alt=""
        loading="lazy"
        className={`h-full w-full object-cover ${
          game.comingSoon && !game.preserveImageColor ? "opacity-50 grayscale" : ""
        }`}
      />
    </span>
  );
}

// Everything drawn inside the card frame, shared by the playable tile and the
// coming soon one so the two cannot drift apart.
function TileBody({ game }: { game: CasinoGame }) {
  const t = useTranslations("casino.hub");
  const badge = game.comingSoon
    ? t("badgeComingSoon")
    : game.isNew || game.category === "New"
      ? t("badgeNew")
      : null;

  return (
    <>
      <TileArt game={game} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: `${SCRIM_DIAGONAL}, ${SCRIM_VERTICAL}` }}
      />

      {/* Mona Sans bold, per the comp. Two of its six badge nodes are drawn in
          Quicksand instead; the card's other type is Mona Sans throughout, so
          the majority wins and the inconsistency is reported, not copied. */}
      {badge ? (
        <span className="text-grey-700 absolute top-4 left-4 rounded-full border border-white/20 bg-white px-3.5 py-0.5 font-serif text-[12px] font-bold">
          {badge}
        </span>
      ) : null}

      {/* The comp pins the copy at x=16 and the pill at the right edge. A flex
          row reproduces that and keeps the two apart as the card narrows,
          rather than letting a fixed 227px block slide under the pill. */}
      <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
        <span className="flex min-w-0 flex-col gap-2">
          <span className="ws-display block text-[18px] leading-none text-white">
            {t(`games.${game.id}.name`)}
          </span>
          {game.note ? (
            <span className="block font-serif text-[14px] leading-[1.2] font-bold tracking-[-0.14px] text-white/65">
              {t(`games.${game.id}.note`)}
            </span>
          ) : null}
        </span>

        {/* Mona Sans semibold, so ws-display is out: it pins the weight at 700. */}
        {game.comingSoon ? null : (
          <span
            className="inline-flex shrink-0 items-center rounded-full border border-white px-4 py-2.5 font-serif text-[11.5px] leading-none font-semibold tracking-[-0.46px] text-white"
            style={{ backgroundImage: CTA_CHROME, boxShadow: CTA_SHADOW }}
          >
            {t("playNow")}
          </span>
        )}
      </span>
    </>
  );
}

function Tile({
  game,
  onSelectGame,
}: {
  game: CasinoGame;
  onSelectGame?: (game: CasinoGame) => void;
}) {
  const t = useTranslations("casino.hub");
  const name = t(`games.${game.id}.name`);

  // A game with no destination is not a control. Rendering it as a disabled
  // button would put an inert stop in the tab order, so it stays plain content
  // and the COMING SOON badge carries the reason.
  if (game.comingSoon || !game.href) {
    return (
      <div className={CARD_FRAME}>
        <TileBody game={game} />
      </div>
    );
  }

  return (
    <button
      type="button"
      // The tile's own text is a name, a one-liner and a call to action, which
      // reads as a sentence fragment to a screen reader. The label states the
      // action and the game instead.
      aria-label={t("openGame", { name })}
      onClick={() => onSelectGame?.(game)}
      className={`${CARD_FRAME} ws-pressable cursor-pointer transition-[border-color] hover:border-white/30`}
    >
      <TileBody game={game} />
    </button>
  );
}

export function ArkadeDesktopRow({ games, label, onSelectGame, loading }: ArkadeDesktopRowProps) {
  const t = useTranslations("casino.hub");

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={t("loadingGames")}
        className="grid grid-cols-3 gap-[13px]"
      >
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} className={`${CARD_FRAME} bg-surface animate-pulse`} />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div
        className="border-hairline text-grey-400 rounded-card flex h-[204px] items-center justify-center border border-dashed font-serif text-[14px]"
        // The row keeps its name while empty, so the reason sits under the
        // same heading a populated row would have.
        aria-label={label}
      >
        {t("emptyCategory")}
      </div>
    );
  }

  return (
    <ul
      aria-label={label}
      // Three equal columns of the container, so a short last row keeps the
      // same card width as a full one instead of stretching to fill.
      className="grid list-none grid-cols-3 gap-[13px]"
    >
      {games.map((game) => (
        <li key={game.id} className="min-w-0">
          <Tile game={game} onSelectGame={onSelectGame} />
        </li>
      ))}
    </ul>
  );
}
