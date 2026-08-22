import { describe, expect, it } from "vitest";

import {
  marketAssetDetailsSchema,
  marketAssetHistorySchema,
  marketAssetListSchema,
  rwasSchemaFor,
} from "@/lib/api/schemas/rwas";

const ASSET = {
  source: "xstocks",
  symbol: "NVDAx",
  ticker: "NVDA",
  name: "NVIDIA Tokenized Stock",
  iconUrl: "https://cdn.example.com/nvda.svg",
  tags: [
    {
      categoryLayer: "sector",
      categorySlug: "technology",
      categoryLabel: "Technology",
      tagSlug: "semiconductors",
      tagLabel: "Semiconductors",
    },
  ],
  createdAt: "2026-08-19T12:00:00Z",
  tradingPaused: false,
  offHoursTradable: true,
  primaryMarket: {
    priceUsd: "181.42",
    priceChange24hUsd: "2.10",
    priceChange24hPercent: "1.17",
    change24hAvailable: true,
    priceHistory24h: [{ timestamp: "2026-08-19T12:00:00Z", priceUsd: "181.42" }],
  },
  underlyingMarket: {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    priceHigh52wUsd: "190.00",
    priceLow52wUsd: "86.62",
    volume24hUsd: "4210000000",
    averageVolume: "190000000",
    sharesOutstanding: "24300000000",
    marketCapUsd: "4400000000000",
  },
  networks: [
    {
      network: "solana",
      chainId: 101,
      address: "9aMLafwJ7AQgULFJ6VfCwJN7MgXiX63GkxAbuzP6nvda",
      decimals: 8,
      wrapperAddress: null,
      wrapperAddressV2: null,
      supportsAtomicSwaps: true,
      stablecoins: [],
    },
  ],
  marketDataUpdatedAt: "2026-08-20T01:00:00Z",
};

describe("RWAS contracts", () => {
  it("accepts a complete paginated market response", () => {
    const result = marketAssetListSchema.safeParse({
      items: [ASSET],
      total: 442,
      page: 1,
      pageSize: 48,
      totalPages: 10,
      hasNextPage: true,
      hasPreviousPage: false,
      limit: 48,
      offset: 0,
      lastUpdatedAt: "2026-08-20T01:00:00Z",
    });

    expect(result.success).toBe(true);
  });

  it("accepts unavailable optional detail data without inventing defaults", () => {
    const result = marketAssetDetailsSchema.safeParse({
      asset: { ...ASSET, ticker: null, underlyingMarket: null },
      detailsAvailable: false,
      providerAssetId: null,
      isin: null,
      underlyingIsin: null,
      tradingHoursMode: null,
      tokenName: null,
      underlyingName: null,
      description: null,
      networks: [],
      tradingStatus: null,
      documents: [],
      primaryMarket: null,
      underlyingMarket: null,
      supportedPaymentMethods: [],
      minimumAmountUsd: null,
      venues: [],
      topHoldings: [],
      dividend: null,
      relatedAssets: [],
      legalNoticeUrl: null,
      sessionLimits: null,
      detailRefreshedAt: null,
    });

    expect(result.success).toBe(true);
  });

  it("accepts cached OHLC history and preserves decimal values as strings", () => {
    const result = marketAssetHistorySchema.safeParse({
      symbol: "IBITon",
      range: "1day",
      available: true,
      primaryMarketPrice: [
        {
          timestamp: "2026-08-20T01:00:00Z",
          valueUsd: "40.706122",
          openUsd: "36.509854",
          highUsd: "41.015942",
          lowUsd: "36.508917",
          closeUsd: "40.703636",
        },
      ],
      underlyingMarketPrice: [],
      refreshedAt: "2026-08-20T01:00:01Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects numeric prices because precision-bearing values are strings", () => {
    const result = marketAssetListSchema.safeParse({
      items: [{ ...ASSET, primaryMarket: { ...ASSET.primaryMarket, priceUsd: 181.42 } }],
      total: 1,
      page: 1,
      pageSize: 48,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      limit: 48,
      offset: 0,
      lastUpdatedAt: null,
    });

    expect(result.success).toBe(false);
  });

  it("maps only the three public business paths", () => {
    expect(rwasSchemaFor("market-assets")).toBe(marketAssetListSchema);
    expect(rwasSchemaFor("market-assets/NVDAon")).toBe(marketAssetDetailsSchema);
    expect(rwasSchemaFor("market-assets/NVDAon/history")).toBe(marketAssetHistorySchema);
    expect(rwasSchemaFor("ready")).toBeNull();
  });
});
