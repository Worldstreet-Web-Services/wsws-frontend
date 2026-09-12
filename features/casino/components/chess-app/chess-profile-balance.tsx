"use client";

import Link from "next/link";
import { useBalanceVisibility } from "@/components/ui/balance-visibility";
import { useMoney } from "@/components/ui/currency-select";
import { LegacyChessBalance } from "@/features/casino/components/chess-app/legacy-chess-balance";
import { usePortfolio } from "@/hooks/use-portfolio";

export function ChessProfileBalance() {
  const { totalUsd, loading, error } = usePortfolio();
  const money = useMoney();
  const { mask } = useBalanceVisibility();
  const value = loading ? "…" : error ? "—" : mask(money.format(totalUsd));

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      style={{ marginInlineEnd: "16px" }}
    >
      <Link
        href="/casino"
        className="hidden h-9 shrink-0 items-center rounded-[9px] border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold tracking-[0.02em] text-white/60 no-underline transition-colors hover:border-white/20 hover:bg-white/[0.075] hover:text-white min-[1020px]:inline-flex"
        aria-label="Back to Arkade"
      >
        Arkade
      </Link>
      <LegacyChessBalance />
      <Link
        href="/dashboard"
        className="flex h-10 min-w-[104px] shrink-0 self-center items-center justify-end rounded-[10px] border border-white/10 bg-white/[0.045] px-3 text-right no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-white/20 hover:bg-white/[0.075]"
        aria-label={error ? "Profile balance unavailable" : `Profile balance ${value}`}
        data-sensitive="balance"
      >
        <span>
          <span className="block text-[8px] leading-none font-bold tracking-[0.11em] text-white/35 uppercase">
            Balance
          </span>
          <span className="tnum mt-1 block text-[12px] leading-none font-semibold text-white/80">
            {value}
          </span>
        </span>
      </Link>
    </div>
  );
}
