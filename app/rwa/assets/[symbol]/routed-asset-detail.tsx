"use client";

import { useState } from "react";

import { RwaTradePanel } from "@/features/rwa/index";
import { AssetDetail } from "@/features/rwas/components/asset-detail";
import styles from "@/features/rwas/components/asset-detail.module.css";
import type { MarketAssetDetails } from "@/lib/api/schemas/rwas";
import { marketAssetToRwaAsset } from "@/lib/trade/xstocks";

type OrderSide = "buy" | "sell";

export function RoutedAssetDetail({ symbol }: { symbol: string }) {
  return <AssetDetail symbol={symbol} renderTradePanel={(detail) => <TradePanel detail={detail} />} />;
}

function TradePanel({ detail }: { detail: MarketAssetDetails }) {
  const [side, setSide] = useState<OrderSide>("buy");
  const asset = marketAssetToRwaAsset(detail);
  const paused = detail.asset.tradingPaused || Boolean(detail.tradingStatus?.pauseReason);

  return (
    <section className={styles.purchasePanel}>
      <h2>
        {side === "buy" ? "Buy" : "Sell"} {detail.asset.symbol}
      </h2>

      <div className={styles.purchaseToolbar}>
        <div className={styles.sideTabs} aria-label="Order side">
          <button type="button" aria-pressed={side === "buy"} onClick={() => setSide("buy")}>
            Buy
          </button>
          <button type="button" aria-pressed={side === "sell"} onClick={() => setSide("sell")}>
            Sell
          </button>
        </div>
      </div>

      {paused ? (
        <p className={styles.tradeError} role="status">
          This asset is temporarily paused by the provider.
        </p>
      ) : asset ? (
        <RwaTradePanel
          key={`${asset.id}:${side}`}
          asset={asset}
          initialMode={side}
          bare
          hideHeader
        />
      ) : (
        <p className={styles.tradeError} role="status">
          No supported USDC secondary-market deployment is available for this asset.
        </p>
      )}

      <p className={styles.tradeLegalNotice}>
        Tokenized assets may be subject to securities, eligibility, and jurisdictional restrictions.
        Review the applicable legal information before trading.
        {detail.legalNoticeUrl ? (
          <>
            {" "}
            <a href={detail.legalNoticeUrl} target="_blank" rel="noreferrer">
              Additional information.*
            </a>
          </>
        ) : null}
      </p>
    </section>
  );
}
