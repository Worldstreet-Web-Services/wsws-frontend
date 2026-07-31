// Wire types for the chess service (GET /v1/chess) and the normalizer that
// maps them into our domain types. Components and hooks only ever see
// ChessMatch, so a change to the service contract stops here.
//
// The service models a game, its optional stake, and nothing else: no ratings,
// no spectator counts. Identity is a wallet address. Fields we have no source
// for are filled with honest neutral values, never invented data.

import { truncateAddress } from "@/lib/format";
import { parseUsdc } from "@/lib/casino/cashier-money";
import type {
  ChessChallenge,
  ChessColor,
  ChessDrawReason,
  ChessMatch,
  ChessMatchState,
  ChessPlayer,
  ChessResult,
  ChessWager,
  ChessWagerState,
  ChessWinReason,
} from "@/lib/casino/api/types";

export type ChessStatusWire = "waiting" | "active" | "finished" | "aborted";
export type ChessSideWire = "white" | "black";
export type ChessResultWire = "white" | "black" | "draw";

export interface ChessClocksWire {
  whiteMs: number;
  blackMs: number;
}

export interface ChessTimeControlWire {
  initialSeconds: number;
  incrementSeconds: number;
}

// The stake riding on a game, when there is one. Absent or null on a free
// game, which is most of them.
export interface ChessWagerWire {
  stakeUsdc?: string;
  feeBps?: number;
  creatorPlayer?: string;
  opponentPlayer?: string | null;
  creatorLocked?: boolean;
  opponentLocked?: boolean;
  status?: string;
  winnerPlayer?: string | null;
  settledAt?: string | null;
}

export interface ChessMatchWire {
  id: string;
  // The service's share code, and the gateway topic for this game's live
  // frames. Both are currently derived from the id, but they are read from the
  // response rather than rebuilt so that stops being our problem if it changes.
  inviteCode?: string;
  liveTopic?: string;
  status: ChessStatusWire;
  fen: string;
  turn: ChessSideWire;
  ply: number;
  timeControl: ChessTimeControlWire;
  clocks: ChessClocksWire;
  white: string | null;
  black: string | null;
  drawOfferBy: string | null;
  result: ChessResultWire | null;
  resultReason: string | null;
  wager?: ChessWagerWire | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ChessMoveWire {
  ply: number;
  uci: string;
  san: string;
  fenAfter: string;
  byPlayer: string;
  clockMsRemaining: number | null;
  createdAt: string;
}

// Match ids are UUIDs. A malformed id makes the gateway answer with plain text
// instead of the usual envelope, which surfaces as a confusing transport error,
// so callers check the shape before spending a request on it.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMatchId(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

// The gateway topic a match's live frames arrive on. Only used when a response
// predates the server sending `liveTopic` itself.
export function liveTopicFor(matchId: string): string {
  return `chess:match:${matchId}`;
}

const STATE_BY_STATUS: Record<ChessStatusWire, ChessMatchState> = {
  waiting: "awaiting_opponent",
  active: "in_progress",
  finished: "settled",
  aborted: "cancelled",
};

export function toColor(side: ChessSideWire): ChessColor {
  return side === "white" ? "w" : "b";
}

// "3+2" from 180 seconds and a 2 second increment. Controls that are not a
// whole number of minutes keep their seconds, so an unusual one from the
// service still reads correctly instead of rounding to a wrong label.
export function formatTimeControl(initialSeconds: number, incrementSeconds: number): string {
  const minutes = initialSeconds / 60;
  const main = Number.isInteger(minutes) ? `${minutes}` : `${initialSeconds}s`;
  return `${main}+${incrementSeconds}`;
}

// Inverse of formatTimeControl, for turning a chip like "5+3" back into the
// seconds the create endpoint wants.
export function parseTimeControl(label: string): ChessTimeControlWire {
  const [main = "", increment = "0"] = label.split("+");
  const initialSeconds = main.endsWith("s") ? Number(main.slice(0, -1)) : Number(main) * 60;
  const incrementSeconds = Number(increment);
  if (!Number.isFinite(initialSeconds) || !Number.isFinite(incrementSeconds)) {
    throw new Error(`Unrecognised time control: ${label}`);
  }
  return { initialSeconds, incrementSeconds };
}

// The service reports the winner and the reason in separate fields, while our
// result type pairs them. These are the service's documented `resultReason`
// values; anything unrecognised falls back rather than discarding a finished
// game, since the reason is only ever used to word the result line.
const DRAW_REASONS: Record<string, ChessDrawReason> = {
  stalemate: "stalemate",
  insufficient_material: "insufficient",
  threefold_repetition: "repetition",
  fifty_move_rule: "fifty_move",
  draw_agreement: "agreement",
};

const WIN_REASONS: Record<string, ChessWinReason> = {
  checkmate: "checkmate",
  resignation: "resignation",
  timeout: "timeout",
  forfeit: "forfeit",
};

export function toResult(
  result: ChessResultWire | null,
  resultReason: string | null
): ChessResult | null {
  if (!result) return null;
  const reason = (resultReason ?? "").toLowerCase();
  if (result === "draw") {
    return { kind: "draw", reason: DRAW_REASONS[reason] ?? "agreement" };
  }
  return { kind: WIN_REASONS[reason] ?? "checkmate", winner: toColor(result) };
}

// A seat holds a wallet address and nothing else. The address doubles as the
// display name until the service has profiles.
export function toPlayer(wallet: string | null): ChessPlayer | null {
  if (!wallet) return null;
  return {
    id: wallet,
    username: truncateAddress(wallet),
    rating: 0,
    walletAddress: wallet,
  };
}

const WAGER_STATES: ChessWagerState[] = ["pending", "active", "settled", "refunded", "cancelled"];

// A free game has no wager, and that has to stay null: rendering an absent
// stake as zero would put a money panel on every casual game. An unreadable or
// zero stake is treated the same way, since neither is something to play for.
export function toWager(wire: ChessWagerWire | null | undefined): ChessWager | null {
  if (!wire) return null;
  const stakeMicro = parseUsdc(wire.stakeUsdc);
  if (stakeMicro === null || stakeMicro <= 0n) return null;

  const state = wire.status;
  return {
    stakeMicro,
    feeBps: typeof wire.feeBps === "number" && wire.feeBps >= 0 ? wire.feeBps : 0,
    creatorLocked: wire.creatorLocked === true,
    opponentLocked: wire.opponentLocked === true,
    state:
      typeof state === "string" && (WAGER_STATES as string[]).includes(state)
        ? (state as ChessWagerState)
        : "pending",
    winnerPlayer: wire.winnerPlayer ?? null,
    settledAt: wire.settledAt ?? null,
  };
}

export interface ToChessMatchOptions {
  moves?: ChessMoveWire[];
}

export function toChessMatch(wire: ChessMatchWire, options: ToChessMatchOptions = {}): ChessMatch {
  const moves = options.moves ?? [];

  // When the clocks were last true. The service has no "as of" field and does
  // not charge time on a read, so the last move is the only honest reference
  // point; using the moment the response arrived would restart the countdown on
  // every poll and freeze the displayed clock.
  const clockUpdatedAt =
    moves.length > 0 ? moves[moves.length - 1].createdAt : (wire.startedAt ?? wire.createdAt);

  const drawOfferSide: ChessColor | null =
    wire.drawOfferBy === null
      ? null
      : wire.drawOfferBy === wire.white
        ? "w"
        : wire.drawOfferBy === wire.black
          ? "b"
          : null;

  return {
    id: wire.id,
    state: STATE_BY_STATUS[wire.status],
    white: toPlayer(wire.white),
    black: toPlayer(wire.black),
    timeControl: formatTimeControl(
      wire.timeControl.initialSeconds,
      wire.timeControl.incrementSeconds
    ),
    inviteCode: wire.inviteCode ?? wire.id,
    liveTopic: wire.liveTopic ?? liveTopicFor(wire.id),
    ply: wire.ply,
    fen: wire.fen,
    moves: moves.map((m) => m.san),
    lastMoveUci: moves.length > 0 ? moves[moves.length - 1].uci : null,
    wager: toWager(wire.wager),
    clocks: { w: wire.clocks.whiteMs / 1000, b: wire.clocks.blackMs / 1000 },
    clockUpdatedAt,
    turn: toColor(wire.turn),
    result: toResult(wire.result, wire.resultReason),
    drawOffered: drawOfferSide,
    createdAt: wire.createdAt,
  };
}

// A waiting match, presented as a joinable challenge. The creator is whichever
// seat is already taken, and the match id is what an invite link carries.
export function toChessChallenge(wire: ChessMatchWire): ChessChallenge {
  const creator = toPlayer(wire.white ?? wire.black);
  return {
    id: wire.id,
    creator: creator ?? {
      id: wire.id,
      username: "Open seat",
      rating: 0,
      walletAddress: "",
    },
    timeControl: formatTimeControl(
      wire.timeControl.initialSeconds,
      wire.timeControl.incrementSeconds
    ),
    createdAt: wire.createdAt,
    inviteCode: wire.inviteCode ?? wire.id,
    wager: toWager(wire.wager),
  };
}
