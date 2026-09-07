"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMoney } from "@/components/ui/currency-select";
import {
  usePolymarketPositions,
  type PolymarketPosition,
} from "@/features/prediction/hooks/use-polymarket-positions";
import {
  CashoutError,
  type CashOutQuote,
  usePolymarketCashout,
} from "@/features/prediction/hooks/use-polymarket-cashout";
import { SettleError, useSettleToBase } from "@/features/prediction/hooks/use-settle";
import { betSlip, isCashoutable } from "@/features/prediction/lib/positions";
import { toast } from "@/lib/toast";
import { activeCashoutPositions } from "../cashout-presenter";

interface CashoutBetsPanelProps {
  reconciliationRequired?: boolean;
  onReconciled?: () => void;
}

function numeric(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function closedAt(value: number | null | undefined): string | null {
  if (!value) return null;
  const milliseconds = value < 1_000_000_000_000 ? value * 1_000 : value;
  const date = new Date(milliseconds);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CashoutBetsPanel({
  reconciliationRequired = false,
  onReconciled,
}: CashoutBetsPanelProps) {
  const positions = usePolymarketPositions();
  const cashout = usePolymarketCashout();
  const settle = useSettleToBase();
  const money = useMoney();
  const [confirming, setConfirming] = useState<{
    position: PolymarketPosition;
    quote: CashOutQuote;
  } | null>(null);
  const active = activeCashoutPositions(positions.positions);
  const recent = positions.closedPositions;
  const refreshPositions = positions.refresh;

  const reviewNotice = reconciliationRequired ? (
    <div className="border-b border-amber-200/12 bg-amber-200/[0.055] px-4 py-3">
      <p className="text-[10px] leading-4 font-semibold text-amber-100/75">
        The previous submission has an unknown result. Compare the positions below with your
        Polymarket account before submitting those orders again.
      </p>
      {positions.loaded && !positions.loading ? (
        <button
          type="button"
          onClick={onReconciled}
          className="mt-2 h-8 cursor-pointer rounded-[6px] border border-amber-100/18 px-3 text-[10px] font-black text-amber-50 hover:bg-amber-100/8"
        >
          I checked my positions
        </button>
      ) : null}
    </div>
  ) : null;

  useEffect(() => {
    void refreshPositions();
  }, [refreshPositions]);

  async function prepareCashout(position: PolymarketPosition) {
    const slip = betSlip(position);
    if (!isCashoutable(slip.redeemable, slip.shares, slip.tokenId)) return;
    const toastId = toast.loading("Checking the live cashout price...");
    try {
      const quote = await cashout.quoteCashOut({
        tokenId: slip.tokenId as string,
        shares: slip.shares,
      });
      setConfirming({ position, quote });
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(error instanceof CashoutError ? error.message : "Couldn't quote this cashout.", {
        id: toastId,
      });
    }
  }

  async function sell(position: PolymarketPosition, quote: CashOutQuote) {
    const slip = betSlip(position);
    if (!isCashoutable(slip.redeemable, slip.shares, slip.tokenId)) return;
    const toastId = toast.loading("Cashing out position...");
    try {
      const result = await cashout.cashOut({
        tokenId: slip.tokenId as string,
        shares: slip.shares,
        confirmedPrice: quote.averagePrice,
      });
      await positions.refresh();
      if (result.settlementPending) {
        toast.success(
          `Sold for ${money.formatExact(result.proceedsUsd)} pUSD. Polymarket settlement is still confirming; do not sell it again.`,
          { id: toastId }
        );
        return;
      }

      try {
        await settle.settleToBase();
        await positions.refresh();
        toast.success(
          `Sold for ${money.formatExact(result.proceedsUsd)} pUSD. Sending it to your Base USDC balance now.`,
          { id: toastId }
        );
      } catch (settlementError) {
        await positions.refresh();
        const reason =
          settlementError instanceof SettleError
            ? settlementError.message
            : "The Base transfer couldn't start.";
        toast.error(
          `The position sold for ${money.formatExact(result.proceedsUsd)} pUSD. ${reason}`,
          { id: toastId }
        );
      }
    } catch (error) {
      toast.error(
        error instanceof CashoutError ? error.message : "Couldn't cash out this position.",
        { id: toastId }
      );
    }
  }

  async function moveBalanceToBase() {
    const toastId = toast.loading("Moving prediction balance to Base...");
    try {
      await settle.settleToBase();
      await positions.refresh();
      toast.success("Cashout is on the way to Base. Your USDC balance updates automatically.", {
        id: toastId,
      });
    } catch (error) {
      toast.error(error instanceof SettleError ? error.message : "Couldn't move funds to Base.", {
        id: toastId,
      });
    }
  }

  const balancePanel =
    positions.loaded && positions.cashable != null && positions.cashable > 0 ? (
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.025] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold tracking-[0.08em] text-white/30 uppercase">
            Available cashout
          </p>
          <p className="mt-0.5 text-[13px] font-black text-white tabular-nums">
            {money.formatExact(positions.cashable)} available
          </p>
        </div>
        <button
          type="button"
          onClick={() => void moveBalanceToBase()}
          disabled={settle.phase !== "idle" || cashout.phase !== "idle"}
          className="h-8 shrink-0 cursor-pointer rounded-[6px] bg-white px-3 text-[10px] font-black text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {settle.phase === "idle" ? "Move to Base" : "Moving..."}
        </button>
      </div>
    ) : null;

  if (positions.error) {
    return (
      <>
        {reviewNotice}
        <div className="px-5 py-10 text-center">
          <p className="text-[11px] leading-5 text-red-200/75">{positions.error}</p>
          <button
            type="button"
            onClick={() => void positions.refresh()}
            className="mt-3 cursor-pointer rounded-[7px] border border-white/10 px-3 py-2 text-[10px] font-bold text-white/65 hover:bg-white/6"
          >
            Try again
          </button>
        </div>
      </>
    );
  }

  if (!positions.loaded) {
    return (
      <>
        {reviewNotice}
        <div className="px-5 py-12 text-center text-[12px] text-white/38">Loading positions...</div>
      </>
    );
  }

  if (positions.loaded && active.length === 0 && recent.length === 0) {
    return (
      <>
        {reviewNotice}
        {balancePanel}
        <div className="px-5 py-12 text-center">
          <div className="mx-auto h-px w-10 bg-white/12" />
          <p className="mt-4 text-[13px] font-bold text-white/62">No open positions</p>
          <p className="mx-auto mt-1.5 max-w-[220px] text-[10px] leading-4 text-white/30">
            Open positions that can be sold before settlement will appear here.
          </p>
          <button
            type="button"
            onClick={() => void positions.refresh()}
            disabled={positions.loading}
            className="mt-4 h-8 cursor-pointer rounded-[6px] border border-white/10 px-3 text-[10px] font-bold text-white/65 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {positions.loading ? "Refreshing..." : "Refresh positions"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {reviewNotice}
      {balancePanel}
      <div className="max-h-[430px] [scrollbar-width:thin] overflow-y-auto">
        {active.length > 0 ? (
          <div className="border-b border-white/7 px-4 py-2 text-[9px] font-black tracking-[0.1em] text-white/32 uppercase">
            Open positions
          </div>
        ) : null}
        {active.map((position, index) => {
          const slip = betSlip(position);
          const cashoutable = isCashoutable(slip.redeemable, slip.shares, slip.tokenId);
          return (
            <article
              key={`${slip.conditionId ?? slip.market}:${slip.tokenId ?? index}`}
              className="border-b border-white/7 px-4 py-3.5 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[11px] leading-4 font-bold text-white/72">
                    {slip.market}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-white/38">
                    {slip.outcome} · {slip.shares.toFixed(2)} shares
                  </p>
                </div>
                <strong className="shrink-0 text-[12px] font-black text-white tabular-nums">
                  {money.formatExact(slip.currentValue)}
                </strong>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/6 pt-3">
                <span className="text-[9px] font-semibold text-white/28">
                  Staked {money.formatExact(slip.staked)}
                </span>
                <button
                  type="button"
                  onClick={() => void prepareCashout(position)}
                  disabled={!cashoutable || cashout.phase !== "idle" || settle.phase !== "idle"}
                  className="h-8 cursor-pointer rounded-[6px] bg-white px-3 text-[10px] font-black text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cashout.phase === "idle" && settle.phase === "idle"
                    ? "Cash out"
                    : "Processing..."}
                </button>
              </div>
            </article>
          );
        })}
        {recent.length > 0 ? (
          <div className="border-y border-white/7 bg-white/[0.018] px-4 py-2 text-[9px] font-black tracking-[0.1em] text-white/32 uppercase">
            Recent bets
          </div>
        ) : null}
        {recent.map((position, index) => {
          const averagePrice = numeric(position.avgPrice);
          const shares = numeric(position.totalBought);
          const staked = averagePrice * shares;
          const realizedPnl = numeric(position.realizedPnl);
          const date = closedAt(position.timestamp == null ? null : Number(position.timestamp));
          return (
            <article
              key={`closed:${position.conditionId ?? position.title ?? index}:${position.tokenId ?? index}`}
              className="border-b border-white/7 px-4 py-3.5 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[11px] leading-4 font-bold text-white/72">
                    {position.title?.trim() || "Market"}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-white/38">
                    {position.outcome?.trim() || "Outcome"} · Closed{date ? ` ${date}` : ""}
                  </p>
                </div>
                <strong
                  className={`shrink-0 text-[12px] font-black tabular-nums ${
                    realizedPnl >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {realizedPnl >= 0 ? "+" : ""}
                  {money.formatExact(realizedPnl)}
                </strong>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/6 pt-3 text-[9px] font-semibold text-white/28">
                <span>{shares.toFixed(2)} shares</span>
                <span>Staked {money.formatExact(staked)}</span>
              </div>
            </article>
          );
        })}
      </div>

      {confirming ? (
        <ConfirmDialog
          title="Confirm cashout"
          rows={[
            { label: "Market", value: betSlip(confirming.position).market },
            { label: "Outcome", value: betSlip(confirming.position).outcome },
            {
              label: "Executable cashout",
              value: money.formatExact(confirming.quote.proceedsUsd),
            },
            {
              label: "Change vs stake",
              value: money.formatExact(
                confirming.quote.proceedsUsd - betSlip(confirming.position).staked
              ),
              tone:
                confirming.quote.proceedsUsd >= betSlip(confirming.position).staked ? "up" : "down",
            },
          ]}
          warning={
            confirming.quote.proceedsUsd < betSlip(confirming.position).staked * 0.95
              ? `Warning: this locks in a loss of ${money.formatExact(
                  betSlip(confirming.position).staked - confirming.quote.proceedsUsd
                )}. The order will be rejected if the live bid moves materially lower.`
              : "This sells the full position at the quoted live bid. The order is rejected if the price moves materially lower."
          }
          cancelLabel="Keep position"
          continueLabel="Cash out"
          onCancel={() => setConfirming(null)}
          onContinue={() => {
            const { position, quote } = confirming;
            setConfirming(null);
            void sell(position, quote);
          }}
        />
      ) : null}
    </>
  );
}
