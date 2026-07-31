"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSwissTournament,
  fetchSwissTournament,
  fetchSwissTournaments,
  joinSwissTournament,
  startNextSwissRound,
  withdrawFromSwiss,
} from "@/lib/casino/api/swiss";
import { swissNameFor } from "@/lib/casino/api/swiss-wire";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";
import { useRefreshBalance } from "@/hooks/use-chess-cashier";
import type { CreateSwissInput, SwissTournament } from "@/lib/casino/api/types";

// A tournament changes when other people's games finish, so it is polled. The
// live socket carries individual matches, not standings.
const LIST_POLL_MS = 20_000;
const DETAIL_POLL_MS = 8_000;

export const SWISS_KEYS = {
  list: ["casino", "chess", "swiss"] as const,
  detail: (id: string) => ["casino", "chess", "swiss", id] as const,
};

// The name the service knows this player by. Derived from the wallet so it is
// the same on every visit, which is what the organizer and withdraw checks
// compare against.
export function useSwissIdentity(): string | null {
  const wallet = useCasinoWallet();
  return useMemo(() => (wallet.address ? swissNameFor(wallet.address) : null), [wallet.address]);
}

function requireIdentity(name: string | null): string {
  if (!name) throw new Error("Connect your wallet to enter a tournament.");
  return name;
}

export function useSwissList(status?: string) {
  const query = useQuery({
    queryKey: [...SWISS_KEYS.list, status ?? "all"],
    queryFn: () => fetchSwissTournaments(status),
    refetchInterval: LIST_POLL_MS,
  });

  return {
    tournaments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

export function useSwissTournament(id: string | null) {
  const queryClient = useQueryClient();
  const identity = useSwissIdentity();
  const wallet = useCasinoWallet();
  const refreshBalance = useRefreshBalance();

  const query = useQuery({
    queryKey: SWISS_KEYS.detail(id ?? "none"),
    queryFn: () => fetchSwissTournament(id as string),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.state === "finished" ? false : DETAIL_POLL_MS),
  });

  const tournament = query.data;
  const apply = (next: SwissTournament) =>
    queryClient.setQueryData(SWISS_KEYS.detail(next.id), next);

  // A paid tournament needs somewhere to send a refund, so the wallet goes with
  // the join. The proxy replaces it with the session's own before it leaves.
  const join = useMutation({
    mutationFn: (password?: string) =>
      joinSwissTournament(id as string, requireIdentity(identity), {
        password,
        walletAddress: wallet.address ?? undefined,
      }),
    onSuccess: (next) => {
      apply(next);
      refreshBalance();
    },
  });

  const withdraw = useMutation({
    mutationFn: (forfeit: boolean) =>
      withdrawFromSwiss(
        id as string,
        requireIdentity(identity),
        forfeit,
        wallet.address ?? undefined
      ),
    onSuccess: (next) => {
      apply(next);
      // A pre-start withdrawal refunds the entry fee, so the balance moved.
      refreshBalance();
    },
  });

  const nextRound = useMutation({
    mutationFn: (manualPairings?: string) =>
      startNextSwissRound(id as string, requireIdentity(identity), manualPairings),
    onSuccess: apply,
  });

  // What this player may do, worked out once here rather than in the screen.
  const isOrganizer = !!tournament && !!identity && tournament.organizer === identity;
  const entry = tournament?.standings.find((s) => s.name === identity) ?? null;
  const isEntrant = !!entry && !entry.absent;
  // The service refuses a new round while the current one still has games in
  // play, so the button reflects that rather than failing on click.
  const canStartRound =
    isOrganizer &&
    !!tournament &&
    tournament.state !== "finished" &&
    tournament.ongoingCount === 0 &&
    tournament.round < tournament.totalRounds &&
    tournament.playerCount >= 2;

  return {
    tournament,
    identity,
    isOrganizer,
    isEntrant,
    entry,
    canStartRound,
    isLoading: query.isLoading,
    error: query.error,
    join: join.mutateAsync,
    joining: join.isPending,
    withdraw: withdraw.mutateAsync,
    withdrawing: withdraw.isPending,
    startNextRound: nextRound.mutateAsync,
    startingRound: nextRound.isPending,
  };
}

export function useCreateSwiss() {
  const queryClient = useQueryClient();
  const identity = useSwissIdentity();

  return useMutation({
    mutationFn: (input: CreateSwissInput) =>
      createSwissTournament({ ...input, organizer: requireIdentity(identity) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SWISS_KEYS.list });
    },
  });
}
