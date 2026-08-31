import type { ComboSport } from "../api";
import type { ComboSportSource } from "../sport-navigation";

interface ProviderSportTabsProps {
  options: readonly ComboSportSource[];
  sport: ComboSport;
  onChange: (sport: ComboSport) => void;
}

export function ProviderSportTabs({ options, sport, onChange }: ProviderSportTabsProps) {
  if (options.length < 2) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-white/8 bg-[#09090b] px-4 py-3">
      {options.map((option) => (
        <button
          key={option.sport}
          type="button"
          onClick={() => onChange(option.sport)}
          className={`h-8 shrink-0 cursor-pointer rounded-[7px] px-3 text-[11px] font-bold transition-colors ${
            sport === option.sport
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
