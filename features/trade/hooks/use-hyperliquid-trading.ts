"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useHyperliquidWallet } from "@/features/trade/hooks/use-hyperliquid-wallet";
import {
  useHyperliquidAssets,
  useHyperliquidClearinghouse,
  useHyperliquidPrices,
} from "@/features/trade/hooks/use-hyperliquid-markets";
import { useHyperliquidPositions } from "@/features/trade/hooks/use-hyperliquid-positions";
import { useHyperliquidOrders } from "@/features/trade/hooks/use-hyperliquid-orders";
import { useHyperliquidActions } from "@/features/trade/lib/hyperliquid-actions";

// Everything both the simple and pro Hyperliquid views need: wallet identity,
// funding, market data, positions/orders, and the write actions — one call
// instead of each view independently wiring the same eight hooks.
export function useHyperliquidTrading() {
  const { authenticated } = usePrivy();
  const { walletId, address, loading: walletLoading, error: walletError } = useHyperliquidWallet();
  const { assets, loading: assetsLoading } = useHyperliquidAssets();
  const { prices } = useHyperliquidPrices(authenticated);
  const {
    state: clearinghouse,
    loading: clearinghouseLoading,
    refetch: refetchClearinghouse,
  } = useHyperliquidClearinghouse(address, authenticated);
  const {
    positions,
    loading: positionsLoading,
    refetch: refetchPositions,
  } = useHyperliquidPositions(walletId, authenticated);
  const {
    orders,
    loading: ordersLoading,
    refetch: refetchOrders,
  } = useHyperliquidOrders(walletId, authenticated);
  const actions = useHyperliquidActions(walletId ?? undefined, address ?? undefined);

  const refetchAll = () => {
    void refetchClearinghouse();
    void refetchPositions();
    void refetchOrders();
  };

  return {
    authenticated,
    walletId,
    address,
    walletLoading,
    walletError,
    assets,
    assetsLoading,
    prices,
    clearinghouse,
    clearinghouseLoading,
    positions,
    positionsLoading,
    orders,
    ordersLoading,
    actions,
    refetchAll,
  };
}
