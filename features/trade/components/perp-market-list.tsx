"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { AssetIcon } from "@/components/ui/asset-icon";
import { ListPagination } from "@/components/ui/list-pagination";
import { usePaged } from "@/hooks/use-paged";
import { useHyperliquidTrading } from "@/features/trade/hooks/use-hyperliquid-trading";
import { useHyperliquidMarketContexts } from "@/features/trade/hooks/use-hyperliquid-market-contexts";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";
import {
  hlPairLabel,
  type HlAsset,
  type HlMarketContext,
} from "@/features/trade/lib/hyperliquid-types";

export interface PerpMarketListProps {
  /** A row was tapped; the caller opens that symbol's ticket. This component
   *  holds no selection state of its own — see perps-section.tsx. */
  onSelect: (symbol: string) => void;
  /**
   * Rows per page. The embedded phone host measures this from the list box so
   * the list fills the device (see perps-section.tsx). Omitted elsewhere, where
   * usePaged's own default applies.
   */
  pageSize?: number;
}

interface MarketRow {
  symbol: string;
  price: number;
  changePct: number | null;
  // Sort key only, never rendered: matches Hyperliquid's own "busiest first"
  // default hyperliquid-asset-picker.tsx already sorts by, so the two lists
  // agree on order.
  volumeUsd: number | null;
}

// A figure the venue did not publish arrives as "" or something unparseable,
// and Number("") is 0 — which would print a price or a move the venue never
// quoted. Only a real, finite number counts; everything else is null, and the
// row draws its honest dash instead of a fabricated zero.
//
// Duplicated from hyperliquid-asset-picker.tsx rather than shared: that file
// is owned by another change landing this same round, so extracting a shared
// helper out of it here is not safe to do.
function publishedNumber(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

// The same join hyperliquid-asset-picker.tsx runs: an asset's price and 24h
// move come from its market context when one has arrived (the venue's own
// mark and previous-day price), falling back to the live mid from
// useHyperliquidPrices only while no context exists yet. One way to build
// this row, used by both places in the app that build it.
function buildRows(
  assets: HlAsset[],
  prices: Record<string, string>,
  contexts: HlMarketContext[]
): MarketRow[] {
  const contextBySymbol = new Map<string, HlMarketContext>();
  for (const ctx of contexts) contextBySymbol.set(ctx.symbol, ctx);

  const rows = assets.map((asset): MarketRow => {
    const ctx = contextBySymbol.get(asset.symbol);
    const price =
      (ctx ? publishedNumber(ctx.markPrice) : publishedNumber(prices[asset.symbol])) ?? 0;
    const prevDayPrice = ctx ? publishedNumber(ctx.prevDayPrice) : null;
    const changePct =
      prevDayPrice != null && prevDayPrice > 0 && price > 0
        ? ((price - prevDayPrice) / prevDayPrice) * 100
        : null;
    return {
      symbol: asset.symbol,
      price,
      changePct,
      volumeUsd: ctx ? publishedNumber(ctx.dayVolumeUsd) : null,
    };
  });

  return rows.sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0));
}

function changeLabel(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// The perp market list the embedded (phone Market tab) host shows before the
// trading ticket: a paginated, busiest-first table of every tradable perp.
// Row height and avatar are sized to match the Spot tab's own list
// (mobile-market-view.tsx), so the Market page's three lists read as one
// system rather than three.
//
// Data comes straight from useHyperliquidTrading (assets, prices) and
// useHyperliquidMarketContexts (24h move, volume), the same two hooks and the
// same gating on trading.authenticated that hyperliquid-pro-perps.tsx already
// uses for this pair — this file does not invent a second way to fetch or
// join them.
export function PerpMarketList({ onSelect, pageSize }: PerpMarketListProps) {
  const t = useTranslations("perps");
  const tCommon = useTranslations("common");
  const trading = useHyperliquidTrading();
  const { contexts, loading: contextsLoading } = useHyperliquidMarketContexts(
    trading.authenticated
  );
  const queryClient = useQueryClient();

  const rows = useMemo(
    () => buildRows(trading.assets, trading.prices, contexts),
    [trading.assets, trading.prices, contexts]
  );

  const paged = usePaged(rows, pageSize);

  // Neither hook this list depends on surfaces a query error, only a loading
  // flag (see use-hyperliquid-markets.ts and use-hyperliquid-market-contexts.ts).
  // An empty result once loading has finished is the only failure signal
  // available here, so it is treated as one: retry invalidates the exact
  // queries those hooks own, by their own query keys, rather than this file
  // standing up a second way to fetch the same data.
  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["hl-assets"] });
    void queryClient.invalidateQueries({ queryKey: ["hl-prices"] });
    void queryClient.invalidateQueries({ queryKey: ["hl-market-contexts"] });
  }, [queryClient]);

  const loading = (trading.assetsLoading || contextsLoading) && rows.length === 0;

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col">
        <span className="sr-only">{t("loadingMarkets")}</span>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex h-[60px] items-center gap-3 px-1">
            <span className="size-9 shrink-0 animate-pulse rounded-[10px] bg-white/8" />
            <span className="h-4 w-24 animate-pulse rounded bg-white/8" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-1 py-10 text-center">
        <p className="text-[13px] font-normal text-white/45">{t("marketsLoadWhenConnected")}</p>
        <button
          type="button"
          onClick={retry}
          className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 px-5 font-sans text-[12.5px] font-semibold text-white transition-colors hover:border-white/35"
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {paged.pageItems.map((row) => {
        const changeTone =
          row.changePct == null ? "text-white/40" : row.changePct >= 0 ? "text-up" : "text-down";
        return (
          <button
            key={row.symbol}
            type="button"
            onClick={() => onSelect(row.symbol)}
            className="flex h-[60px] w-full items-center gap-3 border-b border-white/6 px-1 text-left transition-colors active:bg-white/5"
          >
            <span className="shrink-0 overflow-hidden rounded-[10px]">
              <AssetIcon sym={row.symbol} bg={tokenBg(row.symbol)} fallback="gradient" size={36} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-[14px] font-semibold text-white">
                {hlPairLabel(row.symbol)}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="tnum block font-serif text-[13.5px] font-semibold text-white">
                {row.price > 0 ? formatUsd(row.price) : "—"}
              </span>
              <span className={`tnum block text-[12px] font-semibold ${changeTone}`}>
                {row.changePct != null ? changeLabel(row.changePct) : "—"}
              </span>
            </span>
          </button>
        );
      })}

      {/* Visible pager text lives inside ListPagination; this is the live
          region that actually announces a page change to a screen reader. */}
      <p aria-live="polite" className="sr-only">
        {tCommon("pageOf", { page: paged.page + 1, pages: paged.pageCount })}
      </p>
      <ListPagination
        page={paged.page + 1}
        pages={paged.pageCount}
        onPage={(target) => (target > paged.page + 1 ? paged.goNext() : paged.goPrev())}
      />
    </div>
  );
}
