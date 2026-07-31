"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CasinoEmpty,
  CasinoError,
  CasinoLoading,
} from "@/components/dashboard/casino/casino-state";
import { useChessHistory } from "@/hooks/use-chess-history";
import type { ChessColor, ChessMatch } from "@/lib/casino/api/types";

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In play" },
  { id: "finished", label: "Finished" },
  { id: "waiting", label: "Open" },
];

const OUTCOME_STYLE: Record<string, string> = {
  Won: "text-up",
  Lost: "text-down",
  Draw: "text-white/60",
  Aborted: "text-white/40",
};

// What this game meant for the player looking at it, rather than which colour
// won. A spectator's own history cannot contain a game they did not play, so
// the side is always resolvable.
function outcomeFor(match: ChessMatch, you: ChessColor | null): string {
  if (match.state === "cancelled") return "Aborted";
  if (match.state === "awaiting_opponent") return "Open";
  if (match.state === "in_progress") return "In play";
  if (!match.result) return "Finished";
  if (match.result.kind === "draw") return "Draw";
  if (you === null) return match.result.winner === "w" ? "White won" : "Black won";
  return match.result.winner === you ? "Won" : "Lost";
}

function sideOf(match: ChessMatch, wallet: string | null): ChessColor | null {
  if (!wallet) return null;
  const mine = wallet.toLowerCase();
  if (match.white?.walletAddress?.toLowerCase() === mine) return "w";
  if (match.black?.walletAddress?.toLowerCase() === mine) return "b";
  return null;
}

function playedOn(match: ChessMatch): string {
  const date = new Date(match.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function HistorySection() {
  const [status, setStatus] = useState("all");
  const { matches, isLoading, error, connected, address } = useChessHistory(status);

  if (!connected) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 pt-10 pb-20">
        <CasinoEmpty>Connect your wallet to see the games you have played.</CasinoEmpty>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pt-7 pb-20 sm:px-6">
      <h1 className="ws-display text-[26px]">Your games</h1>
      <p className="mt-1.5 font-sans text-[13px] font-normal text-white/50">
        Every game this wallet has played, newest first.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setStatus(filter.id)}
            aria-pressed={status === filter.id}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] transition-colors ${
              status === filter.id
                ? "border-accent bg-accent text-ink font-semibold"
                : "border-white/10 font-medium text-white/55 hover:text-white"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {error ? (
          <CasinoError error={error} subject="your games" />
        ) : isLoading ? (
          <CasinoLoading label="Loading your games" rows={5} />
        ) : matches.length === 0 ? (
          <CasinoEmpty>
            {status === "all"
              ? "You haven't played a game yet."
              : "Nothing here under this filter."}
          </CasinoEmpty>
        ) : (
          <ul className="flex flex-col gap-2">
            {matches.map((match) => (
              <HistoryRow key={match.id} match={match} wallet={address} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// A finished game opens as a spectator, since there is nothing left to play; a
// running one opens at the board.
function hrefFor(match: ChessMatch): string {
  return match.state === "in_progress"
    ? `/casino/chess/play?match=${match.id}`
    : `/casino/chess/watch?match=${match.id}`;
}

function HistoryRow({ match, wallet }: { match: ChessMatch; wallet: string | null }) {
  const you = sideOf(match, wallet);
  const opponent = you === "w" ? match.black : match.white;
  const outcome = outcomeFor(match, you);

  return (
    <li>
      <Link
        href={hrefFor(match)}
        className="ws-card flex items-center justify-between gap-4 rounded-[14px] px-4 py-3 transition-colors hover:border-white/25"
      >
        <div className="min-w-0">
          <div className="truncate font-sans text-[13.5px] font-medium text-white/90">
            {opponent ? opponent.username : "No opponent yet"}
          </div>
          <div className="tnum mt-0.5 font-sans text-[12px] font-normal text-white/45">
            {match.timeControl} · {you === "w" ? "White" : you === "b" ? "Black" : "Spectated"}
            {playedOn(match) ? ` · ${playedOn(match)}` : ""}
          </div>
        </div>
        <span
          className={`shrink-0 font-sans text-[12.5px] font-semibold ${
            OUTCOME_STYLE[outcome] ?? "text-white/60"
          }`}
        >
          {outcome}
        </span>
      </Link>
    </li>
  );
}
