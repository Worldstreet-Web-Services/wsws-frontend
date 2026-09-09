"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownIcon, ChartBarsIcon } from "@/components/ui/icons";

// The market-metrics disclosure on the memecoin desk (Figma 173:45712, the
// expanded state of the meme main screen 173:45311).
//
// Presentational only. It fetches nothing and knows no query, so opening it
// cannot add a poll. Every figure arrives already formatted: this layer never
// turns a market cap, a volume or a liquidity figure back into a number, which
// is the app's rule for anything denominated in money. The caller applies
// compactUsd (lib/meme/api.ts) and passes the resulting string, or null.
//
// null means the service published no figure, and that is rendered as an
// explicit "Unavailable", never as a zero: a $0 market cap reads as a real,
// worthless coin.

// The design set the whole metrics block in Inter; production keeps its body
// face, Geist. The disclosure label above is Mona Sans.
const INTER = "font-sans";

export type MemeMetricDirection = "up" | "down";

export interface MemeMetricChange {
  /** Already formatted, e.g. "-3.10%". */
  display: string;
  /** Decided by the caller, so this layer never parses the string back. */
  direction: MemeMetricDirection;
}

export interface MemeMetricValue {
  /** Already formatted, e.g. "$84.2M". null when the service publishes none. */
  display: string | null;
  /** The 24h move on this figure, where the caller has one to show. */
  change?: MemeMetricChange | null;
}

export interface MemeTraderSplit {
  /** Already formatted counts, e.g. "1,245". */
  buyers: string;
  sellers: string;
  /** The buyers' share of the split, 0 to 100. Sizes the bar and the legend. */
  buyerSharePercent: number;
}

export interface MemeMarketMetricsData {
  marketCap: MemeMetricValue;
  volume24h: MemeMetricValue;
  liquidity: MemeMetricValue;
  /** Whole days since the pair listed. null when the service publishes none. */
  ageDays: number | null;
  /** null when the service publishes no buy/sell split. */
  traders: MemeTraderSplit | null;
}

export type MemeMarketMetricsStatus = "loading" | "error" | "ready";

export interface MemeMarketMetricsProps {
  /** Owned by the parent: the board decides which of its panels is open. */
  expanded: boolean;
  onToggle: (next: boolean) => void;
  status?: MemeMarketMetricsStatus;
  /** null with status "ready" means the coin has no metrics to show. */
  metrics: MemeMarketMetricsData | null;
  onRetry?: () => void;
  className?: string;
  /**
   * Whether to draw the disclosure trigger. The desktop board already carries a
   * "View Market Metrics" row in its own rail, so rendering ours there would
   * show two identical triggers for one disclosure. A parent that supplies its
   * own passes false, and passes `panelId` so its trigger's aria-controls
   * resolves to the panel this component owns.
   */
  showTrigger?: boolean;
  panelId?: string;
}

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

function clampShare(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

function Unavailable({ label }: { label: string }) {
  return <span className={`${INTER} text-[13px] font-medium text-white/35`}>{label}</span>;
}

interface StatItemProps {
  label: string;
  /** Already formatted. null or blank renders the unavailable treatment. */
  value: string | null;
  change?: MemeMetricChange | null;
  unavailableLabel: string;
}

function StatItem({ label, value, change, unavailableLabel }: StatItemProps) {
  const missing = isBlank(value);
  return (
    <div
      data-metric={label}
      data-unavailable={missing ? "true" : "false"}
      className="border-rule bg-grey-800 flex min-h-[73px] flex-1 flex-col justify-center gap-1 rounded-xl border p-[13px]"
    >
      <span
        data-testid="meme-metric-label"
        className={`${INTER} text-[12px] font-medium text-white/30`}
      >
        {label}
      </span>
      {missing ? (
        <Unavailable label={unavailableLabel} />
      ) : (
        <span className={`${INTER} tnum text-[15px] font-bold text-white`}>{value}</span>
      )}
      {change ? (
        <span
          className={`${INTER} tnum text-[11px] font-semibold ${
            change.direction === "down" ? "text-down" : "text-up"
          }`}
        >
          {change.display}
        </span>
      ) : null}
    </div>
  );
}

interface TradersCardProps {
  traders: MemeTraderSplit | null;
  unavailableLabel: string;
  headingLabel: string;
  buyersLabel: string;
  sellersLabel: string;
}

function TradersCard({
  traders,
  unavailableLabel,
  headingLabel,
  buyersLabel,
  sellersLabel,
}: TradersCardProps) {
  const share = traders ? clampShare(traders.buyerSharePercent) : 0;
  return (
    <div
      data-testid="meme-traders-card"
      data-unavailable={traders ? "false" : "true"}
      className="border-rule bg-grey-800 rounded-card flex flex-col gap-[11px] border p-[15px]"
    >
      <div className="flex items-center justify-between">
        <span
          className={`${INTER} text-[12px] font-bold tracking-[0.02em] text-white/50 uppercase`}
        >
          {headingLabel}
        </span>
        {/* The design draws a chevron here. No second disclosure is specified
            for this card, so it stays a glyph rather than a dead control. */}
        <span aria-hidden className="flex items-center text-white/40">
          <ArrowDownIcon size={17} />
        </span>
      </div>

      {traders ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[2px]">
              <span className={`${INTER} text-[11px] font-normal text-white/30`}>
                {buyersLabel}
              </span>
              <span className={`${INTER} tnum text-buy text-[13px] font-bold`}>
                {traders.buyers}
              </span>
            </div>
            <span className={`${INTER} tnum text-[12px] font-semibold text-white/50`}>
              {`${share.toFixed(1)}% / ${(100 - share).toFixed(1)}%`}
            </span>
            <div className="flex flex-col items-end gap-[2px]">
              <span className={`${INTER} text-[11px] font-normal text-white/30`}>
                {sellersLabel}
              </span>
              <span className={`${INTER} tnum text-sell text-[13px] font-bold`}>
                {traders.sellers}
              </span>
            </div>
          </div>
          <div className="flex h-[7.5px] overflow-hidden rounded-full">
            <div
              data-testid="meme-trader-buy-share"
              className="bg-buy h-full"
              style={{ width: `${share}%` }}
            />
            <div className="bg-sell h-full flex-1" />
          </div>
        </>
      ) : (
        <Unavailable label={unavailableLabel} />
      )}
    </div>
  );
}

export function MemeMarketMetrics({
  expanded,
  onToggle,
  status = "ready",
  metrics,
  onRetry,
  className = "",
  showTrigger = true,
  panelId: panelIdProp,
}: MemeMarketMetricsProps) {
  const t = useTranslations("meme");
  const generatedId = `meme-market-metrics-${useId()}`;
  const panelId = panelIdProp ?? generatedId;
  const unavailableLabel = t("metricUnavailable");

  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      {showTrigger ? (
        <button
          type="button"
          onClick={() => onToggle(!expanded)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex w-fit items-center gap-2 text-white"
        >
          <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-white" />
          <ChartBarsIcon size={14} className="shrink-0" />
          <span className="font-serif text-[12.6px] font-semibold tracking-[-0.02em]">
            {expanded ? t("metricsHide") : t("metricsShow")}
          </span>
          <ArrowDownIcon size={17} className={`shrink-0 ${expanded ? "rotate-180" : ""}`} />
        </button>
      ) : null}

      <div
        id={panelId}
        hidden={!expanded}
        // A named group, not a landmark: the trade panel already carries
        // enough regions without each disclosure adding one.
        role="group"
        aria-label={t("metricsRegion")}
        className="flex flex-col gap-3"
      >
        {status === "loading" ? (
          <div role="status" aria-live="polite" className="flex flex-col gap-3">
            <span className="sr-only">{t("metricsLoading")}</span>
            <div className="flex gap-3">
              <div className="bg-grey-800 h-[73px] flex-1 animate-pulse rounded-xl" />
              <div className="bg-grey-800 h-[73px] flex-1 animate-pulse rounded-xl" />
            </div>
            <div className="flex gap-3">
              <div className="bg-grey-800 h-[73px] flex-1 animate-pulse rounded-xl" />
              <div className="bg-grey-800 h-[73px] flex-1 animate-pulse rounded-xl" />
            </div>
            <div className="bg-grey-800 rounded-card h-[110px] animate-pulse" />
          </div>
        ) : status === "error" ? (
          <div
            role="alert"
            className="border-rule bg-grey-800 rounded-card flex flex-col items-start gap-2 border p-[15px]"
          >
            <span className={`${INTER} text-[13px] font-medium text-white/70`}>
              {t("metricsError")}
            </span>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="border-hairline bg-surface rounded-full border px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                {t("metricsRetry")}
              </button>
            ) : null}
          </div>
        ) : metrics === null ? (
          <div className="border-rule bg-grey-800 rounded-card border p-[15px]">
            <span className={`${INTER} text-[13px] font-medium text-white/45`}>
              {t("metricsEmpty")}
            </span>
          </div>
        ) : (
          <>
            <div className="flex gap-3">
              <StatItem
                label={t("metricMarketCap")}
                value={metrics.marketCap.display}
                change={metrics.marketCap.change}
                unavailableLabel={unavailableLabel}
              />
              <StatItem
                label={t("metricVolume24h")}
                value={metrics.volume24h.display}
                change={metrics.volume24h.change}
                unavailableLabel={unavailableLabel}
              />
            </div>
            <div className="flex gap-3">
              <StatItem
                label={t("metricLiquidity")}
                value={metrics.liquidity.display}
                change={metrics.liquidity.change}
                unavailableLabel={unavailableLabel}
              />
              <StatItem
                label={t("metricAge")}
                // Days are a count, not money, so the plural message does the
                // formatting. null stays null so the item reads Unavailable
                // rather than "0 days".
                value={
                  metrics.ageDays === null ? null : t("metricAgeDays", { days: metrics.ageDays })
                }
                unavailableLabel={unavailableLabel}
              />
            </div>
            <TradersCard
              traders={metrics.traders}
              unavailableLabel={unavailableLabel}
              headingLabel={t("metricActiveTraders")}
              buyersLabel={t("metricBuyers")}
              sellersLabel={t("metricSellers")}
            />
          </>
        )}
      </div>
    </section>
  );
}
