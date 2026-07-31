// Wire types for the chess service's swiss tournament module, and the
// normalizer into our domain types. As with matches, components only ever see
// the domain shape.
//
// Swiss request bodies are camelCase (unlike match bodies, which are snake_case)
// and responses name a few things differently from the rest of the app:
// `nbRounds` for the round count, `status` for what we call state.

import { formatTimeControl, type ChessTimeControlWire } from "@/lib/casino/api/chess-wire";
import { parseUsdc } from "@/lib/casino/cashier-money";
import type {
  SwissPairing,
  SwissPairingState,
  SwissStanding,
  SwissState,
  SwissSummary,
  SwissTournament,
} from "@/lib/casino/api/types";

export interface SwissSummaryWire {
  id: string;
  name: string;
  organizer: string;
  status: SwissState;
  round: number;
  nbRounds: number;
  participantCount: number;
  ongoingCount: number;
  timeControl: ChessTimeControlWire;
  // A decimal string, "0" on a free tournament.
  entryFeeUsdc?: string;
  winner: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface SwissStandingWire {
  rank: number;
  name: string;
  points: number;
  tieBreak: number;
  // Always null in the current service. Not carried into the domain type
  // because there is no honest number to show.
  performance: number | null;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  absent: boolean;
}

export interface SwissPairingWire {
  round: number;
  board: number;
  white: string | null;
  black: string | null;
  matchId: string | null;
  status: SwissPairingState;
  result: string | null;
  isForfeit: boolean;
}

export interface SwissRoundWire {
  round: number;
  pairings: SwissPairingWire[];
}

export interface SwissWire extends SwissSummaryWire {
  standings: SwissStandingWire[];
  rounds: SwissRoundWire[];
}

export function toSwissSummary(wire: SwissSummaryWire): SwissSummary {
  return {
    id: wire.id,
    name: wire.name,
    organizer: wire.organizer,
    state: wire.status,
    round: wire.round,
    totalRounds: wire.nbRounds,
    playerCount: wire.participantCount,
    ongoingCount: wire.ongoingCount,
    timeControl: formatTimeControl(
      wire.timeControl.initialSeconds,
      wire.timeControl.incrementSeconds
    ),
    // The service sends "0" on a free tournament. That is not a fee, so it
    // becomes null and no entry-fee copy renders.
    entryFeeMicro: toEntryFee(wire.entryFeeUsdc),
    winner: wire.winner,
    createdAt: wire.createdAt,
    startedAt: wire.startedAt,
    finishedAt: wire.finishedAt,
  };
}

function toEntryFee(value: string | undefined): bigint | null {
  const parsed = parseUsdc(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function toStanding(wire: SwissStandingWire): SwissStanding {
  return {
    rank: wire.rank,
    name: wire.name,
    points: wire.points,
    tieBreak: wire.tieBreak,
    wins: wire.wins,
    draws: wire.draws,
    losses: wire.losses,
    byes: wire.byes,
    absent: wire.absent,
  };
}

function toPairing(wire: SwissPairingWire): SwissPairing {
  return {
    round: wire.round,
    board: wire.board,
    white: wire.white,
    black: wire.black,
    matchId: wire.matchId,
    state: wire.status,
    isForfeit: wire.isForfeit,
  };
}

export function toSwissTournament(wire: SwissWire): SwissTournament {
  return {
    ...toSwissSummary(wire),
    standings: (wire.standings ?? []).map(toStanding),
    // Newest round first: that is the one anybody opening the page cares about.
    rounds: [...(wire.rounds ?? [])]
      .map((r) => ({ round: r.round, pairings: (r.pairings ?? []).map(toPairing) }))
      .sort((a, b) => b.round - a.round),
  };
}

// The service identifies swiss players by a name token: 1 to 30 characters, no
// spaces. A wallet address is 42 characters and would be rejected, so an
// address is shortened into a stable token instead. It is derived rather than
// stored so the same wallet always produces the same entrant, which is what the
// organizer and withdraw checks compare against.
export function swissNameFor(walletAddress: string): string {
  const address = walletAddress.trim();
  if (address.length <= 30) return address;
  return `${address.slice(0, 6)}${address.slice(-4)}`;
}
