"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/trade/math";
import { friendlyError } from "@/lib/errors";
import {
  isBridgeMinimumDetails,
  isInsufficientMarginDetails,
} from "@/features/trade/lib/hyperliquid-types";
import type {
  HlMarginMode,
  HlOrderSide,
  PlaceOrderResult,
} from "@/features/trade/lib/hyperliquid-types";
import type { GatewayApiError } from "@/lib/api/envelope";

interface HyperliquidOrderFormProps {
  assetSymbol: string;
  maxLeverage: number;
  markPrice: number;
  /** Base-unit decimal precision for this asset — sizes the percent slider rounds to. */
  szDecimals: number;
  /** Withdrawable HyperCore margin, USDC — the percent slider's 100% basis. */
  availableMarginUsdc: number;
  walletReady: boolean;
  busy: boolean;
  onSubmit: (
    input: {
      assetSymbol: string;
      side: HlOrderSide;
      size: string;
      limitPrice?: string;
      takeProfitPrice?: string;
      stopLossPrice?: string;
    },
    onStatus?: (status: string) => void
  ) => Promise<PlaceOrderResult>;
  onUpdateLeverage: (
    assetSymbol: string,
    leverage: number,
    marginMode: HlMarginMode
  ) => Promise<void>;
}

const DECIMAL_INPUT = /^\d*\.?\d*$/;
const SIZE_PERCENTS = [25, 50, 75, 100];
type OrderKind = "market" | "limit";
// Hyperliquid rejects any order below this notional outright — enforced
// client-side too so a tiny amount fails fast with a clear reason instead
// of round-tripping to Hyperliquid first (error: "Order must have minimum
// value of $10").
const MIN_ORDER_NOTIONAL_USDC = 10;
type StatusKind = "info" | "success" | "error";
interface FormStatus {
  text: string;
  kind: StatusKind;
}

// Entry (market or limit) with optional TP/SL, plus a leverage/margin-mode
// control for the asset selected above (see HyperliquidAssetPicker). One form
// drives both prepareOrder/submitOrder and prepareLeverageUpdate/submitLeverageUpdate
// — each is its own client-signed round trip (see hyperliquid-actions.ts).
export function HyperliquidOrderForm({
  assetSymbol,
  maxLeverage,
  markPrice,
  szDecimals,
  availableMarginUsdc,
  walletReady,
  busy,
  onSubmit,
  onUpdateLeverage,
}: HyperliquidOrderFormProps) {
  const [side, setSide] = useState<HlOrderSide>("buy");
  const [orderKind, setOrderKind] = useState<OrderKind>("market");
  // Trading amount is always entered in USDC — size (the asset's own base
  // units, what Hyperliquid's API actually wants) is derived from it at
  // submit time, matching how the simple view already works.
  const [amountUsdc, setAmountUsdc] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [leverage, setLeverage] = useState(Math.min(5, maxLeverage));
  const [marginMode, setMarginMode] = useState<HlMarginMode>("cross");
  const [status, setStatus] = useState<FormStatus | null>(null);

  // Clears itself a few seconds after the action actually finishes — never
  // while `busy` (that would wipe the live "bridging…" / "placing order…"
  // progress text mid-flight), only once a final success/error message is
  // showing.
  useEffect(() => {
    if (!status || busy) return;
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status, busy]);

  const decimalField =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value.replace(/,/g, "");
      if (next === "" || DECIMAL_INPUT.test(next)) setter(next);
    };

  const selectOrderKind = (kind: OrderKind) => {
    setOrderKind(kind);
    if (kind === "market") setLimitPrice("");
  };

  // The percent slider's 100% is the wallet's actual perps balance — plain
  // and literal, not scaled by leverage.
  const maxUsdc = availableMarginUsdc;
  const setSizePercent = (pct: number) => {
    if (maxUsdc <= 0) return;
    setAmountUsdc((Math.floor(((maxUsdc * pct) / 100) * 100) / 100).toFixed(2));
  };

  const amountUsdcNum = Number(amountUsdc) || 0;
  const sizeDecimals = Math.max(0, Math.min(8, szDecimals));
  const sizeBaseUnits = markPrice > 0 ? amountUsdcNum / markPrice : 0;
  const size = sizeBaseUnits > 0 ? sizeBaseUnits.toFixed(sizeDecimals) : "";
  // Advisory only — never blocks submission. placeOrder already auto-bridges
  // and retries when the perps wallet alone falls short (see
  // hyperliquid-actions.ts), so this can under-count real buying power; it's
  // a fast, honest hint, not the authoritative check.
  const insufficientBalance = amountUsdcNum > 0 && amountUsdcNum > maxUsdc;
  // Unlike insufficientBalance, this ALWAYS blocks — no retry or auto-bridge
  // fixes an order Hyperliquid rejects outright for being too small.
  const belowMinimumOrder = amountUsdcNum > 0 && amountUsdcNum < MIN_ORDER_NOTIONAL_USDC;

  const handleSubmit = async () => {
    if (!assetSymbol || !size || belowMinimumOrder) return;
    if (orderKind === "limit" && !limitPrice) return;
    setStatus({ text: "Placing order…", kind: "info" });
    try {
      await onSubmit(
        {
          assetSymbol,
          side,
          size,
          limitPrice: orderKind === "limit" ? limitPrice : undefined,
          takeProfitPrice: takeProfitPrice || undefined,
          stopLossPrice: stopLossPrice || undefined,
        },
        (text) => setStatus({ text, kind: "info" })
      );
      setStatus({
        text:
          orderKind === "market"
            ? `${side === "buy" ? "Long" : "Short"} ${assetSymbol} opened.`
            : `${side === "buy" ? "Buy" : "Sell"} order for ${assetSymbol} placed.`,
        kind: "success",
      });
      setAmountUsdc("");
      setLimitPrice("");
      setTakeProfitPrice("");
      setStopLossPrice("");
    } catch (error) {
      const details = (error as GatewayApiError)?.details;
      if (isInsufficientMarginDetails(details)) {
        setStatus({
          text: `Still short on balance after automatically topping up (have $${details.withdrawableUsdc}, need $${details.requiredUsdc}) — top up your perps wallet above, then retry.`,
          kind: "error",
        });
        return;
      }
      if (isBridgeMinimumDetails(details)) {
        setStatus({
          text: `Insufficient balance — minimum is $${details.minDepositUsdc} (you have $${details.arbitrumBalanceUsdc}). Top up above, then retry.`,
          kind: "error",
        });
        return;
      }
      setStatus({ text: friendlyError(error, "Order failed."), kind: "error" });
    }
  };

  const handleLeverage = async () => {
    if (!assetSymbol) return;
    setStatus(null);
    try {
      await onUpdateLeverage(assetSymbol, leverage, marginMode);
      setStatus({
        text: `Leverage set to ${leverage}x (${marginMode}) for ${assetSymbol}.`,
        kind: "success",
      });
    } catch (error) {
      setStatus({
        text: friendlyError(error, "Leverage update failed."),
        kind: "error",
      });
    }
  };

  return (
    <div className="ws-card p-4 sm:p-5">
      <div className="mb-3 text-xs font-normal text-white/55">Place an order</div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("buy")}
          className={`cursor-pointer rounded-xl p-3 text-sm font-semibold transition-colors ${
            side === "buy"
              ? "border-up/40 bg-up/16 text-up border"
              : "border border-white/10 bg-white/4 text-white/55"
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`cursor-pointer rounded-xl p-3 text-sm font-semibold transition-colors ${
            side === "sell"
              ? "border-down/40 bg-down/14 text-down border"
              : "border border-white/10 bg-white/4 text-white/55"
          }`}
        >
          Short
        </button>
      </div>

      <div className="mt-3 flex gap-1 rounded-xl bg-white/4 p-1">
        {(["market", "limit"] as OrderKind[]).map((kind) => (
          <button
            key={kind}
            onClick={() => selectOrderKind(kind)}
            className={`flex-1 cursor-pointer rounded-lg py-1.5 text-[12.5px] font-semibold capitalize transition-colors ${
              orderKind === kind ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70"
            }`}
          >
            {kind}
          </button>
        ))}
      </div>

      <div className="ws-inset mt-3 p-4">
        <div className="mb-2 flex items-center justify-between text-xs font-normal text-white/55">
          <span>Amount (USDC)</span>
          <span className="tnum text-white/40">
            {sizeBaseUnits > 0 ? `≈ ${formatAmount(sizeBaseUnits)} ${assetSymbol}` : null}
          </span>
        </div>
        <input
          value={amountUsdc}
          onChange={decimalField(setAmountUsdc)}
          inputMode="decimal"
          placeholder="0"
          className="tnum w-full bg-transparent text-2xl text-white outline-none placeholder:text-white/30"
        />
        {belowMinimumOrder ? (
          <p className="text-down mt-1.5 text-[11.5px] font-normal">
            Minimum order is ${MIN_ORDER_NOTIONAL_USDC}.
          </p>
        ) : insufficientBalance ? (
          <p className="text-down mt-1.5 text-[11.5px] font-normal">Insufficient balance.</p>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {SIZE_PERCENTS.map((pct) => (
          <button
            key={pct}
            onClick={() => setSizePercent(pct)}
            disabled={maxUsdc <= 0}
            className="tnum flex-1 cursor-pointer rounded-lg border border-white/10 bg-white/4 py-1.5 text-[11.5px] font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pct === 100 ? "Max" : `${pct}%`}
          </button>
        ))}
      </div>

      {orderKind === "limit" ? (
        <div className="ws-inset mt-3 p-3">
          <div className="mb-1 text-xs font-normal text-white/55">Limit price</div>
          <input
            value={limitPrice}
            onChange={decimalField(setLimitPrice)}
            inputMode="decimal"
            placeholder={markPrice > 0 ? markPrice.toString() : "0"}
            className="tnum w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="ws-inset p-3">
          <div className="mb-1 text-xs font-normal text-white/55">Take profit (optional)</div>
          <input
            value={takeProfitPrice}
            onChange={decimalField(setTakeProfitPrice)}
            inputMode="decimal"
            placeholder="None"
            className="tnum w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
        <div className="ws-inset p-3">
          <div className="mb-1 text-xs font-normal text-white/55">Stop loss (optional)</div>
          <input
            value={stopLossPrice}
            onChange={decimalField(setStopLossPrice)}
            inputMode="decimal"
            placeholder="None"
            className="tnum w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </div>
      </div>

      <button
        onClick={() => void handleSubmit()}
        disabled={
          busy ||
          !walletReady ||
          !assetSymbol ||
          !size ||
          belowMinimumOrder ||
          (orderKind === "limit" && !limitPrice)
        }
        className={`mt-3 w-full cursor-pointer rounded-[14px] p-[15px] text-[15px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
          side === "buy" ? "bg-up text-up-ink" : "bg-down text-down-ink"
        }`}
      >
        {busy
          ? (status?.text ?? "Placing order…")
          : `${side === "buy" ? "Long" : "Short"} ${assetSymbol || ""}`}
      </button>

      <div className="ws-inset mt-4 flex flex-wrap items-center gap-3 p-4">
        <div className="text-xs font-normal text-white/55">Leverage</div>
        <input
          type="range"
          min={1}
          max={Math.max(1, maxLeverage)}
          step={1}
          value={Math.min(leverage, maxLeverage)}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="accent-accent h-1.5 flex-1"
        />
        <span className="tnum text-sm font-semibold text-white">
          {Math.min(leverage, maxLeverage)}x
        </span>
        <select
          value={marginMode}
          onChange={(e) => setMarginMode(e.target.value as HlMarginMode)}
          className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white outline-none"
        >
          <option value="cross" className="bg-black">
            cross
          </option>
          <option value="isolated" className="bg-black">
            isolated
          </option>
        </select>
        <button
          onClick={() => void handleLeverage()}
          disabled={busy || !walletReady || !assetSymbol}
          className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Update
        </button>
      </div>

      {status ? (
        <p
          className={`mt-3 text-xs font-normal ${
            status.kind === "error"
              ? "text-down"
              : status.kind === "success"
                ? "text-up"
                : "text-white/70"
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
