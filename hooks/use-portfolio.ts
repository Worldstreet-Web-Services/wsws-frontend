"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { apiFetch } from "@/lib/api";
import { getWalletAddress } from "@/lib/user";
import type { Portfolio } from "@/lib/server/alchemy";

import type { TokenBalance } from "@/lib/server/alchemy";

export type { Portfolio, TokenBalance } from "@/lib/server/alchemy";

// Balances don't need second-by-second freshness, and every tick here is a
// round trip through our now-cached but still real Alchemy call — a minute
// is plenty for background polling. Anything that needs to see its own
// effect immediately (e.g. right after a trade or withdrawal) calls
// `refetch()` directly instead of waiting on this interval.
const POLL_MS = 60 * 1000;

// Stable identity for the empty/loading state. Consumers key memos and effects
// on `tokens` (trade balances, swap net-balances, global search, funding), so a
// fresh `[]` each render would invalidate all of them needlessly.
const EMPTY_TOKENS: TokenBalance[] = [];

// How long to keep asking after a trade before giving up and leaving it to the
// background poll. A freshly created Solana token account can take several
// seconds to appear in the balance index, well past the transaction's own
// confirmation.
const SETTLE_DEADLINE_MS = 40_000;
const SETTLE_BACKOFF_MS = [0, 2_500, 5_000, 8_000, 12_000];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A fingerprint of the exact balances, so a post-trade poll can tell "the index
// caught up" from "the same snapshot again". Uses the base-unit strings, since
// the float `balance` can round two different amounts to the same value.
function balancesSignature(p: Portfolio | undefined): string {
  if (!p) return "";
  return p.tokens
    .map((t) => `${t.network}:${t.address ?? t.symbol}:${t.rawBalance}`)
    .sort()
    .join("|");
}

function tokenRawBalance(
  portfolio: Portfolio | undefined,
  network: string,
  address: string
): bigint {
  const token = portfolio?.tokens.find(
    (item) => item.network === network && item.address?.toLowerCase() === address.toLowerCase()
  );
  return BigInt(token?.rawBalance ?? "0");
}

// One set of polling and retry knobs, shared by the full hook and the slice
// selectors below so they behave identically. They all mount against the same
// queryKey, so React Query keeps them on a single cache entry and a single
// background poll no matter how many components read the portfolio.
const PORTFOLIO_QUERY_BEHAVIOR = {
  // First load races the Privy token warm-up and a cold serverless start, so
  // retry longer than the global default (~13s across attempts) to outlast
  // both. Without this, the two quick default retries give up before the
  // token lands and the user has to refresh manually. A rate limit is never
  // retried, since a throttled key won't recover by retrying.
  retry: (failureCount: number, error: Error) => {
    if (error.message.toLowerCase().includes("too many requests")) return false;
    return failureCount < 5;
  },
  retryDelay: (attempt: number) => Math.min(800 * 2 ** attempt, 4000),
  staleTime: POLL_MS,
  refetchInterval: POLL_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
};

// The wallet identity and the cache key derived from it. All three hooks read
// this so they line up on the same queryKey and share one cache entry.
function usePortfolioIdentity() {
  const { user, ready, authenticated } = usePrivy();
  const evm = getWalletAddress(user, "ethereum");
  const solana = getWalletAddress(user, "solana");
  const enabled = ready && authenticated && Boolean(evm || solana);
  const queryKey = ["portfolio", evm, solana] as const;
  return { evm, solana, enabled, queryKey };
}

// Wallets currently mid-settlement, so every read for that wallet skips the
// server's short cache and asks for a fresh balance. Module-level and keyed by
// wallet because the full hook and the slice selectors all mount against one
// query, and React Query keeps only the last observer's queryFn: a per-hook ref
// could be bypassed by whichever observer rendered most recently, letting a
// post-trade fresh read fall back to the shared cache. A counter, not a flag, so
// two overlapping settlements for the same wallet do not clear each other early.
const freshCounts = new Map<string, number>();

function walletKey(evm: string | null, solana: string | null): string {
  return `${evm ?? ""}:${solana ?? ""}`;
}

function beginFresh(key: string): void {
  freshCounts.set(key, (freshCounts.get(key) ?? 0) + 1);
}

function endFresh(key: string): void {
  const next = (freshCounts.get(key) ?? 0) - 1;
  if (next > 0) freshCounts.set(key, next);
  else freshCounts.delete(key);
}

// The single portfolio fetch, shared by the full hook and the slice selectors so
// all three behave identically. A wallet marked fresh (mid-settlement) skips the
// server's shared cache; otherwise the cached read is fine.
async function fetchPortfolio(evm: string | null, solana: string | null): Promise<Portfolio> {
  const params = new URLSearchParams();
  if (evm) params.set("evm", evm);
  if (solana) params.set("solana", solana);
  if (freshCounts.has(walletKey(evm, solana))) params.set("fresh", "1");
  // requireAuth: the query only runs when Privy is authenticated, so a missing
  // token means it isn't warm yet on a cold first load. apiFetch then throws a
  // retryable error instead of a token-less request that 401s.
  const res = await apiFetch(`/api/portfolio?${params.toString()}`, {}, { requireAuth: true });
  if (!res.ok) {
    // Message must say "too many requests" so the retry guard recognizes a 429
    // and stops retrying instead of piling more requests onto a throttled key.
    throw new Error(res.status === 429 ? "Too many requests" : "Portfolio request failed");
  }
  return res.json();
}

// Slice reads for display-only consumers. `select` runs after the fetch and
// React Query re-renders the caller only when the SELECTED value changes, so a
// component that shows just the total does not re-render on a 60s poll when only
// the token rows moved, and vice versa. Anything that needs to refetch or wait
// on a settlement uses the full usePortfolio() below, which carries the
// mutation callbacks.
export function usePortfolioTotal(): number {
  const { evm, solana, enabled, queryKey } = usePortfolioIdentity();
  const { data } = useQuery({
    queryKey,
    enabled,
    queryFn: () => fetchPortfolio(evm, solana),
    select: (portfolio: Portfolio): number => portfolio.totalUsd,
    ...PORTFOLIO_QUERY_BEHAVIOR,
  });
  return data ?? 0;
}

export function usePortfolioTokens(): TokenBalance[] {
  const { evm, solana, enabled, queryKey } = usePortfolioIdentity();
  const { data } = useQuery({
    queryKey,
    enabled,
    queryFn: () => fetchPortfolio(evm, solana),
    // React Query's structural sharing keeps this array's identity stable across
    // unchanged polls, so a tokens-only consumer stays put until a balance moves.
    select: (portfolio: Portfolio): TokenBalance[] => portfolio.tokens,
    ...PORTFOLIO_QUERY_BEHAVIOR,
  });
  return data ?? EMPTY_TOKENS;
}

export function usePortfolio() {
  const queryClient = useQueryClient();
  const { evm, solana, enabled, queryKey } = usePortfolioIdentity();

  const query = useQuery<Portfolio>({
    queryKey,
    enabled,
    queryFn: () => fetchPortfolio(evm, solana),
    ...PORTFOLIO_QUERY_BEHAVIOR,
  });

  const { refetch } = query;
  // A just-completed wallet transaction must bypass the short server cache.
  // This keeps the portfolio reactive during an active cross-chain settlement
  // without shortening the normal background polling interval for everyone.
  const refetchFresh = useCallback(async (): Promise<Portfolio | undefined> => {
    const key = walletKey(evm, solana);
    beginFresh(key);
    try {
      const result = await refetch();
      return result.data;
    } finally {
      endFresh(key);
    }
  }, [refetch, evm, solana]);

  // Refetch until the balances actually move. A single refetch after a trade
  // races two lags — the shared server cache and Alchemy's balance index — and
  // usually loses, leaving the pre-trade numbers on screen until the next
  // background poll. Resolves true when the change lands, false on timeout.
  //
  // The baseline is read from the cache rather than from `query`, which would
  // make the callback change identity on every refetch and restart the poll.
  const refetchUntilChanged = useCallback(async (): Promise<boolean> => {
    const before = balancesSignature(
      queryClient.getQueryData<Portfolio>(["portfolio", evm, solana])
    );
    const startedAt = Date.now();
    const key = walletKey(evm, solana);
    beginFresh(key);
    try {
      for (let attempt = 0; Date.now() - startedAt < SETTLE_DEADLINE_MS; attempt++) {
        await delay(SETTLE_BACKOFF_MS[Math.min(attempt, SETTLE_BACKOFF_MS.length - 1)]);
        const { data } = await refetch();
        if (balancesSignature(data) !== before) return true;
      }
      return false;
    } finally {
      endFresh(key);
    }
  }, [refetch, queryClient, evm, solana]);

  // Wait for a particular incoming token amount rather than any portfolio
  // change. A sell can change the RWA row before its USDC output is indexed;
  // routing then would otherwise try to spend funds that have not appeared yet.
  const waitForTokenBalance = useCallback(
    async (network: string, address: string, atLeast: bigint): Promise<boolean> => {
      const startedAt = Date.now();
      const key = walletKey(evm, solana);
      beginFresh(key);
      try {
        for (let attempt = 0; Date.now() - startedAt < SETTLE_DEADLINE_MS; attempt++) {
          await delay(SETTLE_BACKOFF_MS[Math.min(attempt, SETTLE_BACKOFF_MS.length - 1)]);
          const { data } = await refetch();
          if (tokenRawBalance(data, network, address) >= atLeast) return true;
        }
        return false;
      } finally {
        endFresh(key);
      }
    },
    [refetch, evm, solana]
  );

  // React Query's structural sharing keeps `query.data` (and this nested tokens
  // array) at a stable identity across unchanged polls, so consumers that key
  // memos and effects on `tokens` stay put until a balance actually moves.
  const totalUsd = query.data?.totalUsd ?? 0;
  const tokens = query.data?.tokens ?? EMPTY_TOKENS;
  const loading = enabled && query.isPending;
  // True while a fresh fetch is in flight but a value (possibly a rehydrated one
  // from a previous session) is already on screen — lets the UI show a subtle
  // "refreshing" hint instead of silently swapping numbers with no explanation.
  const refreshing = enabled && query.isFetching && !query.isPending;
  const error = query.isError;

  // This hook is mounted app-global (AnalyticsSegments) and read by ~40
  // consumers, so a fresh wrapper object each render would re-render all of them
  // on every parent render and every poll tick. Memo on the real inputs (the
  // structurally-shared `tokens`, the stable callbacks, and the primitive flags)
  // keeps the identity fixed until a value a consumer actually reads changes.
  return useMemo(
    () => ({
      totalUsd,
      tokens,
      loading,
      refreshing,
      error,
      refetch,
      refetchFresh,
      refetchUntilChanged,
      waitForTokenBalance,
    }),
    [
      totalUsd,
      tokens,
      loading,
      refreshing,
      error,
      refetch,
      refetchFresh,
      refetchUntilChanged,
      waitForTokenBalance,
    ]
  );
}
