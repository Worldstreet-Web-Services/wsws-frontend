import { describe, expect, it } from "vitest";

import { marketAssetToRwaAsset, preferredMarketDeployment } from "@/lib/trade/xstocks";
import type { MarketAssetDetails } from "@/lib/api/schemas/rwas";

function details(): MarketAssetDetails {
  const networks = [
    {
      network: "ethereum-1",
      chainId: 1,
      address: "0x0000000000000000000000000000000000000001",
      decimals: 18,
      supportsAtomicSwaps: false,
      stablecoins: [],
    },
    {
      network: "solana",
      chainId: 101,
      address: "So11111111111111111111111111111111111111111",
      decimals: 8,
      supportsAtomicSwaps: true,
      stablecoins: [],
    },
  ];

  return {
    asset: {
      source: "xstocks",
      symbol: "TSLAx",
      ticker: "TSLA",
      name: "Tesla xStock",
      iconUrl: "https://xstocks-metadata.backed.fi/TSLAx.png",
      tags: [],
      createdAt: "2026-08-21T00:00:00Z",
      tradingPaused: false,
      offHoursTradable: true,
      primaryMarket: {
        priceUsd: "363.79",
        priceChange24hUsd: "1.2",
        priceChange24hPercent: "0.3",
        change24hAvailable: true,
        chartAvailable: false,
        priceHistory24h: [],
      },
      underlyingMarket: null,
      networks,
      marketDataUpdatedAt: "2026-08-21T00:00:00Z",
    },
    detailsAvailable: true,
    providerAssetId: "tsla",
    isin: null,
    underlyingIsin: null,
    tradingHoursMode: "24/5",
    tokenName: "TSLAx",
    underlyingName: "Tesla",
    description: null,
    networks,
    tradingStatus: null,
    documents: [],
    primaryMarket: null,
    underlyingMarket: null,
    supportedPaymentMethods: ["USDC"],
    minimumAmountUsd: null,
    venues: [],
    topHoldings: [],
    dividend: null,
    relatedAssets: [],
    legalNoticeUrl: null,
    sessionLimits: null,
    detailRefreshedAt: "2026-08-21T00:00:00Z",
  };
}

describe("xStocks trade adapter", () => {
  it("prefers a USDC-capable atomic Solana deployment for the established routed flow", () => {
    expect(preferredMarketDeployment(details())?.chainId).toBe(101);
    expect(marketAssetToRwaAsset(details())).toMatchObject({
      chain: "solana",
      symbol: "TSLAx",
      freelyTradable: true,
      accessMode: "dex",
    });
  });

  it("resolves the exact held deployment for a portfolio sale", () => {
    expect(
      marketAssetToRwaAsset(details(), {
        network: "eth-mainnet",
        address: "0x0000000000000000000000000000000000000001",
      })
    ).toMatchObject({ chain: "ethereum", address: "0x0000000000000000000000000000000000000001" });
  });
});
