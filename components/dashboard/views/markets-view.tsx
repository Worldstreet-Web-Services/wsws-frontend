"use client";

import { useMemo, useState } from "react";
import { AssetIcon } from "@/components/ui/asset-icon";
import { AssetChart } from "@/components/ui/asset-chart";
import { SearchIcon } from "@/components/ui/icons";
import { TradingViewChart } from "@/components/ui/tradingview-chart";
import { FlashPrice } from "@/components/dashboard/trade/flash-price";
import { SpotPanel } from "@/components/dashboard/trade/spot-panel";
import { useMarketTokens } from "@/hooks/use-market-tokens";
import { useBuyDestinations } from "@/hooks/use-buy-catalog";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePrices } from "@/hooks/use-prices";
import { useCoingeckoId } from "@/hooks/use-coingecko-id";
import { buyableLogos, buyableSymbols, defaultRouteForSymbol } from "@/lib/buy";
import { formatUsd } from "@/lib/trade/math";
import { coingeckoId, coingeckoPlatform } from "@/lib/coingecko";
import { isSpotStable, spotChartSource } from "@/lib/spot-chart";
import type { MarketToken } from "@/lib/market-catalog";
import type { TokenBalance } from "@/lib/server/alchemy";

const ICON_BG = "linear-gradient(135deg,#A78BFA,#6d5bd0)";

// A spot market, driven by the Dextopus buyable catalog and enriched with market
// data where we have it.
interface SpotMarket {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  logo: string | null;
  // Real CoinGecko id when the asset is in the market feed, else null (no id
  // means we chart via TradingView or not at all).
  coingeckoId: string | null;
  marketCap: number;
}

function changeLabel(chg: number): string {
  const v = Number.isFinite(chg) ? chg : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

// The spot markets terminal. The tradable list is the set of tokens Dextopus can
// actually deliver (its buyable destinations), so every market shown here can be
// executed. Prices come from the app's by-symbol price feed (which covers the
// whole set, not just the top coins); logos, 24h change and the chart id are
// enriched from the market feed when present. Renders as a bare body; the trade
// hub provides the header and tabs.
export function MarketsView() {
  const destinations = useBuyDestinations();
  const { data: feed = [] } = useMarketTokens("popular");
  const portfolio = usePortfolio();

  const [selected, setSelected] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Buyable display tickers from the Dextopus catalog, with stablecoins and the
  // USDC quote removed (trading them against USDC is meaningless).
  const buyableSyms = useMemo(() => {
    if (!destinations.data) return [];
    return [...buyableSymbols(destinations.data)].filter((s) => !isSpotStable(s));
  }, [destinations.data]);

  // One by-symbol price request for the whole buyable set.
  const prices = usePrices(buyableSyms);

  // Dextopus token icons, so markets outside the price feed still show a logo.
  const dextopusLogos = useMemo(
    () => (destinations.data ? buyableLogos(destinations.data) : new Map<string, string>()),
    [destinations.data]
  );

  // Market-feed rows keyed by ticker, for enrichment.
  const feedBySym = useMemo(() => {
    const m = new Map<string, MarketToken>();
    for (const t of feed) m.set(t.symbol.toUpperCase(), t);
    return m;
  }, [feed]);

  const markets: SpotMarket[] = useMemo(() => {
    const rows = buyableSyms.map((sym) => {
      const f = feedBySym.get(sym.toUpperCase());
      return {
        symbol: sym,
        name: f?.name ?? sym,
        priceUsd: prices[sym] ?? f?.priceUsd ?? 0,
        change24h: f?.change24h ?? 0,
        // CoinGecko logo for the majors, Dextopus's own icon for everything else.
        logo: f?.logo ?? dextopusLogos.get(sym) ?? null,
        coingeckoId: f?.id ?? null,
        marketCap: f?.marketCap ?? 0,
      };
    });
    // Best-known assets first (market cap), then the rest alphabetically.
    return rows.sort((a, b) => b.marketCap - a.marketCap || a.symbol.localeCompare(b.symbol));
  }, [buyableSyms, feedBySym, prices, dextopusLogos]);

  // The tradable list comes from the Dextopus catalog, so its load/error state
  // drives the terminal; the market feed is enrichment only (logos, charts).
  const loading = destinations.isLoading;
  const marketsError = destinations.isError;

  const token: SpotMarket | null = markets.find((t) => t.symbol === selected) ?? markets[0] ?? null;
  const base = token?.symbol ?? "";
  const mark = token?.priceUsd ?? 0;

  // The USDC a buy spends from, on Base.
  const usdcBalance =
    portfolio.tokens.find((t) => t.network === "base-mainnet" && t.symbol.toUpperCase() === "USDC")
      ?.balance ?? 0;

  // The held position a sell draws from: the largest balance in this symbol
  // across chains, so selling sends from where the user actually holds it.
  const heldToken: TokenBalance | null = useMemo(() => {
    if (!base) return null;
    const owned = portfolio.tokens.filter((t) => t.symbol.toUpperCase() === base.toUpperCase());
    if (owned.length === 0) return null;
    return owned.reduce((best, t) => (t.balance > best.balance ? t : best));
  }, [portfolio.tokens, base]);
  const heldBalance = heldToken?.balance ?? 0;

  // Every listed market is buyable by construction, so this resolves a route.
  const buyRoute = useMemo(
    () => (token ? defaultRouteForSymbol(destinations.data ?? [], token.symbol) : null),
    [destinations.data, token]
  );

  // Chart source. TradingView for the majors it carries, otherwise our CoinGecko
  // candle chart, which needs a coin id. The id comes from the market feed, the
  // static major map, or (for everything else) is resolved from the token's
  // contract address so long-tail buyable markets still chart.
  const chart = token ? spotChartSource(token.symbol) : null;
  const knownId = token ? (token.coingeckoId ?? coingeckoId(token.symbol)) : null;
  const needsResolve = token != null && !knownId && chart?.kind === "coingecko";
  const resolvePlatform = needsResolve && buyRoute ? coingeckoPlatform(buyRoute.chainName) : null;
  const resolveAddress = needsResolve && buyRoute ? buyRoute.asset : null;
  const resolved = useCoingeckoId(resolvePlatform, resolveAddress);
  const chartId = knownId ?? resolved.id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [markets, search]);

  const pick = (t: SpotMarket) => {
    setSelected(t.symbol);
    setPickerOpen(false);
    setSearch("");
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 min-[980px]:grid-cols-[minmax(0,420px)_1fr]">
      <SpotPanel
        token={token}
        mark={mark}
        usdcBalance={usdcBalance}
        heldToken={heldToken}
        buyRoute={buyRoute}
      />

      <div className="flex flex-col gap-4">
        {/* Pair header + market picker. */}
        <div className="ws-card relative p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <AssetIcon sym={base || "?"} bg={ICON_BG} logo={token?.logo} size={34} />
            <button
              onClick={() => setPickerOpen((v) => !v)}
              disabled={markets.length === 0}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left disabled:cursor-default"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-sans text-[16px] font-semibold">
                  {token ? `${base}/USDC` : loading ? "Loading markets…" : "No markets available"}
                  {markets.length > 0 ? <span className="text-white/40">▾</span> : null}
                </div>
                <div className="truncate text-xs font-normal text-white/50">
                  {token?.name ?? "—"}
                </div>
              </div>
            </button>
            <div className="text-right">
              <FlashPrice value={mark} className="ws-display tnum block text-[19px]">
                {mark > 0 ? formatUsd(mark) : "—"}
              </FlashPrice>
              {token ? (
                <div
                  className={`tnum text-xs font-medium ${
                    token.change24h >= 0 ? "text-up" : "text-down"
                  }`}
                >
                  {changeLabel(token.change24h)}
                </div>
              ) : null}
            </div>
          </div>

          {pickerOpen ? (
            <div className="bg-panel absolute inset-x-4 top-[calc(100%-8px)] z-20 mt-1 overflow-hidden rounded-2xl border border-white/12 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-2.5">
                <SearchIcon />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search markets"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] font-normal text-white outline-none"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[13px] font-normal text-white/40">
                    No markets match.
                  </div>
                ) : (
                  filtered.slice(0, 60).map((t) => (
                    <button
                      key={t.symbol}
                      onClick={() => pick(t)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/6"
                    >
                      <AssetIcon sym={t.symbol} bg={ICON_BG} logo={t.logo} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-sans text-[13.5px] font-medium">
                          {t.symbol}/USDC
                        </div>
                        <div className="truncate text-[11.5px] font-normal text-white/45">
                          {t.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="tnum text-[13px] font-normal">
                          {t.priceUsd > 0 ? formatUsd(t.priceUsd) : "—"}
                        </div>
                        <div
                          className={`tnum text-[11px] ${
                            t.change24h >= 0 ? "text-up" : "text-down"
                          }`}
                        >
                          {changeLabel(t.change24h)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Candles: TradingView for the majors (same embed as the perps chart),
            our CoinGecko candle feed when we have an id. */}
        <div className="ws-card p-4 sm:p-5">
          {loading ? (
            <div className="h-[360px] animate-pulse rounded-xl bg-white/6" />
          ) : marketsError && !token ? (
            <div className="grid h-[360px] place-items-center text-center text-[13.5px] font-normal text-white/45">
              Markets are unavailable right now.
            </div>
          ) : !token || !chart ? (
            <div className="grid h-[360px] place-items-center text-center text-[13.5px] font-normal text-white/45">
              No market selected.
            </div>
          ) : chart.kind === "tradingview" ? (
            <TradingViewChart symbol={chart.symbol} height={360} />
          ) : chartId ? (
            <AssetChart
              coingeckoId={chartId}
              allowCandles
              defaultType="candles"
              height={324}
              up={token.change24h >= 0}
            />
          ) : resolved.loading ? (
            <div className="h-[360px] animate-pulse rounded-xl bg-white/6" />
          ) : (
            <div className="grid h-[360px] place-items-center text-center text-[13.5px] font-normal text-white/45">
              No chart for {base} yet. You can still trade it above.
            </div>
          )}
        </div>

        {/* Holding for the selected market. */}
        <div className="ws-card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[13px] font-semibold text-white/80">
              Your {base || "position"}
            </span>
            <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10.5px] font-medium text-white/40">
              Assets
            </span>
          </div>
          {heldToken && heldBalance > 0 ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <AssetIcon sym={base} bg={ICON_BG} logo={heldToken.logo} size={26} />
                <span className="tnum text-[14px] font-medium">
                  {heldBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {base}
                </span>
              </span>
              <span className="tnum text-[14px] font-semibold">
                {formatUsd(heldToken.valueUsd)}
              </span>
            </div>
          ) : (
            <div className="grid place-items-center py-8 text-center text-[13px] font-normal text-white/40">
              You don&apos;t hold any {base || "asset"} yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
