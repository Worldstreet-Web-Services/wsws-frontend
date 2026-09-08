"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MarketLogo } from "@/components/ui/market-logo";
import { AssetIcon } from "@/components/ui/asset-icon";
import { PerpsSection } from "@/features/trade/components/perps-section";
import { MemeCoin, PctChange, priceLabel } from "@/features/trade/components/meme-bits";
import { MemeTradeSheet } from "@/features/trade/components/meme-trade-sheet";
import { useSpotMarkets, type SpotMarket } from "@/features/trade/hooks/use-spot-markets";
import { useTrendingMemes } from "@/features/trade/hooks/use-meme-tokens";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";
import type { MemeToken } from "@/lib/meme/api";
import type { BuyPayload, DetailPayload } from "@/lib/modal-types";

interface MobileMarketViewProps {
  onOpenDetail: (detail: DetailPayload) => void;
  onOpenBuy: (buy: BuyPayload) => void;
  /**
   * The Prediction tab's content, supplied by the route. Prediction is its own
   * feature, and features never import each other, so the route composes it.
   */
  predictionSlot: ReactNode;
}

// The Market design's phone Spot page (Figma 173:42337): its own MARKET head on
// the ray fan, a search box and the market-category tabs, then the full token
// list — every asset you can buy or sell, like the desktop desk. Tapping a token
// opens its sheet (chart + buy), the same pop-up the rest of the app uses.

// Spot, Perps (Leverage Trading) and Memecoins render inline on this page
// (href null); Prediction is still its own route.
const TABS: { label: string; href: string | null }[] = [
  { label: "Spot", href: null },
  { label: "Leverage Trading", href: null },
  { label: "Memecoins", href: null },
  { label: "Prediction", href: null },
];

function changeLabel(chg: number): string {
  const v = Number.isFinite(chg) ? chg : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function compactUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)}`;
}

export function MobileMarketView({
  onOpenDetail,
  onOpenBuy,
  predictionSlot,
}: MobileMarketViewProps) {
  const router = useRouter();
  const { markets, loading, error } = useSpotMarkets();
  const [query, setQuery] = useState("");
  // Which inline category is showing: 0 Spot, 1 Perps. Memecoins/Prediction
  // navigate away instead.
  const [activeTab, setActiveTab] = useState(0);

  // A memecoin opens the trade sheet inline, the same overlay the meme board uses.
  const [meme, setMeme] = useState<MemeToken | null>(null);
  const { tokens: memes, isLoading: memeLoading, error: memeError } = useTrendingMemes();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? markets.filter((m) => `${m.symbol} ${m.name}`.toLowerCase().includes(q)) : markets;
  }, [markets, query]);

  const memeRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? memes.filter((m) => `${m.symbol ?? ""} ${m.name ?? ""}`.toLowerCase().includes(q))
      : memes;
  }, [memes, query]);

  // A token tap opens the asset sheet: its chart, and a Buy that hands off to
  // the buy flow. Same pop-up the desk and the rest of the app use.
  const openToken = (m: SpotMarket) =>
    onOpenDetail({
      sym: m.symbol,
      name: m.name,
      sub: m.symbol,
      price: m.priceUsd > 0 ? formatUsd(m.priceUsd) : "—",
      chg: changeLabel(m.change24h),
      bg: tokenBg(m.symbol),
      coingeckoId: m.coingeckoId ?? undefined,
      up: m.change24h >= 0,
      logo: m.logo,
      candlesOnly: true,
      stats: [
        { k: "Price", v: m.priceUsd > 0 ? formatUsd(m.priceUsd) : "—" },
        { k: "24h", v: changeLabel(m.change24h) },
        { k: "Market cap", v: compactUsd(m.marketCap) },
      ],
      cta: `Buy ${m.name}`,
      onCta: () =>
        onOpenBuy({ symbol: m.symbol, name: m.name, priceUsd: m.priceUsd, logo: m.logo }),
    });

  // A phone design: full-bleed on a phone, but capped to a phone-width column on
  // desktop (centered, framed) instead of stretching edge to edge.
  return (
    <div className="fixed inset-0 mx-auto flex max-w-[440px] flex-col overflow-hidden bg-[#0f0f0f] md:border-x md:border-white/8">
      {/* MARKET head on the ray fan */}
      <div className="relative flex h-[100px] shrink-0 items-end justify-center overflow-hidden bg-[#232323] bg-[url('/market/topbar-rays.svg')] bg-size-[100%_100%] bg-no-repeat pb-[22px]">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/portfolio"))}
          aria-label="Back"
          className="absolute bottom-[18px] left-5 flex size-8 cursor-pointer items-center justify-center rounded-full text-white/80 hover:text-white"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <MarketLogo className="h-3.5 w-auto" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-6">
        {/* Search — only Spot and Memecoins list a searchable set; the perps
            desk and prediction own their selection, so hide it on those tabs. */}
        {activeTab === 0 || activeTab === 2 ? (
          <div className="flex h-[51px] shrink-0 items-center gap-1 rounded-[50px] border-2 border-white/2 bg-white/5 px-6">
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="shrink-0"
            >
              <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" />
              <path
                d="m20 20-3.5-3.5"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent font-serif text-[13px] font-semibold tracking-[-0.39px] text-white outline-none placeholder:text-white/45"
            />
          </div>
        ) : null}

        {/* Category tabs */}
        <div className="mt-4 flex shrink-0 [scrollbar-width:none] gap-3 overflow-x-auto border-b border-white/8 [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                if (tab.href) {
                  router.push(tab.href);
                } else {
                  // Reset the search so a query typed on Spot does not silently
                  // filter (and blank) the Memecoins list, and vice versa.
                  setActiveTab(i);
                  setQuery("");
                }
              }}
              className="relative flex shrink-0 items-center justify-center px-2.5 py-2.5"
            >
              <span
                className={`font-serif text-[12px] font-semibold tracking-[-0.36px] whitespace-nowrap ${
                  i === activeTab ? "text-white" : "text-white/40"
                }`}
              >
                {tab.label}
              </span>
              {i === activeTab ? (
                <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-white" />
              ) : null}
            </button>
          ))}
        </div>

        {/* Perps renders its own trading view inline; Spot shows the token list. */}
        {activeTab === 1 ? (
          <div className="mt-3 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <PerpsSection />
          </div>
        ) : activeTab === 2 ? (
          <div className="-mx-1 mt-2 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {memeLoading && memeRows.length === 0
              ? [0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex h-[60px] items-center gap-3 px-1">
                    <span className="size-9 shrink-0 animate-pulse rounded-full bg-white/8" />
                    <span className="h-4 w-24 animate-pulse rounded bg-white/8" />
                  </div>
                ))
              : memeRows.map((token) => (
                  <button
                    key={token.address}
                    type="button"
                    onClick={() => setMeme(token)}
                    className="flex h-[60px] w-full items-center gap-3 border-b border-white/6 px-1 text-left transition-colors active:bg-white/5"
                  >
                    <span className="shrink-0">
                      <MemeCoin token={token} size={36} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[14px] font-semibold text-white">
                        {token.symbol ?? "?"}
                      </span>
                      <span className="block truncate text-[11.5px] font-normal text-white/50">
                        {token.name ?? "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tnum block font-serif text-[13.5px] font-semibold text-white">
                        {priceLabel(token.priceUsd)}
                      </span>
                      <span className="block text-[12px] font-semibold">
                        <PctChange value={token.priceChange24hPercent} />
                      </span>
                    </span>
                  </button>
                ))}
            {!memeLoading && (memeError || memeRows.length === 0) ? (
              <p className="mt-8 text-center text-[13px] font-normal text-white/45">
                {memeError ? "Memecoins are unavailable right now." : "No memecoins found."}
              </p>
            ) : null}
          </div>
        ) : activeTab === 3 ? (
          <div className="mt-3 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {predictionSlot}
          </div>
        ) : (
          <div className="-mx-1 mt-2 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {loading && rows.length === 0
              ? [0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex h-[60px] items-center gap-3 px-1">
                    <span className="size-9 shrink-0 animate-pulse rounded-[10px] bg-white/8" />
                    <span className="h-4 w-24 animate-pulse rounded bg-white/8" />
                  </div>
                ))
              : rows.map((m) => {
                  const up = m.change24h >= 0;
                  return (
                    <button
                      key={m.symbol}
                      type="button"
                      onClick={() => openToken(m)}
                      className="flex h-[60px] w-full items-center gap-3 border-b border-white/6 px-1 text-left transition-colors active:bg-white/5"
                    >
                      <span className="shrink-0 overflow-hidden rounded-[10px]">
                        <AssetIcon
                          sym={m.symbol}
                          bg={tokenBg(m.symbol)}
                          logo={m.logo}
                          fallback="gradient"
                          size={36}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-[14px] font-semibold text-white">
                          {m.symbol}
                        </span>
                        <span className="block truncate text-[11.5px] font-normal text-white/50">
                          {m.name}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tnum block font-serif text-[13.5px] font-semibold text-white">
                          {m.priceUsd > 0 ? formatUsd(m.priceUsd) : "—"}
                        </span>
                        <span
                          className={`tnum block text-[12px] font-semibold ${up ? "text-up" : "text-down"}`}
                        >
                          {changeLabel(m.change24h)}
                        </span>
                      </span>
                    </button>
                  );
                })}
            {!loading && rows.length === 0 ? (
              <p className="mt-8 text-center text-[13px] font-normal text-white/45">
                {error ? "Markets are unavailable right now." : "No tokens found."}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Meme trade sheet, self-rendered as an overlay */}
      {meme ? <MemeTradeSheet token={meme} onClose={() => setMeme(null)} /> : null}
    </div>
  );
}
