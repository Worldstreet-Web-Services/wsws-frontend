"use client";

import { useTranslations } from "next-intl";
import { AssetIcon } from "@/components/ui/asset-icon";
import { tokenBg } from "@/lib/trade/assets";
import { ArrowUpRightIcon, CheckIcon, CloseIcon } from "@/components/ui/icons";
import { fromBaseUnits } from "@/lib/trade/math";
import { networkLabel, sweepTxUrl } from "@/features/migrate/lib/labels";
import { sweepCounts, type SweepItem } from "@/features/migrate/lib/progress";

interface SweepProgressProps {
  items: SweepItem[];
  running: boolean;
  onRetry: () => void;
  onBackToDashboard: () => void;
}

function StatusBadge({ item }: { item: SweepItem }) {
  const t = useTranslations("migrate");
  if (item.status === "done") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] text-emerald-400">
        <CheckIcon size={14} /> {t("statusDone")}
      </span>
    );
  }
  if (item.status === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] text-red-400">
        <CloseIcon size={14} /> {t("statusFailed")}
      </span>
    );
  }
  if (item.status === "active") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] text-white/70">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/70" /> {t("statusSending")}
      </span>
    );
  }
  return <span className="text-[12.5px] text-white/35">{t("statusPending")}</span>;
}

// Step three: one row per asset while the sweep runs, then the summary with a
// retry for anything that failed.
export function SweepProgress({ items, running, onRetry, onBackToDashboard }: SweepProgressProps) {
  const t = useTranslations("migrate");
  const counts = sweepCounts(items);
  const finished = !running && counts.done + counts.failed === counts.total;

  return (
    <div className="flex flex-col gap-4">
      <div className="ws-card px-6 py-5">
        <div className="ws-display text-[20px]">
          {running
            ? t("sweepingTitle")
            : counts.failed > 0
              ? t("doneWithFailuresTitle")
              : t("doneTitle")}
        </div>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-white/55">
          {running
            ? t("sweepingBody")
            : counts.failed > 0
              ? t("doneWithFailuresBody", { failed: counts.failed })
              : t("doneBody")}
        </p>
      </div>

      <div className="ws-card px-6 py-5">
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <AssetIcon sym={item.symbol} bg={tokenBg(item.symbol)} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium">
                  {fromBaseUnits(item.amount, item.decimals)} {item.symbol}
                </span>
                <span className="block text-[12.5px] text-white/45">
                  {networkLabel(item.network)}
                  {item.status === "failed" && item.error ? ` · ${item.error}` : null}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <StatusBadge item={item} />
                {item.txHash && sweepTxUrl(item.network, item.txHash) ? (
                  <a
                    href={sweepTxUrl(item.network, item.txHash)!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/45 hover:text-white"
                    aria-label={t("viewTransaction")}
                  >
                    <ArrowUpRightIcon size={15} />
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {finished ? (
        <div className="flex flex-col gap-3">
          {counts.failed > 0 ? (
            <button
              onClick={onRetry}
              className="h-13 w-full cursor-pointer rounded-[14px] bg-white text-[15px] font-medium text-black transition-opacity hover:opacity-90"
            >
              {t("retryFailed", { failed: counts.failed })}
            </button>
          ) : null}
          <button
            onClick={onBackToDashboard}
            className="h-13 w-full cursor-pointer rounded-[14px] border border-white/14 bg-white/8 text-[15px] font-medium transition-colors hover:border-white/30"
          >
            {t("backToDashboard")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
