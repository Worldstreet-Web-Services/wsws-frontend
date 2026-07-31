"use client";

import { chessGet, chessPost } from "@/lib/casino/api/chess-client";
import { parseTimeControl } from "@/lib/casino/api/chess-wire";
import {
  toSwissSummary,
  toSwissTournament,
  type SwissSummaryWire,
  type SwissWire,
} from "@/lib/casino/api/swiss-wire";
import { apiError } from "@/lib/casino/api/envelope";
import { usdcToApi } from "@/lib/casino/cashier-money";
import type { CreateSwissInput, SwissSummary, SwissTournament } from "@/lib/casino/api/types";

// Client for the chess service's swiss tournaments. The service pairs each
// round and spawns a real chess match per board, so a pairing links straight
// into the normal play screen.
//
// Every write names the caller with a token the service checks against the
// organizer or the entrant list. Callers pass it in; this module stays free of
// React.

interface SwissListWire {
  items: SwissSummaryWire[];
}

function requireSwissId(id: string): string {
  if (!id.trim()) throw apiError("NOT_FOUND", "That tournament doesn't exist.", 404);
  return encodeURIComponent(id);
}

export async function fetchSwissTournaments(status?: string): Promise<SwissSummary[]> {
  const data = await chessGet<SwissListWire>("/swiss", {
    limit: "50",
    ...(status ? { status } : {}),
  });
  return data.items.map(toSwissSummary);
}

export async function fetchSwissTournament(id: string): Promise<SwissTournament> {
  return toSwissTournament(await chessGet<SwissWire>(`/swiss/${requireSwissId(id)}`));
}

export async function createSwissTournament(
  input: CreateSwissInput & { organizer: string }
): Promise<SwissSummary> {
  const { initialSeconds, incrementSeconds } = parseTimeControl(input.timeControl);
  const wire = await chessPost<SwissSummaryWire>("/swiss", {
    organizer: input.organizer,
    name: input.name,
    nbRounds: input.totalRounds,
    initialSeconds,
    incrementSeconds,
    ...(input.password ? { password: input.password } : {}),
    // Omitted on a free tournament. Sending "0" would make the service open a
    // paid tournament that costs nothing to enter and pays out nothing.
    ...(input.entryFeeMicro && input.entryFeeMicro > 0n
      ? { entryFeeUsdc: usdcToApi(input.entryFeeMicro) }
      : {}),
    ...(input.forbiddenPairings?.trim()
      ? { forbiddenPairings: input.forbiddenPairings.trim() }
      : {}),
  });
  return toSwissSummary(wire);
}

export interface JoinSwissOptions {
  password?: string;
  // Required by the service when the tournament charges an entry fee: it is
  // where a refund goes. The proxy replaces it with the session's own wallet.
  walletAddress?: string;
}

export async function joinSwissTournament(
  id: string,
  name: string,
  options: JoinSwissOptions = {}
): Promise<SwissTournament> {
  const wire = await chessPost<SwissWire>(`/swiss/${requireSwissId(id)}/join`, {
    name,
    ...(options.password ? { password: options.password } : {}),
    ...(options.walletAddress ? { walletAddress: options.walletAddress } : {}),
  });
  return toSwissTournament(wire);
}

// Withdrawing before the first round removes the player outright; afterwards
// they are marked absent. `forfeit` also concedes any game they are mid-way
// through rather than leaving it hanging.
export async function withdrawFromSwiss(
  id: string,
  name: string,
  forfeit = false,
  walletAddress?: string
): Promise<SwissTournament> {
  const wire = await chessPost<SwissWire>(`/swiss/${requireSwissId(id)}/withdraw`, {
    name,
    forfeit,
    // Where a pre-start refund is sent. Ignored by the service on a free
    // tournament.
    ...(walletAddress ? { walletAddress } : {}),
  });
  return toSwissTournament(wire);
}

// Organizer-only. The service pairs the round itself and creates a match per
// board; it refuses while the current round still has games running.
// `manualPairings` is only needed when the service has no pairing engine
// available; with one, it pairs the round itself and this is left off.
export async function startNextSwissRound(
  id: string,
  organizer: string,
  manualPairings?: string
): Promise<SwissTournament> {
  const wire = await chessPost<SwissWire>(`/swiss/${requireSwissId(id)}/rounds/next`, {
    organizer,
    ...(manualPairings?.trim() ? { manualPairings: manualPairings.trim() } : {}),
  });
  return toSwissTournament(wire);
}
