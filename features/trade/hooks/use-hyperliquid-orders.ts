"use client";

import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/features/trade/lib/hyperliquid-api";
import type { HlOrderRow } from "@/features/trade/lib/hyperliquid-types";

// No background poll — same reasoning as use-hyperliquid-positions.ts:
// every action this app takes (place, cancel, close, TP/SL) already
// refetches explicitly, and refetchOnWindowFocus/refetchOnReconnect
// (lib/query-client.ts) still catch anything that changed externally.
export function useHyperliquidOrders(walletId: string | null, enabled = true) {
  const query = useQuery<HlOrderRow[]>({
    queryKey: ["hl-orders", walletId],
    queryFn: () => listOrders(walletId as string),
    enabled: enabled && walletId != null,
  });

  return {
    orders: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? query.error : null,
    refetch: query.refetch,
  };
}
