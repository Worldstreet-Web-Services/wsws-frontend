"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { getLpPositions, getPositions } from "@/lib/prediction/api";
import { readPendingWithdrawals } from "@/lib/prediction/chain-reads";
import { getWalletAddress } from "@/lib/user";

// Portfolio reads for the connected wallet: open positions and LP positions from
// the indexer, and the claimable balance straight from the contract.

export function usePositions() {
  const { user } = usePrivy();
  const wallet = getWalletAddress(user, "ethereum");
  return useQuery({
    queryKey: ["prediction", "positions", wallet],
    queryFn: () => getPositions(wallet as string),
    enabled: !!wallet,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}

export function useLpPositions() {
  const { user } = usePrivy();
  const wallet = getWalletAddress(user, "ethereum");
  return useQuery({
    queryKey: ["prediction", "lp", wallet],
    queryFn: () => getLpPositions(wallet as string),
    enabled: !!wallet,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}

export function usePendingWithdrawals() {
  const { user } = usePrivy();
  const wallet = getWalletAddress(user, "ethereum");
  return useQuery({
    queryKey: ["prediction", "withdrawable", wallet],
    queryFn: () => readPendingWithdrawals(wallet as string),
    enabled: !!wallet,
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
}
