import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildMarketAssetQuery,
  fetchCoinGeckoMarketAssetHistory,
  fetchMarketAsset,
  fetchMarketAssetHistory,
  fetchMarketAssetQuote,
  fetchMarketAssets,
  type MarketAssetFilters,
} from "@/features/rwas/lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildMarketAssetQuery", () => {
  it("preserves repeated OR filters and explicit false values", () => {
    const query = buildMarketAssetQuery({
      search: "  Nvidia  ",
      tagFilters: ["Technology", "large-cap", "technology", "all-assets"],
      tradingPaused: false,
      offHoursTradable: true,
      pricedOnly: true,
      sort: "top-gainer",
      page: 0,
      pageSize: 500,
    });

    expect(query.get("search")).toBe("Nvidia");
    expect(query.getAll("tagFilters")).toEqual(["large-cap", "technology"]);
    expect(query.get("tradingPaused")).toBe("false");
    expect(query.get("offHoursTradable")).toBe("true");
    expect(query.get("pricedOnly")).toBe("true");
    expect(query.get("page")).toBe("1");
    expect(query.get("pageSize")).toBe("200");
  });

  it("matches the dedicated 24/7 availability semantics", () => {
    const query = buildMarketAssetQuery({
      tagFilters: ["technology", "24-7-available"],
      tags: "large-cap,all-assets",
    });

    expect(query.getAll("tagFilters")).toEqual(["24-7-available"]);
    expect(query.has("tags")).toBe(false);
  });

  it("omits one-character search and validates provider limits", () => {
    expect(buildMarketAssetQuery({ search: " a " }).has("search")).toBe(false);
    expect(() => buildMarketAssetQuery({ offset: 10_001 })).toThrow(RangeError);
    expect(() =>
      buildMarketAssetQuery({
        tagFilters: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
      })
    ).toThrow(RangeError);
  });
});

describe("RWAS browser API", () => {
  it("fetches the public list without an auth dependency", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [],
            total: 0,
            page: 1,
            pageSize: 48,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            limit: 48,
            offset: 0,
            lastUpdatedAt: null,
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const filters: MarketAssetFilters = {
      tagFilters: ["equities", "technology"],
      prioritizeOffhoursTradable: false,
    };

    await expect(fetchMarketAssets(filters)).resolves.toMatchObject({ total: 0, items: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    const requestUrl = new URL(url, "http://localhost:3000");
    expect(requestUrl.pathname).toBe("/api/rwas/market-assets");
    expect(requestUrl.searchParams.getAll("tagFilters")).toEqual(["equities", "technology"]);
    expect(init).not.toHaveProperty("credentials");
    expect(init.headers).toEqual({ accept: "application/json" });
  });

  it("encodes a valid detail symbol and preserves gateway errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "NOT_FOUND", message: "unknown market asset" },
        }),
        { status: 404 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMarketAsset(" MRNAon ")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/rwas/market-assets/MRNAon");
    await expect(fetchMarketAsset("../ready")).rejects.toThrow(TypeError);
  });

  it("sends a public indicative quote request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            symbol: "SOXLon",
            side: "buy",
            inputAsset: "USDC",
            inputAmount: "100",
            outputAsset: "SOXLon",
            outputAmount: "0.824",
            unitPriceUsd: "121.36",
            paymentAsset: "USDC",
            network: "Ethereum",
            chainId: 1,
            tokenAddress: "0x2222222222222222222222222222222222222222",
            indicative: true,
            expiresAt: "2026-08-20T18:00:15Z",
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchMarketAssetQuote(" SOXLon ", { side: "buy", amount: "100" })
    ).resolves.toMatchObject({ outputAsset: "SOXLon", outputAmount: "0.824" });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(url).toBe("/api/rwas/market-assets/SOXLon/quote");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ side: "buy", amount: "100" });
    expect(headers.get("content-type")).toBe("application/json");
  });

  it.each([
    ["1D", "1day"],
    ["1W", "1week"],
    ["1M", "1month"],
    ["3M", "3month"],
    ["1Y", "1year"],
    ["ALL", "all"],
  ] as const)("maps the %s filter to Ondo's %s source range", async (range, sourceRange) => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            symbol: "SOXLon",
            range: sourceRange,
            available: false,
            primaryMarketPrice: [],
            underlyingMarketPrice: [],
            refreshedAt: null,
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const history = await fetchMarketAssetHistory("SOXLon", range);

    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/rwas/market-assets/SOXLon/history?range=${sourceRange}`
    );
    expect(history.range).toBe(range);
    expect(history.sourceRange).toBe(sourceRange);
  });

  it.each([
    ["1D", "24_hours"],
    ["1W", "7_days"],
    ["1M", "30_days"],
    ["3M", "90_days"],
    ["1Y", "365_days"],
    ["ALL", "max"],
  ] as const)(
    "loads the %s trade view directly from CoinGecko's %s ETL file",
    async (range, file) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            stats: [
              [1_756_000_000_000, 184.25],
              [1_756_003_600_000, 186.5],
            ],
          }),
          { status: 200 }
        )
      );
      vi.stubGlobal("fetch", fetchMock);

      const history = await fetchCoinGeckoMarketAssetHistory(" Coinbase-XStock ", "COINx", range);

      const origin = range === "1D" ? "https://data.coingecko.com" : "https://www.coingecko.com";
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${origin}/etl2/price_charts/coinbase-xstock/usd/${file}.json`
      );
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ mode: "cors", credentials: "omit" });
      expect(history).toMatchObject({
        symbol: "COINx",
        range,
        available: true,
        primaryMarketPrice: [
          expect.objectContaining({ valueUsd: "184.25" }),
          expect.objectContaining({ valueUsd: "186.5" }),
        ],
      });
    }
  );

  it("rejects malformed CoinGecko trade-view data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ unexpected: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ prices: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchCoinGeckoMarketAssetHistory("coinbase-xstock", "COINx", "1D")
    ).rejects.toThrow("trade-view history is unavailable");
  });

  it("uses CoinGecko's CORS-enabled chart API when the ETL file is blocked", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prices: [
              [1_756_000_000_000, 184.25],
              [1_756_003_600_000, 186.5],
            ],
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const history = await fetchCoinGeckoMarketAssetHistory("coinbase-xstock", "COINx", "1D");

    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.coingecko.com/api/v3/coins/coinbase-xstock/market_chart?vs_currency=usd&days=1"
    );
    expect(history.available).toBe(true);
  });
});
