import "server-only";

// Alchemy Portfolio API. One call returns native + ERC-20 + SPL balances with
// USD prices across every requested network. Key stays server-side.

// We track/hold on the four settlement chains only (Base, Arbitrum, Polygon,
// Solana) — USDC plus the native gas token on each.
const EVM_NETWORKS = ["base-mainnet", "arb-mainnet", "polygon-mainnet"];
const SOLANA_NETWORK = "solana-mainnet";

export interface TokenBalance {
  symbol: string;
  name: string;
  network: string;
  address: string | null;
  decimals: number;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  logo: string | null;
}

export interface Portfolio {
  totalUsd: number;
  tokens: TokenBalance[];
}

interface AlchemyToken {
  network: string;
  tokenAddress?: string | null;
  tokenBalance: string;
  tokenMetadata?: { decimals?: number; logo?: string; name?: string; symbol?: string };
  tokenPrices?: { currency: string; value: string }[];
}

function toNumber(hexOrDec: string, decimals: number): number {
  const raw = hexOrDec.startsWith("0x") ? BigInt(hexOrDec) : BigInt(hexOrDec || "0");
  return Number(raw) / 10 ** decimals;
}

// Native gas tokens come back from Alchemy with no contract metadata, so we
// resolve their identity per network. Without this, native ETH/POL/SOL shows as
// an "unknown token" AND the gas check (which matches on symbol) fails, which is
// why funded gas still read as "no gas".
const NATIVE_TOKEN: Record<string, { symbol: string; name: string; decimals: number }> = {
  "eth-mainnet": { symbol: "ETH", name: "Ethereum", decimals: 18 },
  "base-mainnet": { symbol: "ETH", name: "Ethereum", decimals: 18 },
  "arb-mainnet": { symbol: "ETH", name: "Ethereum", decimals: 18 },
  "opt-mainnet": { symbol: "ETH", name: "Ethereum", decimals: 18 },
  "polygon-mainnet": { symbol: "POL", name: "Polygon", decimals: 18 },
  "solana-mainnet": { symbol: "SOL", name: "Solana", decimals: 9 },
};

function normalize(tokens: AlchemyToken[]): TokenBalance[] {
  const out: TokenBalance[] = [];
  for (const t of tokens) {
    const native = t.tokenAddress == null ? NATIVE_TOKEN[t.network] : undefined;
    const decimals = native?.decimals ?? t.tokenMetadata?.decimals ?? 18;
    const balance = toNumber(t.tokenBalance, decimals);
    if (balance <= 0) continue;
    const symbol = native?.symbol ?? t.tokenMetadata?.symbol;
    // Drop tokens we cannot identify (spam / unlisted) so holdings never show an
    // "unknown token" row.
    if (!symbol) continue;
    const usdPrice = t.tokenPrices?.find((p) => p.currency === "usd");
    const priceUsd = usdPrice ? parseFloat(usdPrice.value) : 0;
    out.push({
      symbol,
      name: native?.name ?? t.tokenMetadata?.name ?? symbol,
      network: t.network,
      address: t.tokenAddress ?? null,
      decimals,
      balance,
      priceUsd,
      valueUsd: balance * priceUsd,
      logo: t.tokenMetadata?.logo ?? null,
    });
  }
  return out.sort((a, b) => b.valueUsd - a.valueUsd);
}

export interface SymbolPrice {
  symbol: string;
  priceUsd: number;
}

// Free-tier Alchemy keys are partitioned by purpose to spread load, and each
// call rotates through a small pool (purpose key -> fallback -> default) so a
// slow or throttled key fails over instead of hanging. Set the per-purpose keys
// in env; each falls back to ALCHEMY_API_KEY.
function alchemyKeys(purpose: "prices" | "portfolio"): string[] {
  const primary =
    purpose === "prices" ? process.env.ALCHEMY_KEY_PRICES : process.env.ALCHEMY_KEY_PORTFOLIO;
  const pool = [primary, process.env.ALCHEMY_KEY_FALLBACK, process.env.ALCHEMY_API_KEY].filter(
    (k): k is string => Boolean(k)
  );
  const unique = [...new Set(pool)];
  if (unique.length === 0) throw new Error("No Alchemy API key configured");
  return unique;
}

async function alchemyFetch(
  keys: string[],
  buildUrl: (key: string) => string,
  init?: RequestInit
): Promise<Response> {
  let lastError: unknown;
  for (const key of keys) {
    try {
      const res = await fetch(buildUrl(key), { ...init, signal: AbortSignal.timeout(7000) });
      if (res.ok) return res;
      lastError = new Error(`Alchemy request failed: ${res.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Alchemy request failed");
}

export async function fetchPrices(symbols: string[]): Promise<SymbolPrice[]> {
  if (symbols.length === 0) return [];

  const params = new URLSearchParams();
  for (const s of symbols) params.append("symbols", s);
  const res = await alchemyFetch(
    alchemyKeys("prices"),
    (key) => `https://api.g.alchemy.com/prices/v1/${key}/tokens/by-symbol?${params.toString()}`
  );
  const data = await res.json();
  const out: SymbolPrice[] = [];
  for (const item of data?.data ?? []) {
    const usd = item?.prices?.find((p: { currency: string }) => p.currency === "usd");
    out.push({ symbol: item.symbol, priceUsd: usd ? parseFloat(usd.value) : 0 });
  }
  return out;
}

export async function fetchPortfolio(evm?: string, solana?: string): Promise<Portfolio> {
  const addresses: { address: string; networks: string[] }[] = [];
  if (evm) addresses.push({ address: evm, networks: EVM_NETWORKS });
  if (solana) addresses.push({ address: solana, networks: [SOLANA_NETWORK] });
  if (addresses.length === 0) return { totalUsd: 0, tokens: [] };

  const body = JSON.stringify({
    addresses,
    withMetadata: true,
    withPrices: true,
    includeNativeTokens: true,
    includeErc20Tokens: true,
  });
  const res = await alchemyFetch(
    alchemyKeys("portfolio"),
    (key) => `https://api.g.alchemy.com/data/v1/${key}/assets/tokens/by-address`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body }
  );

  const data = await res.json();
  const tokens = normalize(data?.data?.tokens ?? []);
  const totalUsd = tokens.reduce((sum, t) => sum + t.valueUsd, 0);
  return { totalUsd, tokens };
}
