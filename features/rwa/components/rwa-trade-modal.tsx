"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { RwaTradePanel } from "@/features/rwa/components/rwa-trade-panel";
import { useRwaAssets } from "@/features/rwa/hooks/use-rwa-assets";
import { useRwaEnrichedAssets } from "@/features/rwa/hooks/use-rwa-prices";
import { findRwaAsset } from "@/features/rwa/lib/presenter";
import { unwrap } from "@/lib/api/envelope";
import type { MarketAssetDetails } from "@/lib/api/schemas/rwas";
import type { RwaTradePayload } from "@/lib/modal-types";
import { marketAssetToRwaAsset } from "@/lib/trade/xstocks";

async function fetchXstocksAsset(symbol: string, signal: AbortSignal): Promise<MarketAssetDetails> {
  const response = await fetch(`/api/rwas/market-assets/${encodeURIComponent(symbol)}`, {
    headers: { accept: "application/json" },
    signal,
  });
  return unwrap<MarketAssetDetails>(response, "The market asset is unavailable.");
}

// Trade a held RWA from the holdings list. Resolves the registry asset by network
// and address, then renders the RWA trade panel, which quotes and builds through
// the RWA service. This keeps RWA buy/sell off the Dextopus deposit router, which
// cannot source or deliver RWA tokens.
export function RwaTradeModal({
  payload,
  onContinueInBackground,
}: {
  payload: RwaTradePayload;
  onContinueInBackground?: () => void;
}) {
  const t = useTranslations("rwa");
  const { assets: rawAssets, loading } = useRwaAssets();
  // Same price fallback the table uses: without it a Solana asset opened from
  // Holdings shows $0 until the quote returns.
  const assets = useRwaEnrichedAssets(rawAssets);
  const legacyAsset = findRwaAsset(assets, payload.network, payload.address);
  const xstocksQuery = useQuery({
    queryKey: ["rwas-market-asset", payload.symbol],
    queryFn: ({ signal }) => fetchXstocksAsset(payload.symbol, signal),
    enabled: !loading && !legacyAsset,
    staleTime: 60_000,
    retry: 1,
  });
  const xstocksAsset = xstocksQuery.data
    ? marketAssetToRwaAsset(xstocksQuery.data, {
        network: payload.network,
        address: payload.address,
      })
    : null;
  const asset = legacyAsset ?? xstocksAsset;
  const resolving = loading || (!legacyAsset && xstocksQuery.isPending);

  if (asset) {
    return (
      <RwaTradePanel
        asset={asset}
        initialMode={payload.mode}
        bare
        onContinueInBackground={onContinueInBackground}
      />
    );
  }

  return (
    <div className="p-8 text-center">
      <div className="font-sans text-[14px] font-semibold text-white/85">
        {resolving ? t("loading") : t("cantTradeNow", { symbol: payload.symbol })}
      </div>
      <p className="mx-auto mt-1.5 max-w-[34ch] text-[12.5px] font-normal text-white/55">
        {resolving
          ? t("fetchingFromRegistry", { symbol: payload.symbol })
          : t("notFoundInRegistry", { symbol: payload.symbol })}
      </p>
    </div>
  );
}
