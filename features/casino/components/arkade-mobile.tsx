"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useBalanceVisibility } from "@/components/ui/balance-visibility";
import { CardIcon, SearchIcon } from "@/components/ui/icons";
import { usePortfolio } from "@/hooks/use-portfolio";
import { track } from "@/lib/analytics/mixpanel";
import type { Game } from "@/lib/analytics/events";
import { formatQty } from "@/lib/format";
import {
  CASINO_GAMES,
  GAME_CATEGORIES,
  filterGames,
  type CasinoGame,
  type GameCategoryFilter,
} from "@/features/casino/lib/games";

// Catalogue filter values mapped to their label keys in "casino.hub". Mirrors
// the desktop hub so a phone and a laptop show the same chip names.
const CATEGORY_KEY: Record<GameCategoryFilter, string> = {
  "All games": "categoryAll",
  Skill: "categorySkill",
  Cards: "categoryCards",
  Draws: "categoryDraws",
  Racing: "categoryRacing",
  New: "categoryNew",
  "Coming soon": "categoryComingSoon",
};

// The three games the catalogue names to the analytics layer; anything else has
// no agreed id, so opening it reports nothing rather than inventing one. Kept in
// step with the desktop GameTile.
const TRACKED_GAMES: Record<string, Game | undefined> = {
  chess: "chess",
  checkers: "checkers",
  "last-standing": "last_man",
};

// One catalogue entry as the mobile comp draws it (node 261:977): a short
// landscape cover with the badge pinned top-left and the name, one-liner and
// Explore pill resting along the bottom. Uniform tiles here, rather than the
// desktop hub's hero/tall/wide footprints, since a two-up grid has no room for
// them.
function MobileGameTile({ game }: { game: CasinoGame }) {
  const t = useTranslations("casino.hub");
  const badge = game.comingSoon
    ? t("badgeComingSoon")
    : game.isNew || game.category === "New"
      ? t("badgeNew")
      : null;
  const playable = !game.comingSoon && game.href;

  const body = (
    <>
      {game.image ? (
        <span aria-hidden className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={game.image}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover ${
              game.comingSoon ? "opacity-50 grayscale" : ""
            }`}
          />
        </span>
      ) : null}
      {/* Legibility scrim: the name and one-liner sit over the bottom of the art. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.35)_50%,rgba(0,0,0,0.1)_100%)]"
      />

      {badge ? (
        <span className="absolute top-2.5 left-2.5 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-white backdrop-blur-md">
          {badge}
        </span>
      ) : null}

      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="min-w-0">
          <span
            className={`ws-display block text-[15px] leading-tight ${
              game.comingSoon ? "text-white/80" : "text-white"
            }`}
          >
            {t(`games.${game.id}.name`)}
          </span>
          {game.note ? (
            <span className="mt-0.5 line-clamp-2 block text-[10.5px] leading-snug font-normal text-white/60">
              {t(`games.${game.id}.note`)}
            </span>
          ) : null}
        </span>
        {playable ? (
          <span className="ws-chrome text-ink inline-flex shrink-0 items-center gap-0.5 px-2.5 py-1 text-[11px] font-semibold">
            {t("explore")}
            <span aria-hidden>›</span>
          </span>
        ) : null}
      </span>
    </>
  );

  const frame = "relative min-h-[128px] overflow-hidden rounded-[16px]";

  if (!playable) return <div className={frame}>{body}</div>;
  return (
    <Link
      href={game.href!}
      onClick={() => {
        const game_id = TRACKED_GAMES[game.id];
        if (game_id) track("game_opened", { game: game_id });
      }}
      className={frame}
    >
      {body}
    </Link>
  );
}

/**
 * Arkade on a phone, as the mobile comp draws it (node 261:977): a centred
 * title, a full-width search field with the USDC balance tucked beside it,
 * underlined category tabs, and the catalogue as a uniform two-up grid.
 *
 * From `md` up the desktop `HubSection` takes over, so this renders phone-only.
 * Filtering and the balance figure are the same as the desktop hub — only the
 * layout differs.
 */
export function ArkadeMobile() {
  const t = useTranslations("casino.hub");
  const { mask } = useBalanceVisibility();
  const portfolio = usePortfolio();
  const usdcBalance =
    portfolio.tokens.find(
      (tok) => tok.network === "base-mainnet" && tok.symbol.toUpperCase() === "USDC"
    )?.balance ?? 0;
  const [category, setCategory] = useState<GameCategoryFilter>("All games");
  const [search, setSearch] = useState("");

  // Search matches the names the player actually sees, i.e. the localized ones.
  const games = useMemo(
    () => filterGames(CASINO_GAMES, category, search, (g) => t(`games.${g.id}.name`)),
    [category, search, t]
  );

  return (
    <div className="w-full p-4">
      <h1 className="ws-display text-center text-[26px] text-white">{t("title")}</h1>

      <div className="ws-inset mt-5 flex items-center gap-2.5 px-4 py-3.5">
        <SearchIcon size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full bg-transparent font-sans text-[14px] text-white outline-none placeholder:text-white/40"
        />
      </div>

      {/* The same balance the rest of the platform shows: games spend from it
          directly, so there is no separate casino float to top up. */}
      <div className="mt-3 flex justify-end">
        <div className="ws-inset inline-flex items-center gap-1.5 px-3 py-1.5">
          <CardIcon size={15} className="text-white/50" />
          <span className="ws-display tnum text-[13px] text-white" data-sensitive="balance">
            {mask(`$${formatQty(usdcBalance)}`)}
          </span>
        </div>
      </div>

      {/* Each tab takes a third of the viewport, so three read at a time and the
          rest scroll into view. */}
      <div className="ws-no-scrollbar mt-4 flex overflow-x-auto border-b border-white/10">
        {GAME_CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`-mb-px shrink-0 grow-0 basis-1/3 border-b-2 pb-2.5 text-center font-sans text-[14px] whitespace-nowrap transition-colors ${
                active
                  ? "border-white font-semibold text-white"
                  : "border-transparent text-white/50"
              }`}
            >
              {t(CATEGORY_KEY[c])}
            </button>
          );
        })}
      </div>

      {games.length === 0 ? (
        <div className="py-16 text-center text-[13.5px] font-normal text-white/50">
          {t("noGamesFound")}
        </div>
      ) : (
        // "All" browses the whole catalogue two-up; a picked category gets the
        // room to show each game full-width, one per row.
        <div
          className={`mt-4 grid gap-3 ${category === "All games" ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {games.map((g) => (
            <MobileGameTile key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
