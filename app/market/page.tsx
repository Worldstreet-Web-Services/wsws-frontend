"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buildNav } from "@/components/layout/nav-items";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AssetIcon } from "@/components/ui/asset-icon";
import { MarketLogo } from "@/components/ui/market-logo";
import { PerpsIntro } from "@/features/trade";
import { MemecoinsView } from "@/features/trade/components/memecoins-view";
import { MobileSpotTrade } from "@/features/trade/components/mobile-spot-trade";
import { useSpotMarkets, type SpotMarket } from "@/features/trade/hooks/use-spot-markets";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";
import { loadInterest } from "@/lib/preferences";

// ---------------------------------------------------------------------------
// Tab bar with underline indicator
// ---------------------------------------------------------------------------
// Home is commented out at the designer's request.
const MAIN_TABS = [/* "Home", */ "Spot", "Perps", "Memecoins"] as const;
type MainTab = (typeof MAIN_TABS)[number];

function UnderlineTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly string[];
  active: string;
  onChange?: (t: string) => void;
}) {
  const idx = tabs.indexOf(active);
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange?.(tab)}
            className={`flex h-[38px] w-[101px] cursor-pointer items-center justify-center rounded-full text-[12px] font-bold ${
              active === tab ? "text-[#f4f4f4]" : "text-white/40"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="relative h-0.5 bg-white/8">
        <div
          className="absolute h-0.5 w-[101px] bg-white transition-all duration-200"
          style={{ left: idx * (101 + 8) }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function changeLabel(chg: number): string {
  const v = Number.isFinite(chg) ? chg : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Token list
// ---------------------------------------------------------------------------
function TokenList({
  markets,
  onSelect,
}: {
  markets: SpotMarket[];
  onSelect: (t: SpotMarket) => void;
}) {
  return (
    <div className="flex flex-col">
      {markets.slice(0, 10).map((token) => {
        const change = token.change24h;
        const up = change >= 0;
        return (
          <button
            key={token.symbol}
            type="button"
            onClick={() => onSelect(token)}
            className="flex cursor-pointer items-center gap-3 border-b border-white/7 px-0 py-3.5 text-left transition-colors hover:bg-white/4"
          >
            <div className="shrink-0 overflow-hidden rounded-[11px]">
              <AssetIcon
                sym={token.symbol}
                bg={tokenBg(token.symbol)}
                logo={token.logo}
                fallback="gradient"
                size={36}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-medium text-white">{token.symbol}/USDT</p>
              <p className="text-[12px] text-white/50">{token.name}</p>
            </div>
            <div className="text-right">
              <p className="tnum text-[14px] font-semibold text-white">
                {token.priceUsd > 0 ? formatUsd(token.priceUsd) : "—"}
              </p>
              <p
                className={`tnum text-[12px] font-medium ${up ? "text-[#7ce7b0]" : "text-[#f6a5a5]"}`}
              >
                {changeLabel(change)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market page
// ---------------------------------------------------------------------------
export default function MarketPage() {
  const tSections = useTranslations("sections");
  const nav = useMemo(() => buildNav(loadInterest(), tSections), [tSections]);
  const { markets } = useSpotMarkets();
  const [activeTab, setActiveTab] = useState<MainTab>("Spot");
  const [search, setSearch] = useState("");
  const [selectedToken, setSelectedToken] = useState<SpotMarket | null>(null);

  const filtered = markets.filter((m) =>
    `${m.symbol} ${m.name}`.toLowerCase().includes(search.toLowerCase())
  );

  // Tap a coin → open its Spot Trading page, which runs the sheet's real order
  // flow (buy when nothing is held, sell when there is).
  const openToken = useCallback((token: SpotMarket) => setSelectedToken(token), []);

  return (
    <AuthGuard>
      <DashboardShell nav={nav} activeSection="spot">
        <div className="mx-auto w-full max-w-md pb-28">
          {activeTab === "Perps" ? (
            // Perps has no trading surface yet, so the tab is the launch splash.
            // Skip drops back to Spot; the market chrome returns with it.
            <PerpsIntro
              onLearnMore={() => setActiveTab("Spot")}
              onSkip={() => setActiveTab("Spot")}
            />
          ) : (
            <>
              {/* MARKET wordmark */}
              <div className="flex justify-center pt-8 pb-6">
                <MarketLogo className="h-[14px] w-auto" />
              </div>

              {/* Search */}
              <div className="px-2">
                <div className="flex h-10 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5">
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="shrink-0"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth="1.8"
                    />
                    <path
                      d="m20 20-3.5-3.5"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/45"
                  />
                </div>
              </div>

              {/* Main tabs */}
              <div className="mt-3 px-2.5">
                <UnderlineTabs
                  tabs={MAIN_TABS}
                  active={activeTab}
                  onChange={(t) => setActiveTab(t as MainTab)}
                />
              </div>

              {/* Content area */}
              <div className="mt-4 px-4">
                {activeTab === "Spot" ? (
                  <TokenList markets={filtered} onSelect={openToken} />
                ) : activeTab === "Memecoins" ? (
                  <MemecoinsView />
                ) : (
                  <div className="py-20 text-center text-[13px] text-white/40">
                    {activeTab} coming soon
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardShell>

      {/* Tapping a coin opens its Spot Trading page over the list, running the
          sheet's real order flow. Switching pairs returns to the list. */}
      <MobileSpotTrade
        token={selectedToken}
        open={selectedToken !== null}
        onClose={() => setSelectedToken(null)}
        onSwitchMarket={() => setSelectedToken(null)}
      />
    </AuthGuard>
  );
}
