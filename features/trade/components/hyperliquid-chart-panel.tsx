"use client";

import { useEffect, useState } from "react";
import { TradingViewChart } from "@/components/ui/tradingview-chart";
import { ExpandIcon, CollapseIcon } from "@/components/ui/icons";
import { tradingViewSymbolForAsset } from "@/features/trade/lib/hyperliquid-tradingview";

interface HyperliquidChartPanelProps {
  /** Raw asset symbol, e.g. "BTC" — empty until a market is selected. */
  assetSymbol: string;
}

const CHART_HEIGHT = 520;

// The chart card, plus its own fullscreen toggle (top-right, same corner as
// Hyperliquid's own chart toolbar) — Escape exits, same as any native
// fullscreen surface. This is local UI state, not the browser Fullscreen
// API: it expands OUR card to cover the viewport, it can't reach into the
// TradingView iframe's own internal chrome.
export function HyperliquidChartPanel({ assetSymbol }: HyperliquidChartPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-black p-4"
          : "ws-card relative p-4 sm:p-5"
      }
    >
      <button
        onClick={() => setFullscreen((value) => !value)}
        aria-label={fullscreen ? "Exit fullscreen" : "Expand chart"}
        className="absolute top-3 right-3 z-10 cursor-pointer rounded-lg border border-white/10 bg-black/40 p-1.5 text-white/55 transition-colors hover:border-white/25 hover:text-white"
      >
        {fullscreen ? <CollapseIcon size={14} /> : <ExpandIcon size={14} />}
      </button>
      <div className={fullscreen ? "min-h-0 flex-1" : undefined}>
        {assetSymbol ? (
          <TradingViewChart
            symbol={tradingViewSymbolForAsset(assetSymbol)}
            height={fullscreen ? "100%" : CHART_HEIGHT}
          />
        ) : (
          <div
            style={{ height: fullscreen ? "100%" : CHART_HEIGHT }}
            className="grid place-items-center text-[13.5px] font-normal text-white/45"
          >
            No market selected
          </div>
        )}
      </div>
    </div>
  );
}
