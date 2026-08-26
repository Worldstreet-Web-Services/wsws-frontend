import type { DiscoveryMarketSort } from "../api";

const SORT_OPTIONS: Array<{ value: DiscoveryMarketSort; label: string }> = [
  { value: "volume_24h", label: "Trending" },
  { value: "volume", label: "Popular" },
  { value: "liquidity", label: "Liquid" },
  { value: "newest", label: "New" },
  { value: "ending_soon", label: "Ending Soon" },
];

interface DiscoverySortTabsProps {
  value: DiscoveryMarketSort;
  onChange: (value: DiscoveryMarketSort) => void;
}

export function DiscoverySortTabs({ value, onChange }: DiscoverySortTabsProps) {
  return (
    <div className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto border-b border-white/8 bg-[#0d0d0f] px-4 py-3 [&::-webkit-scrollbar]:hidden">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-8 shrink-0 cursor-pointer rounded-[7px] px-3 text-[11px] font-bold transition-colors ${
            value === option.value
              ? "bg-[#b9b9bf] text-black"
              : "border border-white/8 bg-white/[0.035] text-white/50 hover:bg-white/[0.07] hover:text-white/80"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
