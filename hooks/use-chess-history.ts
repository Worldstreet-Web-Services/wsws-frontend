"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPlayerMatches } from "@/lib/casino/api/chess";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";

export const CHESS_HISTORY_KEYS = {
  player: (wallet: string, status: string) =>
    ["casino", "chess", "history", wallet, status] as const,
};

// Everything this wallet has played, newest first. The service filters by
// status; "all" leaves the parameter off rather than sending a value the
// service does not know.
export function useChessHistory(status: string = "all") {
  const wallet = useCasinoWallet();
  const address = wallet.address;

  const query = useQuery({
    queryKey: CHESS_HISTORY_KEYS.player(address ?? "none", status),
    queryFn: () => fetchPlayerMatches(address as string, status === "all" ? undefined : status),
    enabled: !!address,
  });

  return {
    matches: query.data ?? [],
    // A signed-in user with no wallet yet is loading, not empty: the history
    // query has not been allowed to run.
    isLoading: query.isLoading || !address,
    error: query.error,
    connected: wallet.connected,
    // Which side the player took in each game is derived from this.
    address,
  };
}
