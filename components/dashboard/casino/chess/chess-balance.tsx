"use client";

import { useState } from "react";
import { CashierSheet } from "@/components/dashboard/casino/chess/cashier-sheet";
import { useCashierConfig, usePlayerBalance } from "@/hooks/use-chess-cashier";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";
import { formatUsdc } from "@/lib/casino/cashier-money";

// The chess balance, and the way into the cashier. Renders nothing at all on a
// deployment without a cashier, so a service that cannot take money never shows
// a control implying it can.
export function ChessBalance() {
  const wallet = useCasinoWallet();
  const { enabled } = useCashierConfig();
  const { availableMicro, lockedMicro, isLoading } = usePlayerBalance();
  const [open, setOpen] = useState(false);

  if (!enabled || !wallet.connected) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ws-inset flex cursor-pointer items-center gap-2.5 rounded-full px-4 py-2 transition-colors hover:border-white/30"
      >
        <span className="font-sans text-[11.5px] font-normal text-white/45">Balance</span>
        <span className="ws-display tnum text-[14px] text-white">
          {isLoading ? "…" : `${formatUsdc(availableMicro ?? 0n)} USDC`}
        </span>
        {lockedMicro && lockedMicro > 0n ? (
          <span className="tnum font-sans text-[11.5px] font-normal text-white/40">
            {formatUsdc(lockedMicro)} in play
          </span>
        ) : null}
      </button>

      <CashierSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
