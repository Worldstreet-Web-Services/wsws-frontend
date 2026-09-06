"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PerpModeSwitch } from "@/features/trade/components/perp-mode";
import { PerpsView } from "@/features/trade/components/perps-view";
import { TokenMoves } from "@/features/trade/components/token-moves";
import { useSpotMarkets } from "@/features/trade/hooks/use-spot-markets";
import { SectionVisibility } from "@/components/ui/section-visibility";
import type { BuyPayload } from "@/lib/modal-types";

// Perpetuals as its own sidebar section: the header carries the simple/pro
// switch, the body is the perps desk. Spot lives in its own section now.
//
// Both interfaces are offered at every width; each moves its chart and order
// ticket into a full-screen sheet on a phone, so the section stays a short
// market list until a market is chosen.
export function PerpsSection({ onOpenBuy }: { onOpenBuy?: (buy: BuyPayload) => void }) {
  const tSections = useTranslations("sections");
  const { markets } = useSpotMarkets();

  // The insight cards are driven by the biggest movers, so any token can surface
  // here — BTC, ETH, and on down the list.
  const insightTokens = useMemo(
    () =>
      markets
        .filter((m) => m.priceUsd > 0)
        .slice()
        .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
        .slice(0, 5)
        .map((m) => ({
          symbol: m.symbol,
          name: m.name,
          logo: m.logo,
          priceUsd: m.priceUsd,
          change24h: m.change24h,
        })),
    [markets]
  );

  // A card's Buy pill opens the app's buy sheet for that token, priced from the
  // spot feed (the sheet refreshes the quote itself).
  const buyToken = useCallback(
    (symbol: string) => {
      if (!onOpenBuy) return;
      const m = markets.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase());
      onOpenBuy({
        symbol,
        name: m?.name ?? symbol,
        priceUsd: m?.priceUsd ?? 0,
        logo: m?.logo ?? null,
      });
    },
    [markets, onOpenBuy]
  );

  return (
    <SectionVisibility className="mx-auto mt-8 w-full max-w-[1520px] p-4 sm:mt-0 sm:p-6 lg:p-8">
      {/* The header (eyebrow + simple/pro switch) and the perps desk are desktop
          only for now; the phone shows the Token Moves carousel in their place. */}
      <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
        <Eyebrow>{tSections("perps")}</Eyebrow>
        <PerpModeSwitch />
      </div>
      {/* Mobile-only "Stay Ahead of Token Moves" insight carousel. */}
      <div className="md:hidden">
        <TokenMoves tokens={insightTokens} onBuyToken={buyToken} />
      </div>
      <div className="mt-4 hidden md:block">
        <PerpsView />
      </div>
    </SectionVisibility>
  );
}
