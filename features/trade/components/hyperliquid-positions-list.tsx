"use client";

import { useState } from "react";
import { formatAmount } from "@/lib/trade/math";
import { friendlyError } from "@/lib/errors";
import { HyperliquidClosePositionModal } from "@/features/trade/components/hyperliquid-close-position-modal";
import { HyperliquidHistoryModal } from "@/features/trade/components/hyperliquid-history-modal";
import type {
  HlOrderRow,
  HlPositionView,
  HlTriggerKind,
} from "@/features/trade/lib/hyperliquid-types";

interface HyperliquidPositionsListProps {
  positions: HlPositionView[];
  orders: HlOrderRow[];
  loading: boolean;
  busy: boolean;
  walletId: string | null;
  onClosePosition: (position: HlPositionView, siblingOrderIdsToCancel: string[]) => Promise<void>;
  onEditTrigger: (
    position: HlPositionView,
    kind: HlTriggerKind,
    triggerPrice: string,
    existingOrderId: string | undefined
  ) => Promise<void>;
}

const RESTING_STATUSES = new Set(["submitted", "open", "partially_filled"]);
const DECIMAL_INPUT = /^\d*\.?\d*$/;

function findTrigger(
  orders: HlOrderRow[],
  position: HlPositionView,
  kind: HlTriggerKind
): HlOrderRow | undefined {
  return orders.find(
    (o) =>
      o.parentOrderId === position.entryOrderId &&
      o.orderType === kind &&
      RESTING_STATUSES.has(o.status)
  );
}

export function HyperliquidPositionsList({
  positions,
  orders,
  loading,
  busy,
  walletId,
  onClosePosition,
  onEditTrigger,
}: HyperliquidPositionsListProps) {
  const [closing, setClosing] = useState<HlPositionView | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expanded, setExpanded] = useState<{ positionId: string; kind: HlTriggerKind } | null>(
    null
  );
  const [triggerPrice, setTriggerPrice] = useState("");
  const [triggerBusy, setTriggerBusy] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  const toggleTrigger = (positionId: string, kind: HlTriggerKind, existingPrice?: string) => {
    setTriggerError(null);
    if (expanded?.positionId === positionId && expanded.kind === kind) {
      setExpanded(null);
      return;
    }
    setExpanded({ positionId, kind });
    setTriggerPrice(existingPrice ?? "");
  };

  const saveTrigger = async (position: HlPositionView, kind: HlTriggerKind) => {
    if (!triggerPrice) return;
    setTriggerBusy(true);
    setTriggerError(null);
    try {
      const existing = findTrigger(orders, position, kind);
      await onEditTrigger(position, kind, triggerPrice, existing?.id);
      setExpanded(null);
      setTriggerPrice("");
    } catch (error) {
      setTriggerError(friendlyError(error, "Failed to update."));
    } finally {
      setTriggerBusy(false);
    }
  };

  const confirmClose = async (position: HlPositionView) => {
    const siblingIds = orders
      .filter(
        (o) =>
          o.parentOrderId === position.entryOrderId &&
          (o.orderType === "take_profit" || o.orderType === "stop_loss") &&
          RESTING_STATUSES.has(o.status)
      )
      .map((o) => o.id);
    await onClosePosition(position, siblingIds);
  };

  return (
    <div className="ws-card p-4 sm:p-5" data-sensitive="position">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-normal text-white/55">Open positions</span>
        <button
          onClick={() => setHistoryOpen(true)}
          disabled={!walletId}
          className="cursor-pointer rounded-full border border-white/14 bg-white/6 px-3 py-1 text-[11.5px] font-medium text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          History
        </button>
      </div>
      {loading ? (
        <p className="text-xs font-normal text-white/45">Loading…</p>
      ) : positions.length === 0 ? (
        <p className="text-xs font-normal text-white/45">No open positions.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {positions.map((position) => {
            const pnl =
              position.unrealizedPnlUsdc != null ? Number(position.unrealizedPnlUsdc) : null;
            const takeProfit = findTrigger(orders, position, "take_profit");
            const stopLoss = findTrigger(orders, position, "stop_loss");
            const isExpanded = (kind: HlTriggerKind) =>
              expanded?.positionId === position.id && expanded.kind === kind;

            return (
              <div key={position.id} className="ws-inset flex flex-col gap-2 p-3 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                        position.side === "long" ? "bg-up/16 text-up" : "bg-down/14 text-down"
                      }`}
                    >
                      {position.side === "long" ? "LONG" : "SHORT"}
                    </span>
                    <span className="tnum text-white">{formatAmount(Number(position.size))}</span>
                    <span className="text-white/45">@ {position.entryPrice}</span>
                    <span className="text-white/45">
                      {position.leverage}x {position.marginMode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/45">mark {position.markPrice ?? "—"}</span>
                    <span
                      className={`tnum font-semibold ${pnl != null && pnl >= 0 ? "text-up" : "text-down"}`}
                    >
                      {pnl != null ? `${pnl >= 0 ? "+" : ""}${formatAmount(pnl)} USDC` : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      toggleTrigger(position.id, "take_profit", takeProfit?.limitPrice ?? undefined)
                    }
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      takeProfit
                        ? "bg-up/12 text-up"
                        : "bg-white/6 text-white/45 hover:text-white/70"
                    }`}
                  >
                    {takeProfit ? `TP @ ${takeProfit.limitPrice}` : "Add TP"}
                  </button>
                  <button
                    onClick={() =>
                      toggleTrigger(position.id, "stop_loss", stopLoss?.limitPrice ?? undefined)
                    }
                    className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      stopLoss
                        ? "bg-down/12 text-down"
                        : "bg-white/6 text-white/45 hover:text-white/70"
                    }`}
                  >
                    {stopLoss ? `SL @ ${stopLoss.limitPrice}` : "Add SL"}
                  </button>
                  <button
                    onClick={() => setClosing(position)}
                    disabled={busy}
                    className="hover:bg-down/16 hover:text-down ml-auto cursor-pointer rounded-lg bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Close
                  </button>
                </div>

                {isExpanded("take_profit") || isExpanded("stop_loss") ? (
                  <div className="flex items-center gap-2 border-t border-white/8 pt-2">
                    <input
                      value={triggerPrice}
                      onChange={(e) => {
                        const next = e.target.value.replace(/,/g, "");
                        if (next === "" || DECIMAL_INPUT.test(next)) setTriggerPrice(next);
                      }}
                      inputMode="decimal"
                      placeholder={
                        expanded?.kind === "take_profit" ? "Take profit price" : "Stop loss price"
                      }
                      className="tnum ws-inset min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-white outline-none placeholder:text-white/30"
                    />
                    <button
                      onClick={() => void saveTrigger(position, expanded!.kind)}
                      disabled={triggerBusy || !triggerPrice}
                      className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {triggerBusy ? "Saving…" : "Save"}
                    </button>
                  </div>
                ) : null}
                {triggerError && expanded?.positionId === position.id ? (
                  <p className="text-down text-[11px] font-normal">{triggerError}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <HyperliquidClosePositionModal
        position={closing}
        onClose={() => setClosing(null)}
        onConfirm={confirmClose}
      />
      <HyperliquidHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        walletId={walletId}
      />
    </div>
  );
}
