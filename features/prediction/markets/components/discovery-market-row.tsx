import type { DiscoveryMarketSummary } from "../api";
import {
  discoveryMarketLabel,
  discoverySelection,
  type DiscoverySelection,
} from "../discovery-presenter";
import { DiscoveryOutcomeButton } from "./discovery-outcome-button";

interface DiscoveryMarketRowProps {
  market: DiscoveryMarketSummary;
  compact: boolean;
  selectedIds: ReadonlySet<string>;
  onSelect: (selection: DiscoverySelection) => void;
}

export function DiscoveryMarketRow({
  market,
  compact,
  selectedIds,
  onSelect,
}: DiscoveryMarketRowProps) {
  const outcomes = compact
    ? market.outcomes.filter((outcome) => outcome.name.toLowerCase() === "yes").slice(0, 1)
    : market.outcomes.slice(0, 2);

  return (
    <div className="pointer-events-none relative z-[1] grid min-w-0 gap-2 border-t border-white/7 py-2.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.72fr)] sm:items-center">
      <div className="min-w-0 pr-2">
        <p className="truncate text-[12px] font-semibold text-white/74">
          {discoveryMarketLabel(market)}
        </p>
      </div>
      <div className={`grid gap-2 ${outcomes.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {outcomes.map((outcome) => {
          const selection = discoverySelection(market, outcome);
          return (
            <DiscoveryOutcomeButton
              key={outcome.name}
              selection={selection}
              selected={selection ? selectedIds.has(selection.id) : false}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
