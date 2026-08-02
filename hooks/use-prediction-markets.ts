"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getCategories,
  getMarket,
  getMarketChart,
  getMarketTrades,
  listMarkets,
} from "@/lib/prediction/api";
import type { ChartInterval, MarketStatus } from "@/lib/prediction/types";

// React Query reads for the prediction market. REST is the first paint and a
// background safety net; on the detail page the WS stream overlays live ticks on
// top of these cached values, so the poll intervals stay relaxed.

export function useMarkets(status?: MarketStatus, category?: string) {
  return useQuery({
    queryKey: ["prediction", "markets", status ?? null],
    queryFn: () => listMarkets(status),
    // Category isn't a server filter; derive it here so one cache per status
    // serves every category tab.
    select: category ? (markets) => markets.filter((m) => m.category === category) : undefined,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarket(id: string | null) {
  return useQuery({
    queryKey: ["prediction", "market", id],
    queryFn: () => getMarket(id as string),
    enabled: !!id,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}

export function useMarketChart(id: string | null, interval: ChartInterval) {
  return useQuery({
    queryKey: ["prediction", "chart", id, interval],
    queryFn: () => getMarketChart(id as string, interval),
    enabled: !!id,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useMarketTrades(id: string | null) {
  return useQuery({
    queryKey: ["prediction", "trades", id],
    queryFn: () => getMarketTrades(id as string),
    enabled: !!id,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["prediction", "categories"],
    queryFn: getCategories,
    staleTime: 300_000,
  });
}
