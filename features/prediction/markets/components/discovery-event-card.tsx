import Link from "next/link";
import type { DiscoveryCategory, DiscoveryMarketEvent } from "../api";
import { closingLabel, compactUsd, eventTopic } from "../discovery-presenter";
import { discoverySlipSelection, type MarketSlipSelection } from "../bet-slip";
import { DiscoveryMarketRow } from "./discovery-market-row";

interface DiscoveryEventCardProps {
  category: DiscoveryCategory;
  event: DiscoveryMarketEvent;
  selectedIds: ReadonlySet<string>;
  onSelect: (selection: MarketSlipSelection) => void;
}

export function DiscoveryEventCard({
  category,
  event,
  selectedIds,
  onSelect,
}: DiscoveryEventCardProps) {
  const compact = event.marketCount > 1;
  const hiddenMarkets = Math.max(0, event.marketCount - event.markets.length);
  const href = `/prediction/markets/${event.id}?category=${category}`;

  return (
    <article className="relative overflow-hidden rounded-[10px] border border-white/8 bg-[#111114] transition-colors hover:border-white/14">
      <Link href={href} aria-label={`Open ${event.title}`} className="absolute inset-0 z-0" />

      <header className="pointer-events-none relative z-[1] flex gap-3 border-b border-white/7 p-3.5 sm:p-4">
        <div className="size-12 shrink-0 overflow-hidden rounded-[9px] border border-white/10 bg-[#242428]">
          {event.imageUrl || event.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl ?? event.iconUrl ?? ""}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full place-items-center text-[16px] font-black text-white/35">
              {category[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold tracking-[0.1em] text-white/35 uppercase">
                {eventTopic(event)}
              </span>
              <h2 className="mt-0.5 line-clamp-2 text-[14px] leading-[1.3] font-bold text-white/86">
                {event.title}
              </h2>
            </div>
            <span className="shrink-0 rounded-[6px] border border-white/9 bg-white/[0.045] px-2 py-1 text-[9px] font-bold text-white/45">
              {event.marketCount} {event.marketCount === 1 ? "market" : "markets"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-white/35">
            <span>{compactUsd(event.volume24h)} 24h</span>
            <span>{compactUsd(event.liquidity)} liquidity</span>
            <span>{closingLabel(event.endDate)}</span>
          </div>
        </div>
      </header>

      <div className="px-3.5 sm:px-4">
        {event.markets.map((market) => (
          <DiscoveryMarketRow
            key={market.id}
            market={market}
            compact={compact}
            selectedIds={selectedIds}
            onSelect={(selection) => onSelect(discoverySlipSelection(event, selection))}
          />
        ))}
      </div>

      <footer className="pointer-events-none relative z-[1] flex items-center justify-between border-t border-white/7 bg-black/15 px-4 py-2.5 text-[10px] font-bold text-white/38">
        <span>{hiddenMarkets > 0 ? `+${hiddenMarkets} more markets` : "View market details"}</span>
        <span aria-hidden="true">&rarr;</span>
      </footer>
    </article>
  );
}
