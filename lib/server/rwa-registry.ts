import "server-only";
import { wsapiRwaRequest } from "@/lib/server/wsapi";
import { requestRwas } from "@/lib/server/rwas";
import { fetchRwaPrices } from "@/lib/server/rwa-prices";

// RWA chain id -> Alchemy network id, for the chains the portfolio queries.
const RWA_CHAIN_TO_NETWORK: Record<string, string> = {
  base: "base-mainnet",
  ethereum: "eth-mainnet",
  arbitrum: "arb-mainnet",
  polygon: "polygon-mainnet",
  solana: "solana-mainnet",
};

const XSTOCKS_CHAIN_TO_NETWORK: Record<number, string> = {
  1: "eth-mainnet",
  10: "opt-mainnet",
  101: "solana-mainnet",
  137: "polygon-mainnet",
  8453: "base-mainnet",
  42161: "arb-mainnet",
};

const XSTOCKS_CACHE_MS = 5 * 60_000;

export interface RwaTokenInfo {
  symbol: string;
  priceUsd: number;
  // Same server-resolved logo the RWA table uses, so holdings show a real icon.
  logo: string;
}

interface RwaAssetRow {
  chain?: string;
  address?: string;
  symbol?: string;
  priceUsd?: string | null;
}

interface XstocksNetworkRow {
  chainId?: number;
  address?: string;
}

interface XstocksAssetRow {
  symbol?: string;
  iconUrl?: string;
  primaryMarket?: { priceUsd?: string };
  networks?: XstocksNetworkRow[];
}

interface XstocksPage {
  items?: XstocksAssetRow[];
  totalPages?: number;
}

let xstocksCache: { expiresAt: number; rows: XstocksAssetRow[] } | null = null;
let xstocksLoad: Promise<XstocksAssetRow[]> | null = null;

async function requestXstocksPage(page: number): Promise<XstocksPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: "200" });
  const response = await requestRwas("market-assets", query, crypto.randomUUID());
  if (!response.ok) throw new Error(`xStocks registry returned ${response.status}`);
  const body = (await response.json()) as { data?: XstocksPage };
  return body.data ?? {};
}

async function fetchXstocksRows(): Promise<XstocksAssetRow[]> {
  if (xstocksCache && xstocksCache.expiresAt > Date.now()) return xstocksCache.rows;
  if (xstocksLoad) return xstocksLoad;

  xstocksLoad = (async () => {
    const first = await requestXstocksPage(1);
    const totalPages = Math.max(1, first.totalPages ?? 1);
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => requestXstocksPage(index + 2))
    );
    const rows = [...(first.items ?? []), ...remaining.flatMap((page) => page.items ?? [])];
    xstocksCache = { expiresAt: Date.now() + XSTOCKS_CACHE_MS, rows };
    return rows;
  })().finally(() => {
    xstocksLoad = null;
  });

  return xstocksLoad;
}

// Recognized RWA tokens keyed by Alchemy network -> lowercased address, so a
// user's RWA holdings pass the portfolio allowlist and render with the right
// symbol and price. Cached upstream (60s). On any failure it returns empty, so
// the portfolio still loads (RWA rows just won't appear that fetch).
export async function fetchRwaRegistry(): Promise<Record<string, Map<string, RwaTokenInfo>>> {
  const out: Record<string, Map<string, RwaTokenInfo>> = {};
  try {
    // Cached 5 minutes: the portfolio refetches often (every 30s and after each
    // trade), and the RWA token list barely changes — so this must not re-hit the
    // RWA backend on every portfolio load.
    const res = await wsapiRwaRequest("assets", { method: "GET", revalidate: 300 });
    if (!res.ok) {
      // Silence here would delete every RWA holding from the portfolio and
      // with it the only path to sell one, so say so.
      console.error("RWA registry fetch failed:", res.status);
      throw new Error(`Legacy RWA registry returned ${res.status}`);
    }
    const body = (await res.json().catch(() => ({}))) as { data?: RwaAssetRow[] };
    const rows = (body.data ?? []).filter((a) => a.chain && a.address);

    // The backend serves no price for the whole Solana catalog, and a holding
    // priced at zero is invisible in the portfolio total. Fill those the same
    // way the table does, in one batched call.
    const unpriced = rows.filter((a) => {
      const p = a.priceUsd != null ? parseFloat(a.priceUsd) : NaN;
      return !Number.isFinite(p) || p <= 0;
    });
    const fallback = unpriced.length
      ? await fetchRwaPrices(
          unpriced.map((a) => ({
            id: `${a.chain}:${a.address}`,
            chain: a.chain as string,
            address: a.address as string,
          }))
        ).catch(() => ({}) as Record<string, number>)
      : {};

    for (const a of rows) {
      const network = a.chain ? RWA_CHAIN_TO_NETWORK[a.chain] : undefined;
      if (!network || !a.address) continue;
      const parsed = a.priceUsd != null ? parseFloat(a.priceUsd) : NaN;
      const price =
        Number.isFinite(parsed) && parsed > 0 ? parsed : (fallback[`${a.chain}:${a.address}`] ?? 0);
      (out[network] ??= new Map()).set(a.address.toLowerCase(), {
        symbol: a.symbol ?? "RWA",
        priceUsd: price,
        logo: `/api/token-logo/${a.chain}/${a.address}`,
      });
    }
  } catch (error) {
    console.error("RWA registry fetch failed:", error);
  }

  try {
    const rows = await fetchXstocksRows();
    for (const asset of rows) {
      const symbol = asset.symbol ?? "RWA";
      const parsedPrice = Number.parseFloat(asset.primaryMarket?.priceUsd ?? "0");
      const priceUsd = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0;

      for (const deployment of asset.networks ?? []) {
        const network = deployment.chainId
          ? XSTOCKS_CHAIN_TO_NETWORK[deployment.chainId]
          : undefined;
        if (!network || !deployment.address) continue;
        (out[network] ??= new Map()).set(deployment.address.toLowerCase(), {
          symbol,
          priceUsd,
          logo: asset.iconUrl ?? "",
        });
      }
    }
  } catch (error) {
    console.error("xStocks registry fetch failed:", error);
  }
  return out;
}
