"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/mixpanel";
import type { ChessColor, ChessMatch } from "@/features/casino/lib/api/types";

// Reports chess_game_started from the play screen, for whichever seat this
// player holds.
//
// It used to fire in the accept path only, so the player who created a game,
// and every auto-paired game, never reported a start. Both players pass through
// the play screen, so it is reported here instead: once per match on a device,
// remembered across reloads so opening a game in progress again is not a
// second start.

const STORAGE_KEY = "wsws.analytics.chess-started.v1";
// Enough to cover a player's recent games; the oldest fall away.
const REMEMBERED = 50;

function remembered(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    // Unreadable storage only means this device may report a start twice.
    return [];
  }
}

function remember(ids: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-REMEMBERED)));
  } catch {
    // Private mode or a full quota: the start was still reported.
  }
}

type StartedMatch = Pick<ChessMatch, "id" | "state" | "stakeUsdc" | "computer">;

export function useChessStartReport(
  match: StartedMatch | null | undefined,
  you: ChessColor | null
): void {
  const id = match?.id ?? null;
  const underWay = match?.state === "in_progress";
  // A computer game's stake is its wager; a two-player game's is the match's.
  const stake = Number(match?.computer?.wager?.stakeUsdc ?? match?.stakeUsdc ?? 0) || 0;

  useEffect(() => {
    if (!id || !underWay || you === null) return;
    const seen = remembered();
    if (seen.includes(id)) return;
    remember([...seen, id]);
    track("chess_game_started", { stake_usd: stake, amount_usd: stake, game_id: id });
  }, [id, underWay, you, stake]);
}
