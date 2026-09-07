import { useTranslations } from "next-intl";
import type { Prediction } from "@/lib/types";

interface PredictionCardProps {
  prediction: Prediction;
  onBuy: (yes: boolean) => void;
}

// The Market design's desktop prediction card (Figma node 173:43958): a
// gradient panel with a dark header carrying the market's artwork and question,
// the outcome as green/red Yes-No pills, and a footer of trades, volume and the
// standing. This deployment's markets are binary (one Yes/No), so the design's
// per-outcome rows collapse to a single row here; the pills keep the onBuy
// wiring the grid passes in.
export function PredictionCard({ prediction: p, onBuy }: PredictionCardProps) {
  const t = useTranslations("prediction");

  return (
    <div className="flex h-full flex-col justify-center gap-6 overflow-hidden rounded-[17px] border-[1.975px] border-[#767474] bg-gradient-to-b from-[#292929] to-[#111] pb-3.5">
      {/* Header: the market artwork and its question. */}
      <div className="flex w-full items-end gap-3.5 rounded-t-[15px] bg-black/40 p-3.5">
        <div className="size-[45px] shrink-0 overflow-hidden rounded-full bg-white/8">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt="" loading="lazy" className="size-full object-cover" />
          ) : null}
        </div>
        <p className="ws-display line-clamp-2 text-[15px] leading-[1.2] font-semibold tracking-[-0.45px] text-[#e8eaed]">
          {p.q}
        </p>
      </div>

      {/* Outcome row: the current Yes price on the left, the two buy pills on
          the right, in the design's green/red. */}
      <div className="flex w-full items-center justify-between px-3.5">
        <span className="tnum text-[12px] font-semibold tracking-[-0.36px] text-[#e8eaed]">
          {p.yes} {t("yesLabel")}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBuy(true)}
            className="ws-pressable cursor-pointer rounded-[9px] border-[0.988px] border-[#34ca5b]/15 bg-[#34ca5b]/10 px-3.5 py-1.5 text-[12px] font-medium text-[#34ca5b]"
          >
            {t("yesLabel")}
          </button>
          <button
            onClick={() => onBuy(false)}
            className="ws-pressable cursor-pointer rounded-[9px] border-[1.121px] border-[#ed2b07]/15 bg-[#ff3a34]/20 px-3.5 py-1.5 text-[12px] font-medium text-[#ff3a34]"
          >
            {t("noLabel")}
          </button>
        </div>
      </div>

      {/* Footer: the standing and volume on the left, the category on the
          right (this data has no trade count or close date to show). */}
      <div className="flex w-full items-center justify-between px-3.5">
        <div className="flex items-center gap-6">
          <span className="tnum flex items-center gap-1 text-[10px] font-semibold text-white/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/prediction/icon-trades.svg" alt="" className="size-[13px]" />
            {p.pct}% {t("yesLabel")}
          </span>
          <span className="tnum flex items-center gap-1 text-[10px] font-semibold text-white/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/prediction/icon-volume.svg" alt="" className="size-[13px]" />
            {p.vol}
          </span>
        </div>
        <span className="text-[12px] font-semibold text-white/50">{p.tag}</span>
      </div>
    </div>
  );
}
