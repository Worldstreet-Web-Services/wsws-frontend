import type { BoardSelection } from "../presenter";

interface OddsButtonProps {
  selection: BoardSelection | null;
  selected: boolean;
  onSelect: (selection: BoardSelection) => void;
}

export function OddsButton({ selection, selected, onSelect }: OddsButtonProps) {
  if (!selection) {
    return (
      <span className="flex h-11 items-center justify-center rounded-[7px] border border-white/5 bg-white/[0.025] text-[12px] text-white/25">
        -
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${selection.label} at ${selection.decimalOdds.toFixed(2)}`}
      aria-pressed={selected}
      onClick={() => onSelect(selection)}
      className={`flex h-11 min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-[7px] border px-1 text-center transition-[border-color,background-color,transform] active:scale-[0.98] ${
        selected
          ? "border-white/45 bg-[linear-gradient(180deg,#d9d9dc_0%,#a8a8ae_100%)] text-black"
          : "border-white/9 bg-[#202024] text-white hover:border-white/20 hover:bg-[#29292e]"
      }`}
    >
      <span className="max-w-full truncate text-[13px] font-extrabold tabular-nums">
        {selection.decimalOdds.toFixed(2)}
      </span>
    </button>
  );
}
