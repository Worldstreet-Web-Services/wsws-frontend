"use client";

import { formatUsdc } from "@/lib/casino/cashier-money";
import type { ChessWager } from "@/lib/casino/api/types";

// What a game is being played for. Renders nothing when there is no wager,
// which is most games: a free game must not carry an empty money badge.
export function StakeBadge({ wager }: { wager: ChessWager | null }) {
  if (!wager) return null;

  return (
    <span className="border-accent/35 text-accent tnum rounded-full border px-2.5 py-1 font-sans text-[11.5px] font-semibold whitespace-nowrap">
      {formatUsdc(wager.stakeMicro)} USDC
    </span>
  );
}
