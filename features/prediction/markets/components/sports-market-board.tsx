"use client";

import { useState } from "react";
import type { ComboSport } from "../api";
import { COMBO_EVENT_PAGE_SIZE } from "../cache-policy";
import { mergeLeagueArtwork } from "../merge-league-artwork";
import type { BoardSelection, MarketWindow } from "../presenter";
import { filterEventsByWindow, groupLeagueFixtures } from "../presenter";
import { comboSportsForNavigation } from "../sport-navigation";
import type { SportsNavKey } from "../types";
import { useComboEvents, useComboFilters } from "../hooks/use-combo-markets";
import { useComboTeamArtwork } from "../hooks/use-combo-team-artwork";
import { LeagueSection } from "./league-section";
import { MarketBoardFilters } from "./market-board-filters";
import { MarketBoardSkeleton } from "./market-board-skeleton";
import { ProviderSportTabs } from "./provider-sport-tabs";

interface SportsMarketBoardProps {
  activeSportsNav: SportsNavKey;
  selectedIds: ReadonlySet<string>;
  onSelect: (selection: BoardSelection) => void;
  onRemoveSelection: (selectionId: string) => void;
}

export function SportsMarketBoard({
  activeSportsNav,
  selectedIds,
  onSelect,
  onRemoveSelection,
}: SportsMarketBoardProps) {
  const sportOptions = comboSportsForNavigation(activeSportsNav);
  const [sport, setSport] = useState<ComboSport>(sportOptions[0]?.sport ?? "soccer");
  const [window, setWindow] = useState<MarketWindow>("upcoming");
  const [league, setLeague] = useState("");
  const supported = sportOptions.length > 0;
  const filters = useComboFilters(sport, supported);
  const events = useComboEvents(
    { sport, league: league || undefined, limit: COMBO_EVENT_PAGE_SIZE },
    supported
  );
  const eventsWithArtwork = useComboTeamArtwork(events.events);
  const eventsWithProviderArtwork = mergeLeagueArtwork(eventsWithArtwork, filters.leagues);

  if (!supported) {
    return (
      <div className="rounded-[10px] border border-white/8 bg-[#111114] px-6 py-16 text-center">
        <p className="text-[14px] font-bold text-white/75">This sport is not available yet.</p>
        <p className="mt-2 text-[12px] text-white/42">
          Polymarket does not currently provide this virtual sport as a Combo feed.
        </p>
      </div>
    );
  }

  const groups = groupLeagueFixtures(filterEventsByWindow(eventsWithProviderArtwork, window));

  return (
    <section className="overflow-hidden rounded-[12px] border border-white/8 bg-[#09090b]">
      <ProviderSportTabs
        options={sportOptions}
        sport={sport}
        onChange={(nextSport) => {
          setSport(nextSport);
          setLeague("");
        }}
      />
      <MarketBoardFilters
        window={window}
        onWindowChange={setWindow}
        leagues={filters.leagues}
        league={league}
        onLeagueChange={setLeague}
      />

      <div className="space-y-4 p-3 sm:p-4">
        {events.loading ? <MarketBoardSkeleton /> : null}

        {events.error ? (
          <div className="rounded-[10px] border border-red-400/20 bg-red-400/5 px-5 py-12 text-center">
            <p className="text-[13px] font-bold text-white/75">Markets could not be loaded.</p>
            <button
              type="button"
              onClick={() => void events.refetch()}
              className="mt-4 cursor-pointer rounded-[7px] bg-white/10 px-4 py-2 text-[11px] font-bold text-white hover:bg-white/15"
            >
              Try again
            </button>
          </div>
        ) : null}

        {!events.loading && !events.error && groups.length === 0 ? (
          <div className="rounded-[10px] border border-white/8 bg-white/[0.025] px-5 py-14 text-center">
            <p className="text-[13px] font-bold text-white/70">No matching games right now.</p>
            <p className="mt-2 text-[11px] text-white/38">Change the date or league filter.</p>
          </div>
        ) : null}

        {groups.map((group) => (
          <LeagueSection
            key={group.slug || group.name}
            group={group}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onRemoveSelection={onRemoveSelection}
            activeSportsNav={activeSportsNav}
          />
        ))}

        {events.hasMore ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <button
              type="button"
              onClick={() => void events.loadMore()}
              disabled={events.loadingMore}
              className="min-w-40 cursor-pointer rounded-[8px] border border-white/10 bg-[#242429] px-5 py-2.5 text-[11px] font-extrabold tracking-[0.04em] text-white transition-colors hover:bg-[#303036] disabled:cursor-wait disabled:opacity-55"
            >
              {events.loadingMore ? "Loading games..." : "Load more games"}
            </button>
            {events.loadMoreError ? (
              <p className="text-[10px] font-semibold text-red-300/80">
                More games could not be loaded. Try again.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
