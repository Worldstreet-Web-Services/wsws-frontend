"use client";

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/api/envelope";
import type {
  MarketAssetDetails,
  MarketAssetFirmQuote,
  MarketAssetFirmQuoteRequest,
  MarketAssetHistory,
  MarketAssetHistorySourceRange,
  MarketAssetList,
  MarketAssetQuote,
  MarketAssetQuoteSide,
} from "@/lib/api/schemas/rwas";

export const MARKET_ASSET_SORTS = [
  "most-popular",
  "least-popular",
  "top-gainer",
  "top-loser",
  "newest",
  "oldest",
  "token-price-high-low",
  "token-price-low-high",
] as const;

export type MarketAssetSort = (typeof MARKET_ASSET_SORTS)[number];

export const MARKET_ASSET_CHART_RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;

export type MarketAssetChartRange = (typeof MARKET_ASSET_CHART_RANGES)[number];

export interface MarketAssetChartHistory extends Omit<MarketAssetHistory, "range"> {
  range: MarketAssetChartRange;
  sourceRange: MarketAssetHistorySourceRange;
}

const SOURCE_RANGE: Record<MarketAssetChartRange, MarketAssetHistorySourceRange> = {
  "1D": "1day",
  "1W": "1week",
  "1M": "1month",
  "3M": "3month",
  "1Y": "1year",
  ALL: "all",
};

const COINGECKO_ETL_RANGE: Record<MarketAssetChartRange, string> = {
  "1D": "24_hours",
  "1W": "7_days",
  "1M": "30_days",
  "3M": "90_days",
  "1Y": "365_days",
  ALL: "max",
};

const COINGECKO_ETL_ORIGIN: Record<MarketAssetChartRange, string> = {
  "1D": "https://data.coingecko.com",
  "1W": "https://www.coingecko.com",
  "1M": "https://www.coingecko.com",
  "3M": "https://www.coingecko.com",
  "1Y": "https://www.coingecko.com",
  ALL: "https://www.coingecko.com",
};

const COINGECKO_API_RANGE: Record<MarketAssetChartRange, string> = {
  "1D": "1",
  "1W": "7",
  "1M": "30",
  "3M": "90",
  "1Y": "365",
  ALL: "max",
};

const COINGECKO_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_COINGECKO_CHART_POINTS = 20_000;

export interface MarketAssetFilters {
  search?: string;
  tagFilters?: readonly string[];
  /** @deprecated Use tagFilters. Kept for callers migrating from Ondo's older query shape. */
  tags?: string | readonly string[];
  tradingPaused?: boolean;
  offHoursTradable?: boolean;
  prioritizeOffhoursTradable?: boolean;
  includeAssetsWithoutUnderlyingMarket?: boolean;
  pricedOnly?: boolean;
  sort?: MarketAssetSort;
  page?: number;
  pageSize?: number;
  /** @deprecated Use pageSize and page. */
  limit?: number;
  /** @deprecated Use page. */
  offset?: number;
}

export interface RwasRequestOptions {
  signal?: AbortSignal;
}

export interface MarketAssetQuoteInput {
  side: MarketAssetQuoteSide;
  amount: string;
}

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim();
  if (
    !normalized ||
    normalized.length > 64 ||
    normalized.includes("..") ||
    /[\\/%?#]/u.test(normalized)
  ) {
    throw new TypeError("A valid market asset symbol is required.");
  }
  return normalized;
}

function finiteInteger(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be a finite number.`);
  return Math.trunc(value);
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

function normalizedTags(filters: MarketAssetFilters): string[] {
  const legacy = typeof filters.tags === "string" ? filters.tags.split(",") : (filters.tags ?? []);
  const tags = [...(filters.tagFilters ?? []), ...legacy]
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag && tag !== "all-assets");
  const unique = [...new Set(tags)].sort();

  if (unique.length > 10 || unique.some((tag) => utf8Length(tag) > 64)) {
    throw new RangeError("tagFilters accepts at most 10 values of 64 characters each.");
  }
  return unique.includes("24-7-available") ? ["24-7-available"] : unique;
}

function setBoolean(query: URLSearchParams, key: string, value: boolean | undefined) {
  if (value !== undefined) query.set(key, String(value));
}

export function buildMarketAssetQuery(filters: MarketAssetFilters = {}): URLSearchParams {
  const query = new URLSearchParams();
  const search = filters.search?.trim();
  if (search && search.length > 1) {
    if (utf8Length(search) > 100) throw new RangeError("search must not exceed 100 characters.");
    query.set("search", search);
  }

  for (const tag of normalizedTags(filters)) query.append("tagFilters", tag);
  setBoolean(query, "tradingPaused", filters.tradingPaused);
  setBoolean(query, "offHoursTradable", filters.offHoursTradable);
  setBoolean(query, "prioritizeOffhoursTradable", filters.prioritizeOffhoursTradable);
  setBoolean(
    query,
    "includeAssetsWithoutUnderlyingMarket",
    filters.includeAssetsWithoutUnderlyingMarket
  );
  setBoolean(query, "pricedOnly", filters.pricedOnly);

  if (filters.sort !== undefined) {
    if (!MARKET_ASSET_SORTS.includes(filters.sort)) {
      throw new RangeError(`Unsupported market asset sort: ${filters.sort}.`);
    }
    query.set("sort", filters.sort);
  }
  if (filters.page !== undefined) {
    query.set("page", String(Math.max(1, finiteInteger(filters.page, "page"))));
  }
  if (filters.pageSize !== undefined) {
    const pageSize = finiteInteger(filters.pageSize, "pageSize");
    query.set("pageSize", String(Math.min(200, Math.max(1, pageSize))));
  }
  if (filters.limit !== undefined) {
    const limit = finiteInteger(filters.limit, "limit");
    query.set("limit", String(Math.min(200, Math.max(1, limit))));
  }
  if (filters.offset !== undefined) {
    const offset = finiteInteger(filters.offset, "offset");
    if (offset < 0 || offset > 10_000) {
      throw new RangeError("offset must be between 0 and 10000.");
    }
    query.set("offset", String(offset));
  }
  return query;
}

export async function fetchMarketAssets(
  filters: MarketAssetFilters = {},
  options: RwasRequestOptions = {}
): Promise<MarketAssetList> {
  const query = buildMarketAssetQuery(filters).toString();
  const response = await fetch(`/api/rwas/market-assets${query ? `?${query}` : ""}`, {
    headers: { accept: "application/json" },
    signal: options.signal,
  });
  return unwrap<MarketAssetList>(response, "Market assets are unavailable.");
}

export async function fetchMarketAsset(
  symbol: string,
  options: RwasRequestOptions = {}
): Promise<MarketAssetDetails> {
  const normalized = normalizeSymbol(symbol);

  const response = await fetch(`/api/rwas/market-assets/${encodeURIComponent(normalized)}`, {
    headers: { accept: "application/json" },
    signal: options.signal,
  });
  return unwrap<MarketAssetDetails>(response, "The market asset is unavailable.");
}

export async function fetchMarketAssetQuote(
  symbol: string,
  input: MarketAssetQuoteInput,
  options: RwasRequestOptions = {}
): Promise<MarketAssetQuote> {
  const normalized = normalizeSymbol(symbol);
  const response = await fetch(`/api/rwas/market-assets/${encodeURIComponent(normalized)}/quote`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: options.signal,
  });
  return unwrap<MarketAssetQuote>(response, "A market quote is unavailable.");
}

export async function fetchMarketAssetFirmQuote(
  input: MarketAssetFirmQuoteRequest,
  options: RwasRequestOptions = {}
): Promise<MarketAssetFirmQuote> {
  const response = await apiFetch(
    "/api/rwas/orders/quote",
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: options.signal,
    },
    { requireAuth: true }
  );
  return unwrap<MarketAssetFirmQuote>(response, "An executable quote is unavailable.");
}

export async function fetchMarketAssetHistory(
  symbol: string,
  range: MarketAssetChartRange,
  options: RwasRequestOptions = {}
): Promise<MarketAssetChartHistory> {
  const normalized = normalizeSymbol(symbol);
  if (!MARKET_ASSET_CHART_RANGES.includes(range)) {
    throw new RangeError(`Unsupported market asset chart range: ${range}.`);
  }
  const sourceRange = SOURCE_RANGE[range];
  const response = await fetch(
    `/api/rwas/market-assets/${encodeURIComponent(normalized)}/history?range=${sourceRange}`,
    {
      headers: { accept: "application/json" },
      signal: options.signal,
    }
  );
  const history = await unwrap<MarketAssetHistory>(
    response,
    "Market asset history is unavailable."
  );
  return {
    ...history,
    range,
    sourceRange: history.range,
  };
}

export async function fetchCoinGeckoMarketAssetHistory(
  coingeckoId: string,
  symbol: string,
  range: MarketAssetChartRange,
  options: RwasRequestOptions = {}
): Promise<MarketAssetChartHistory> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedId = coingeckoId.trim().toLowerCase();
  if (!COINGECKO_ID.test(normalizedId)) {
    throw new TypeError("A valid CoinGecko asset ID is required.");
  }
  if (!MARKET_ASSET_CHART_RANGES.includes(range)) {
    throw new RangeError(`Unsupported market asset chart range: ${range}.`);
  }

  const etlUrl = `${COINGECKO_ETL_ORIGIN[range]}/etl2/price_charts/${encodeURIComponent(normalizedId)}/usd/${COINGECKO_ETL_RANGE[range]}.json`;
  const apiUrl = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(normalizedId)}/market_chart?vs_currency=usd&days=${COINGECKO_API_RANGE[range]}`;
  const requirePriceRows = (value: unknown, message: string): unknown[] => {
    if (!Array.isArray(value) || value.length > MAX_COINGECKO_CHART_POINTS) {
      throw new Error(message);
    }
    const rows = value.filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])) &&
        Number(point[0]) > 0 &&
        Number(point[1]) > 0
    );
    if (rows.length < 2) {
      throw new Error(message);
    }
    return rows;
  };

  const fetchEtlRows = async (): Promise<unknown[]> => {
    const etlResponse = await fetch(etlUrl, {
      headers: { accept: "application/json" },
      mode: "cors",
      credentials: "omit",
      signal: options.signal,
    });
    if (!etlResponse.ok) {
      throw new Error("CoinGecko ETL history is unavailable.");
    }
    const payload: unknown = await etlResponse.json();
    const rows =
      payload && typeof payload === "object" && "stats" in payload
        ? (payload as { stats?: unknown }).stats
        : null;
    return requirePriceRows(rows, "CoinGecko returned an invalid ETL response.");
  };

  const fetchApiRows = async (): Promise<unknown[]> => {
    const apiResponse = await fetch(apiUrl, {
      headers: { accept: "application/json" },
      mode: "cors",
      credentials: "omit",
      signal: options.signal,
    });
    if (!apiResponse.ok) {
      throw new Error("CoinGecko trade-view history is unavailable.");
    }
    const payload: unknown = await apiResponse.json();
    const rows =
      payload && typeof payload === "object" && "prices" in payload
        ? (payload as { prices?: unknown }).prices
        : null;
    return requirePriceRows(rows, "CoinGecko returned an invalid chart response.");
  };

  let rows: unknown[];
  try {
    rows = await Promise.any([fetchEtlRows(), fetchApiRows()]);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("CoinGecko trade-view history is unavailable.");
  }

  const primaryMarketPrice: MarketAssetHistory["primaryMarketPrice"] = [];
  for (const point of rows) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const timestamp = Number(point[0]);
    const value = Number(point[1]);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value) || timestamp <= 0 || value <= 0) {
      continue;
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    primaryMarketPrice.push({
      timestamp: date.toISOString(),
      valueUsd: String(value),
      openUsd: null,
      highUsd: null,
      lowUsd: null,
      closeUsd: null,
    });
  }

  if (primaryMarketPrice.length < 2) {
    throw new Error("CoinGecko returned an invalid trade-view response.");
  }

  return {
    symbol: normalizedSymbol,
    range,
    sourceRange: SOURCE_RANGE[range],
    available: true,
    primaryMarketPrice,
    underlyingMarketPrice: [],
    refreshedAt: new Date().toISOString(),
  };
}
