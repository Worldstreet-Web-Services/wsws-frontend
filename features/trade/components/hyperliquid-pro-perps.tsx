"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { TradingViewChart } from "@/components/ui/tradingview-chart";
import { HyperliquidAssetPicker } from "@/features/trade/components/hyperliquid-asset-picker";
import { HyperliquidMarketHeader } from "@/features/trade/components/hyperliquid-market-header";
import { HyperliquidMarketPanel } from "@/features/trade/components/hyperliquid-market-panel";
import { HyperliquidWalletPanel } from "@/features/trade/components/hyperliquid-wallet-panel";
import { HyperliquidOrderForm } from "@/features/trade/components/hyperliquid-order-form";
import { HyperliquidPositionsList } from "@/features/trade/components/hyperliquid-positions-list";
import { HyperliquidOrdersList } from "@/features/trade/components/hyperliquid-orders-list";
import { useHyperliquidTrading } from "@/features/trade/hooks/use-hyperliquid-trading";
import { useHyperliquidMarketContexts } from "@/features/trade/hooks/use-hyperliquid-market-contexts";
import { tradingViewSymbolForAsset } from "@/features/trade/lib/hyperliquid-tradingview";
import type {
  HlOrderRow,
  HlPositionView,
  HlTriggerKind,
} from "@/features/trade/lib/hyperliquid-types";

// Full control: searchable market picker, chart, limit/TP/SL entry, leverage,
// positions and orders. See apps/perp's README for the backend side and
// apps/perp/src/signing/README.md for the signing model — every write below
// is signed by the user's own embedded wallet, never this backend.
export function HyperliquidProPerps() {
  const trading = useHyperliquidTrading();
  const { contexts } = useHyperliquidMarketContexts(trading.authenticated);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [busy, setBusy] = useState(false);
  const portfolio = usePortfolio();

  // A top-up or withdrawal moves the user's main (spot) balance too — refresh
  // it the moment the perps side confirms, instead of leaving it to catch up
  // on its own ~20s poll. The perps-side settlement itself (Hyperliquid's own
  // confirmation window, then the on-chain leg back to the main wallet) is
  // real transfer time that can't be sped up; this just removes the extra,
  // avoidable lag on top of it.
  const handleWalletChanged = () => {
    trading.refetchAll();
    void portfolio.refetchFresh();
  };

  if (!trading.authenticated) {
    return (
      <div className="ws-card p-6 text-sm font-normal text-white/55">Sign in to trade perps.</div>
    );
  }

  // Default to BTC-USDC before the user has picked anything — assets sort
  // alphabetically from the backend, so falling back to assets[0] directly
  // would land on whatever sorts first (e.g. a native ticker like "0G"),
  // not the market a new user actually expects to see first.
  const asset =
    trading.assets.find((a) => a.symbol === selectedSymbol) ??
    trading.assets.find((a) => a.symbol === "BTC") ??
    trading.assets[0] ??
    null;
  const markPrice = asset ? Number(trading.prices[asset.symbol] ?? 0) : 0;

  const withBusy = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };

  // `finally`, not a trailing call after `await` — a rejected action (e.g.
  // "already filled or cancelled") still means Hyperliquid's own state moved
  // since we last fetched it. Refetching only on success left a failed
  // cancel/close/edit showing the exact same stale, still-actionable row
  // forever — nothing was actually duplicated, the UI just never learned
  // the order/position had already resolved.
  const handleClosePosition = (position: HlPositionView, siblingOrderIdsToCancel: string[]) =>
    withBusy(async () => {
      try {
        await trading.actions.closePosition(position.id, siblingOrderIdsToCancel);
      } finally {
        trading.refetchAll();
      }
    });

  const handleEditTrigger = (
    position: HlPositionView,
    kind: HlTriggerKind,
    triggerPrice: string,
    existingOrderId: string | undefined
  ) =>
    withBusy(async () => {
      try {
        await trading.actions.updateTriggerOrder(position.id, kind, triggerPrice, existingOrderId);
      } finally {
        trading.refetchAll();
      }
    });

  const handleCancelOrder = (order: HlOrderRow) =>
    withBusy(async () => {
      try {
        await trading.actions.cancelOrder(order.id);
      } finally {
        trading.refetchAll();
      }
    });

  return (
    <div className="flex flex-col gap-4" data-sensitive="position">
      <HyperliquidMarketHeader symbol={asset?.symbol ?? ""} fallbackMarkPrice={markPrice} />

      <div className="grid grid-cols-1 items-start gap-4 min-[980px]:grid-cols-[minmax(0,420px)_1fr]">
        <div className="flex flex-col gap-4">
          <HyperliquidWalletPanel
            walletId={trading.walletId}
            walletLoading={trading.walletLoading}
            clearinghouse={trading.clearinghouse}
            clearinghouseLoading={trading.clearinghouseLoading}
            busy={busy}
            onBridge={(requiredUsdc) => withBusy(() => trading.actions.bridge(requiredUsdc))}
            onWithdraw={(amountUsdc, onStatus) =>
              withBusy(() => trading.actions.withdraw(amountUsdc, onStatus))
            }
            onFunded={handleWalletChanged}
          />

          <HyperliquidOrderForm
            assetSymbol={asset?.symbol ?? ""}
            maxLeverage={asset?.maxLeverage ?? 20}
            markPrice={markPrice}
            szDecimals={asset?.szDecimals ?? 4}
            availableMarginUsdc={
              trading.clearinghouse ? Number(trading.clearinghouse.withdrawable) : 0
            }
            walletReady={!trading.assetsLoading && trading.walletId != null}
            busy={busy}
            onSubmit={(input, onStatus) =>
              withBusy(async () => {
                const result = await trading.actions.placeOrder(input, onStatus);
                trading.refetchAll();
                return result;
              })
            }
            onUpdateLeverage={(assetSymbol, leverage, marginMode) =>
              withBusy(() => trading.actions.updateLeverage(assetSymbol, leverage, marginMode))
            }
          />
        </div>

        <div className="flex flex-col gap-4">
          <HyperliquidAssetPicker
            assets={trading.assets}
            prices={trading.prices}
            contexts={contexts}
            selected={asset?.symbol ?? ""}
            onSelect={setSelectedSymbol}
            loading={trading.assetsLoading}
          />
          <div className="grid grid-cols-1 gap-4 min-[1400px]:grid-cols-[1fr_280px]">
            <div className="ws-card p-4 sm:p-5">
              {asset ? (
                <TradingViewChart symbol={tradingViewSymbolForAsset(asset.symbol)} height={380} />
              ) : (
                <div
                  style={{ height: 380 }}
                  className="grid place-items-center text-[13.5px] font-normal text-white/45"
                >
                  No market selected
                </div>
              )}
            </div>
            <HyperliquidMarketPanel symbol={asset?.symbol ?? ""} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <HyperliquidPositionsList
              positions={trading.positions}
              orders={trading.orders}
              loading={trading.positionsLoading}
              busy={busy}
              walletId={trading.walletId}
              onClosePosition={handleClosePosition}
              onEditTrigger={handleEditTrigger}
            />
            <HyperliquidOrdersList
              orders={trading.orders}
              loading={trading.ordersLoading}
              busy={busy}
              onCancel={handleCancelOrder}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
