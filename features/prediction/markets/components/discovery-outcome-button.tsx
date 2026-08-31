import type { DiscoverySelection } from "../discovery-presenter";

interface DiscoveryOutcomeButtonProps {
  selection: DiscoverySelection | null;
  selected: boolean;
  onSelect: (selection: DiscoverySelection) => void;
}

export function DiscoveryOutcomeButton({
  selection,
  selected,
  onSelect,
}: DiscoveryOutcomeButtonProps) {
  if (!selection) {
    return (
      <span className="flex h-10 items-center justify-center rounded-[7px] border border-white/5 bg-white/[0.025] text-[11px] text-white/25">
        -
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(selection)}
      className={`pointer-events-auto relative z-10 flex h-10 min-w-0 cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-[7px] border px-3 transition-[border-color,background-color,transform] active:scale-[0.98] ${
        selected
          ? "border-white/45 bg-[linear-gradient(180deg,#d9d9dc_0%,#a8a8ae_100%)] text-black"
          : "border-white/9 bg-[#202024] text-white hover:border-white/20 hover:bg-[#29292e]"
      }`}
    >
      <span className="truncate text-[11px] font-bold">{selection.outcome}</span>
      <span className="shrink-0 text-[12px] font-extrabold tabular-nums">
        {selection.decimalOdds.toFixed(2)}
      </span>
    </button>
  );
}
