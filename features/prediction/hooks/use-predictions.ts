"use client";

import { useQuery } from "@tanstack/react-query";
import { PERSISTED_GC_TIME } from "@/lib/query-persist";
import type { Prediction } from "@/lib/types";
import { apiFetch } from "@/lib/api";

const FIVE_MINUTES = 5 * 60 * 1000;

interface UsePredictionsOptions {
  /**
   * Whether to fetch. Defaults to true. The dashboard's discovery shelf only
   * wants this feed when the on-chain markets come back empty, and a caller
   * that copied the query to get a gate would be a second path to the same
   * endpoint.
   */
  enabled?: boolean;
}

export function usePredictions({ enabled = true }: UsePredictionsOptions = {}) {
  return useQuery<Prediction[]>({
    enabled,
    queryKey: ["predictions"],
    staleTime: FIVE_MINUTES,
    gcTime: PERSISTED_GC_TIME,
    queryFn: async () => {
      const res = await apiFetch("/api/predictions");
      if (!res.ok) throw new Error("Could not load predictions");
      const data = await res.json();
      return (data.predictions ?? []) as Prediction[];
    },
  });
}
