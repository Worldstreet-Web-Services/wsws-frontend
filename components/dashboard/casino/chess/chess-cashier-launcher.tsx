"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CashierSheet, type CashierMode } from "@/components/dashboard/casino/chess/cashier-sheet";
import { useChessCashierStatus } from "@/hooks/use-chess-cashier";
import { ModalShell } from "@/components/ui/modal-shell";
import { cn } from "@/lib/utils";

const CARD_BG =
  "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)";
const CARD_SHADOW =
  "inset 0 .1rem 0 0 rgba(255, 255, 255, 0.07), 0 .1rem .2rem 0 rgba(0, 0, 0, 0.20)";

interface ChessCashierLauncherProps {
  className?: string;
  compact?: boolean;
}

// The chess cashier exists behind a sheet, but the chess surfaces need a
// stable balance entry point so staking, joining, and spectator betting are not
// dead ends when the wallet is short. This component keeps that entry identical
// across lobby, create, play, invite, and watch.
export function ChessCashierLauncher({
  className,
  compact = false,
}: ChessCashierLauncherProps) {
  const t = useTranslations("casino.chess.cashier");
  const cashier = useChessCashierStatus();
  const [mode, setMode] = useState<CashierMode | null>(null);

  if (!cashier.configured) return null;

  return (
    <>
      <div
        className={cn("rounded-[16px] border border-white/6", compact ? "px-4 py-4" : "px-4 py-4", className)}
        style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className={cn("font-extrabold text-white", compact ? "text-[1.02rem]" : "text-[1.08rem]")}>
            {t("title")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[10px] border border-white/6 bg-black/10 px-3 py-2.5">
            <div className="mb-1 text-[11px] uppercase tracking-[0.05em] text-white/38">
              {t("available")}
            </div>
            <div className="tnum text-[1rem] font-semibold text-white">{cashier.available} USDC</div>
          </div>
          <div className="rounded-[10px] border border-white/6 bg-black/10 px-3 py-2.5">
            <div className="mb-1 text-[11px] uppercase tracking-[0.05em] text-white/38">
              {t("locked")}
            </div>
            <div className="tnum text-[1rem] font-semibold text-white">{cashier.locked} USDC</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2.5">
          <button
            type="button"
            onClick={() => setMode("deposit")}
            className="flex-1 cursor-pointer rounded-full bg-[#8B847B] px-4 py-2.5 font-sans text-[12px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-105"
          >
            {t("deposit")}
          </button>
          <button
            type="button"
            onClick={() => setMode("withdraw")}
            className="flex-1 cursor-pointer rounded-full border border-white/12 bg-white/4 px-4 py-2.5 font-sans text-[12px] font-bold text-white/82 transition-colors hover:border-white/24 hover:bg-white/8 hover:text-white"
          >
            {t("withdraw")}
          </button>
        </div>
      </div>

      <ModalShell
        open={mode !== null}
        onClose={() => setMode(null)}
        contentKey={`chess-cashier-${mode ?? "closed"}`}
      >
        <CashierSheet onClose={() => setMode(null)} initialMode={mode ?? "deposit"} />
      </ModalShell>
    </>
  );
}
