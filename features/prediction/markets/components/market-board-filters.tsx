import type { ComboLeague } from "../api";
import type { MarketWindow } from "../presenter";

interface MarketBoardFiltersProps {
  window: MarketWindow;
  onWindowChange: (window: MarketWindow) => void;
  leagues: ComboLeague[];
  league: string;
  onLeagueChange: (league: string) => void;
}

export function MarketBoardFilters({
  window,
  onWindowChange,
  leagues,
  league,
  onLeagueChange,
}: MarketBoardFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/8 bg-[#0d0d0f] px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex rounded-[8px] border border-white/9 bg-black p-1">
        {(["today", "upcoming"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onWindowChange(value)}
            className={`h-8 cursor-pointer rounded-[6px] px-3 text-[11px] font-bold transition-colors ${
              window === value
                ? "bg-[#b9b9bf] text-black"
                : "text-white/45 hover:bg-white/5 hover:text-white/75"
            }`}
          >
            {value === "today" ? "Today Games" : "Upcoming Games"}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 gap-2 sm:justify-end">
        <label className="min-w-0 flex-1 sm:max-w-[240px]">
          <span className="sr-only">League</span>
          <select
            value={league}
            onChange={(event) => onLeagueChange(event.target.value)}
            className="h-10 w-full rounded-[8px] border border-white/9 bg-[#1d1d21] px-3 text-[12px] font-semibold text-white/72 outline-none focus:border-white/25"
          >
            <option value="">Top leagues</option>
            {leagues.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
