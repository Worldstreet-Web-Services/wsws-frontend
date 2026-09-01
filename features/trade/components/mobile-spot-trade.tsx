"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AssetChart } from "@/components/ui/asset-chart";
import { TradingViewChart } from "@/components/ui/tradingview-chart";
import { AssetIcon } from "@/components/ui/asset-icon";
import { ModalShell } from "@/components/ui/modal-shell";
import { BuySheet } from "@/features/trade/components/buy-sheet";
import { SellSheet } from "@/features/trade/components/sell-sheet";
import { MobileSpotPage } from "@/features/trade/components/mobile-spot-page";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useCoingeckoId } from "@/hooks/use-coingecko-id";
import { useSpotMarkets, type SpotMarket } from "@/features/trade/hooks/use-spot-markets";
import { defaultRouteForSymbol, holdingMatchesSymbol } from "@/lib/buy";
import { spotChartSource } from "@/lib/spot-chart";
import { coingeckoId, coingeckoPlatform } from "@/lib/coingecko";
import { formatUsd } from "@/lib/trade/math";
import { tokenBg } from "@/lib/trade/assets";
import { toast } from "@/lib/toast";
import type { TokenBalance } from "@/lib/server/alchemy";

const CHART_HEIGHT = 360;

// The mobile Spot Trading page for one market, wired to the section's real data.
//
// It resolves the chart, USDC balance, held position and route for the token,
// hands the section's real chart and the live price/balance to the page (which
// draws the comp's order layout), and points Buy/Sell at the app's existing
// order sheets. The money path is unchanged — those sheets are the same ones
// the dashboard uses.
export function MobileSpotTrade({
  token,
  open,
  onClose,
  onSwitchMarket,
}: {
  token: SpotMarket | null;
  open: boolean;
  onClose: () => void;
  onSwitchMarket?: () => void;
}) {
  const t = useTranslations("spot");
  const { destinations, loading, error: marketsError } = useSpotMarkets();
  const portfolio = usePortfolio();
  const [sheet, setSheet] = useState<"buy" | "sell" | null>(null);

  const base = token?.symbol ?? "";
  const mark = token?.priceUsd ?? 0;

  const usdcBalance =
    portfolio.tokens.find((x) => x.network === "base-mainnet" && x.symbol.toUpperCase() === "USDC")
      ?.balance ?? 0;

  const heldToken: TokenBalance | null = useMemo(() => {
    if (!base) return null;
    const owned = portfolio.tokens.filter((x) =>
      holdingMatchesSymbol(x, destinations.data ?? [], base)
    );
    if (owned.length === 0) return null;
    return owned.reduce((best, x) =>
      x.valueUsd > best.valueUsd || (x.valueUsd === best.valueUsd && x.balance > best.balance)
        ? x
        : best
    );
  }, [portfolio.tokens, destinations.data, base]);
  const heldBalance = heldToken?.balance ?? 0;

  const buyRoute = useMemo(
    () => (token ? defaultRouteForSymbol(destinations.data ?? [], token.symbol) : null),
    [destinations.data, token]
  );

  // Chart source, resolving a CoinGecko id from the token feed, the static
  // major map or the token's contract address (same order as the desk).
  const chartSource = token ? spotChartSource(token.symbol) : null;
  const knownId = token ? (token.coingeckoId ?? coingeckoId(token.symbol)) : null;
  const needsResolve = token != null && !knownId && chartSource?.kind === "coingecko";
  const resolvePlatform = needsResolve && buyRoute ? coingeckoPlatform(buyRoute.chainName) : null;
  const resolveAddress = needsResolve && buyRoute ? buyRoute.asset : null;
  const resolved = useCoingeckoId(resolvePlatform, resolveAddress);
  const chartId = knownId ?? resolved.id;

  // Same chart the sheet uses, but borderless: a clean rounded frame with no
  // card outline, per the design.
  const chartCard = (
    <div className="overflow-hidden rounded-[16px]">
      {loading ? (
        <div style={{ height: CHART_HEIGHT }} className="animate-pulse rounded-xl bg-white/6" />
      ) : marketsError && !token ? (
        <div
          style={{ height: CHART_HEIGHT }}
          className="grid place-items-center text-center text-[13.5px] font-normal text-white/45"
        >
          {t("unavailable")}
        </div>
      ) : !token || !chartSource ? (
        <div
          style={{ height: CHART_HEIGHT }}
          className="grid place-items-center text-center text-[13.5px] font-normal text-white/45"
        >
          {t("noSelection")}
        </div>
      ) : chartSource.kind === "tradingview" ? (
        <TradingViewChart symbol={chartSource.symbol} height={CHART_HEIGHT} />
      ) : chartId ? (
        <AssetChart
          coingeckoId={chartId}
          allowCandles
          defaultType="candles"
          height={CHART_HEIGHT - 36}
          up={(token?.change24h ?? 0) >= 0}
        />
      ) : resolved.loading ? (
        <div style={{ height: CHART_HEIGHT }} className="animate-pulse rounded-xl bg-white/6" />
      ) : (
        <div
          style={{ height: CHART_HEIGHT }}
          className="grid place-items-center text-center text-[13.5px] font-normal text-white/45"
        >
          {t("noChart", { symbol: base })}
        </div>
      )}
    </div>
  );

  const holdingCard = (
    <div className="ws-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[13px] font-semibold text-white/80">
          {t("holdingTitle", { symbol: base || "—" })}
        </span>
        <span className="rounded-full bg-white/6 px-2 py-0.5 text-[10.5px] font-medium text-white/40">
          {t("holdingTag")}
        </span>
      </div>
      {heldToken && heldBalance > 0 ? (
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <AssetIcon
              sym={base}
              bg={tokenBg(base)}
              logo={heldToken.logo}
              size={26}
              fallback="gradient"
            />
            <span className="tnum text-[14px] font-medium">
              {heldBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {base}
            </span>
          </span>
          <span className="tnum text-[14px] font-semibold">{formatUsd(heldToken.valueUsd)}</span>
        </div>
      ) : (
        <div className="grid place-items-center py-8 text-center text-[13px] font-normal text-white/40">
          {t("noHolding", { symbol: base || "—" })}
        </div>
      )}
    </div>
  );

  const openSell = () => {
    if (!heldToken || heldBalance <= 0) {
      toast.info(t("noSellBalance", { symbol: base || "—" }));
      return;
    }
    setSheet("sell");
  };

  return (
    <>
      <MobileSpotPage
        open={open}
        onClose={onClose}
        base={base || "—"}
        quote="USDC"
        price={mark}
        change24h={token?.change24h ?? 0}
        balance={usdcBalance}
        chart={chartCard}
        positions={holdingCard}
        onBuy={() => setSheet("buy")}
        onSell={openSell}
        onSwitchMarket={onSwitchMarket}
      />

      {/* Buy / Sell run through the app's existing order sheets, unchanged. */}
      <ModalShell
        open={sheet !== null}
        onClose={() => setSheet(null)}
        contentKey={sheet ?? "none"}
        size={sheet === "buy" ? "md" : "md"}
      >
        {sheet === "buy" && token ? (
          <BuySheet
            payload={{
              symbol: token.symbol,
              name: token.name,
              priceUsd: token.priceUsd,
              logo: token.logo,
            }}
            onClose={() => setSheet(null)}
          />
        ) : null}
        {sheet === "sell" && token && heldToken ? (
          <SellSheet
            payload={{
              symbol: token.symbol,
              name: token.name,
              network: heldToken.network,
              address: heldToken.address,
              decimals: heldToken.decimals,
              balance: heldToken.balance,
              rawBalance: heldToken.rawBalance,
              priceUsd: token.priceUsd,
              logo: token.logo,
            }}
            onClose={() => setSheet(null)}
          />
        ) : null}
      </ModalShell>
    </>
  );
}
