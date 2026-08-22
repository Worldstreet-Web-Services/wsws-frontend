"use client";

import { useTranslations } from "next-intl";
import { PreviewNotice, PreviewRow, PreviewRowSkeleton } from "@/components/ui/preview-row";
import {
  useHyperliquidAssets,
  useHyperliquidPrices,
} from "@/features/trade/hooks/use-hyperliquid-markets";
import { hlPairLabel } from "@/features/trade/lib/hyperliquid-types";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";

const HREF = "/perps";

// The perps brief: the majors with their mark and what they can be levered to.
// Hyperliquid publishes no 24h change on the asset list, so the row carries
// leverage instead of inventing a movement figure (the Avantis brief this
// replaced made the same call).
export function PerpsOverview({ rows }: { rows: number }) {
  const t = useTranslations("overview");
  const { assets, loading: assetsLoading } = useHyperliquidAssets();
  const { prices, loading: pricesLoading } = useHyperliquidPrices();

  if (assetsLoading || pricesLoading) return <PreviewRowSkeleton rows={rows} />;

  // Native crypto majors only: HIP-3 equities and forex carry a "dex:SYMBOL"
  // symbol and their own market hours, neither of which suits a 24/7 teaser.
  const majors = assets.filter((a) => a.isActive && !a.symbol.includes(":")).slice(0, rows);

  if (majors.length === 0) return <PreviewNotice>{t("empty")}</PreviewNotice>;

  return (
    <>
      {majors.map((asset) => {
        const price = Number(prices[asset.symbol] ?? 0);
        return (
          <PreviewRow
            key={asset.symbol}
            href={HREF}
            sym={asset.symbol}
            name={hlPairLabel(asset.symbol)}
            bg={tokenBg(asset.symbol)}
            price={price > 0 ? formatUsd(price) : "—"}
            note={t("leverage", { max: asset.maxLeverage })}
          />
        );
      })}
    </>
  );
}
