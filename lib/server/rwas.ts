import "server-only";

import { wsapiService } from "@/lib/wsapi-base";

const LOCAL_DEV_RWAS_API = "http://127.0.0.1:8094";
const DEFAULT_TIMEOUT_MS = 8_000;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const LIST_QUERY_PARAMETERS = new Set([
  "search",
  "tags",
  "tagFilters",
  "tradingPaused",
  "offHoursTradable",
  "prioritizeOffhoursTradable",
  "includeAssetsWithoutUnderlyingMarket",
  "pricedOnly",
  "sort",
  "page",
  "pageSize",
  "limit",
  "offset",
]);
const HISTORY_RANGES = new Set(["1day", "1week", "1month", "3month", "1year", "all"]);

function marketAssetPath(path: string): { symbol: string; history: boolean } | null {
  const match = /^market-assets\/([^/]+)(\/history)?$/u.exec(path);
  if (!match) return null;
  return { symbol: match[1], history: Boolean(match[2]) };
}

export const RWAS_API_BASE = (
  process.env.RWAS_API_URL ??
  (process.env.NODE_ENV === "development" ? LOCAL_DEV_RWAS_API : undefined) ??
  wsapiService("rwas")
).replace(/\/+$/u, "");

export function isAllowedRwasPath(path: string): boolean {
  if (path === "market-assets") return true;
  const match = marketAssetPath(path);
  if (!match) return false;
  const { symbol } = match;
  return (
    symbol.length > 0 && symbol.length <= 64 && !symbol.includes("..") && !/[\\/%?#]/u.test(symbol)
  );
}

export function invalidRwasQuery(path: string, query: URLSearchParams): string | null {
  if (query.toString().length > 2_048) return "The market asset query is too long.";
  const assetPath = marketAssetPath(path);
  if (assetPath?.history) {
    const ranges = query.getAll("range");
    if (query.size !== 1 || ranges.length !== 1 || !HISTORY_RANGES.has(ranges[0])) {
      return "Asset history requires one supported range.";
    }
    return null;
  }
  if (assetPath && query.size > 0) {
    return "Asset detail requests do not accept query parameters.";
  }

  for (const key of query.keys()) {
    if (!LIST_QUERY_PARAMETERS.has(key)) return `Unsupported market asset filter: ${key}.`;
  }
  return null;
}

export function rwasCacheControl(path: string): string {
  if (marketAssetPath(path)?.history) {
    return "public, max-age=15, s-maxage=30, stale-while-revalidate=300";
  }
  return path === "market-assets"
    ? "public, max-age=15, s-maxage=30, stale-while-revalidate=300"
    : "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1_000, 1_000);
  }
  return 250 * 2 ** attempt;
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function requestRwas(
  path: string,
  query: URLSearchParams,
  requestId: string,
  init: {
    method?: "GET" | "POST";
    body?: string;
  } = {}
): Promise<Response> {
  const url = new URL(`${RWAS_API_BASE}/${path}`);
  // Assignment from the serialized value preserves repeated tagFilters.
  url.search = query.toString();

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        "x-request-id": requestId,
      };
      if (init.body !== undefined) headers["content-type"] = "application/json";
      const response = await fetch(url, {
        method: init.method ?? "GET",
        headers,
        body: init.body,
        cache: "no-store",
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (!RETRYABLE_STATUS.has(response.status) || attempt === 2) return response;

      const wait = retryDelay(response, attempt);
      await response.body?.cancel();
      await delay(wait);
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await delay(250 * 2 ** attempt);
    }
  }

  throw lastError;
}
