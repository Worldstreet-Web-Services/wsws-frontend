"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBuy } from "@/hooks/use-buy";
import { useSell } from "@/hooks/use-sell";
import { useDepositStatus } from "@/hooks/use-deposit";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usdcBaseUnits, depositProgress, type DepositStage } from "@/lib/deposit";
import { formatAmount, formatUsd, toBaseUnits } from "@/lib/trade/math";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { BuyRoute } from "@/lib/buy";
import type { TokenBalance } from "@/lib/server/alchemy";

// The order ticket only needs the selected market's ticker and logo; price comes
// in separately as `mark`.
export interface SpotTicketToken {
  symbol: string;
  logo: string | null;
}
import {
  SpotConfirmSheet,
  type SpotConfirmRow,
  type SpotOrderPhase,
} from "@/components/dashboard/trade/spot-confirm-sheet";

// The spot order ticket: buy with USDC or sell a held balance, market orders
// only (there is no order-monitoring backend for limit or TP/SL yet). The amount
// is entered here; the CTA opens a bottom confirm sheet that executes through the
// same buy/sell mutations the rest of the app uses, so nothing is re-entered.

type Side = "buy" | "sell";

interface SpotPanelProps {
  token: SpotTicketToken | null;
  mark: number;
  usdcBalance: number;
  // The held position in the base asset, if any (drives selling). Null when the
  // user holds none.
  heldToken: TokenBalance | null;
  // The Dextopus route a buy would settle through, or null when the asset is not
  // buyable. Presence of a route is what enables buying.
  buyRoute: BuyRoute | null;
}

const DECIMAL_INPUT = /^\d*\.?\d*$/;
const PERCENTS = [25, 50, 75, 100];
// Indicative taker fee shown on the ticket. The real price tolerance is applied
// by the quote at execution.
const FEE_PCT = 0.001;
const MIN_BUY_USD = 1;
const SLIPPAGE_BPS = 100;

// Plain-language settlement stage labels for the confirm sheet.
const STAGE_LABEL: Record<DepositStage, string> = {
  waiting: "Placing your order",
  detected: "Payment received",
  processing: "Almost there",
  settled: "All done",
  refunded: "Money returned",
  failed: "Order failed",
};

export function SpotPanel({ token, mark, usdcBalance, heldToken, buyRoute }: SpotPanelProps) {
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const buy = useBuy();
  const sell = useSell();
  const portfolio = usePortfolio();
  const status = useDepositStatus(requestId);

  const base = token?.symbol ?? "";
  const buying = side === "buy";
  const canBuy = buyRoute != null;
  const heldBalance = heldToken?.balance ?? 0;

  // Clear the amount when the market or side changes, so a figure meant for one
  // asset never carries into another.
  const [seen, setSeen] = useState(`${base}:${side}`);
  const key = `${base}:${side}`;
  if (seen !== key) {
    setSeen(key);
    setAmount("");
  }

  const balance = buying ? usdcBalance : heldBalance;
  const amountNum = parseFloat(amount) || 0;

  // Buy: pay USDC, receive base. Sell: sell base, receive USDC. Fee comes off the
  // received side either way.
  const receive = useMemo(() => {
    if (mark <= 0 || amountNum <= 0) return 0;
    const gross = buying ? amountNum / mark : amountNum * mark;
    return gross * (1 - FEE_PCT);
  }, [buying, amountNum, mark]);
  const feeUsd = buying ? amountNum * FEE_PCT : amountNum * mark * FEE_PCT;

  const notBuyable = buying && !canBuy;
  const overBalance = amountNum > balance + 1e-9;
  const belowMin = buying && amountNum > 0 && amountNum < MIN_BUY_USD;
  const invalid = amountNum <= 0 || overBalance || belowMin || notBuyable || !token || mark <= 0;

  // Settlement phase for the confirm sheet.
  const progress = status.data
    ? depositProgress(status.data.status, status.data.executionStatus)
    : depositProgress("", "");
  const stage = progress.stage;
  const phase: SpotOrderPhase = !requestId
    ? "confirm"
    : stage === "settled"
      ? "settled"
      : stage === "failed" || stage === "refunded"
        ? "failed"
        : "working";

  // Fire the result toast and refresh holdings once, when the order resolves.
  const resolvedRef = useRef(false);
  useEffect(() => {
    if (!requestId || resolvedRef.current) return;
    if (stage === "settled") {
      resolvedRef.current = true;
      toast.success(buying ? `Bought ${base}` : `Sold ${base}`);
      void portfolio.refetch();
    } else if (stage === "failed" || stage === "refunded") {
      resolvedRef.current = true;
      toast.error("Your order didn't go through. Any funds you sent were returned.");
    }
  }, [stage, requestId, buying, base, portfolio]);

  const handleAmount = (raw: string) => {
    const next = raw.replace(/,/g, "");
    if (next === "" || DECIMAL_INPUT.test(next)) setAmount(next);
  };
  const setPercent = (pct: number) => {
    if (balance <= 0) return;
    const v = (balance * pct) / 100;
    // Floor buys to cents so 100% never rounds above the USDC balance; sells keep
    // full precision and settle the exact held amount via rawBalance below.
    setAmount(buying ? (Math.floor(v * 100) / 100).toFixed(2) : String(v));
  };

  const submit = () => {
    if (invalid) return;
    setConfirmOpen(true);
  };

  const runOrder = async () => {
    try {
      if (buying) {
        if (!buyRoute) return;
        const result = await buy.mutateAsync({
          route: buyRoute,
          amount: usdcBaseUnits(amount),
          slippageBps: SLIPPAGE_BPS,
        });
        setRequestId(result.requestId);
      } else {
        if (!heldToken) return;
        // A full sell sends the exact on-chain balance; a partial sell converts
        // the typed amount at the asset's decimals.
        const amountUnits =
          amountNum >= heldBalance
            ? BigInt(heldToken.rawBalance)
            : toBaseUnits(amount, heldToken.decimals);
        const result = await sell.mutateAsync({
          network: heldToken.network,
          asset: heldToken.address,
          decimals: heldToken.decimals,
          amount: amountUnits,
          slippageBps: SLIPPAGE_BPS,
        });
        setRequestId(result.requestId);
      }
    } catch (e) {
      setConfirmOpen(false);
      toast.error(friendlyError(e, "That didn't go through."));
    }
  };

  // Cancel (before signing) just closes. Done (after a resolved order) resets the
  // ticket so the next order starts clean.
  const closeSheet = () => {
    if (phase === "working") return;
    setConfirmOpen(false);
    if (requestId) {
      setRequestId(null);
      resolvedRef.current = false;
      if (phase === "settled") setAmount("");
    }
  };

  const confirmRows: SpotConfirmRow[] = buying
    ? [
        { label: "Market", value: `${base}/USDC` },
        { label: "You pay", value: formatUsd(amountNum) },
        { label: "You receive", value: `${formatAmount(receive)} ${base}`, tone: "up" },
        { label: "Price", value: formatUsd(mark) },
        { label: "Est. fee", value: formatUsd(feeUsd) },
      ]
    : [
        { label: "Market", value: `${base}/USDC` },
        { label: "You sell", value: `${formatAmount(amountNum)} ${base}` },
        { label: "You receive", value: formatUsd(receive), tone: "up" },
        { label: "Price", value: formatUsd(mark) },
        { label: "Est. fee", value: formatUsd(feeUsd) },
      ];

  const cta = !token
    ? "Select a market"
    : notBuyable
      ? `${base} isn't available to buy yet`
      : amountNum <= 0
        ? "Enter an amount"
        : belowMin
          ? `Minimum ${formatUsd(MIN_BUY_USD)}`
          : overBalance
            ? "Not enough balance"
            : buying
              ? `Buy ${base}`
              : `Sell ${base}`;

  return (
    <div className="ws-card p-4 sm:p-5">
      {/* Buy / Sell. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("buy")}
          className={`cursor-pointer rounded-xl p-3 font-sans text-sm font-semibold transition-colors ${
            buying
              ? "border-up/40 bg-up/16 text-up border"
              : "border border-white/10 bg-white/4 text-white/55 hover:text-white/80"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide("sell")}
          className={`cursor-pointer rounded-xl p-3 font-sans text-sm font-semibold transition-colors ${
            !buying
              ? "border-down/40 bg-down/14 text-down border"
              : "border border-white/10 bg-white/4 text-white/55 hover:text-white/80"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Amount. */}
      <div className={`ws-inset mt-3 p-4 ${overBalance || belowMin ? "ws-invalid" : ""}`}>
        <div className="mb-2 flex items-center justify-between text-xs font-normal text-white/55">
          <span>{buying ? "You're paying" : "You're selling"}</span>
          <span className="flex items-center gap-2">
            <span className="tnum">
              Balance {formatAmount(balance)} {buying ? "USDC" : base}
            </span>
            {balance > 0 ? (
              <button
                onClick={() => setPercent(100)}
                className="text-accent cursor-pointer font-medium hover:opacity-80"
              >
                Max
              </button>
            ) : null}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <input
            value={amount}
            onChange={(e) => handleAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="ws-display tnum min-w-0 flex-1 bg-transparent text-[30px] text-white outline-none placeholder:text-white/30"
          />
          <span className="shrink-0 font-sans text-sm font-medium text-white/70">
            {buying ? "USDC" : base}
          </span>
        </div>
      </div>

      {/* Percent-of-balance quick fills. */}
      <div className="mt-2 grid grid-cols-4 gap-2">
        {PERCENTS.map((p) => (
          <button
            key={p}
            onClick={() => setPercent(p)}
            disabled={balance <= 0}
            className="tnum cursor-pointer rounded-lg border border-white/10 bg-white/4 py-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {p}%
          </button>
        ))}
      </div>

      {/* Summary. */}
      <div className="ws-inset mt-3 flex flex-col gap-2 p-4 text-[12.5px] font-normal">
        <div className="flex justify-between">
          <span className="text-white/55">Price</span>
          <span className="tnum text-white">{mark > 0 ? formatUsd(mark) : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/55">You receive</span>
          <span className="tnum text-white">
            {receive > 0 ? (buying ? `${formatAmount(receive)} ${base}` : formatUsd(receive)) : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/55">Est. fee</span>
          <span className="tnum text-white">{amountNum > 0 ? formatUsd(feeUsd) : "—"}</span>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={invalid}
        className={`mt-3 w-full rounded-[14px] p-[15px] font-sans text-[15px] font-semibold transition-opacity ${
          buying ? "bg-up text-up-ink" : "bg-down text-down-ink"
        } ${invalid ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-90"}`}
      >
        {cta}
      </button>
      {notBuyable ? (
        <p className="mt-2 text-center text-xs font-normal text-white/45">
          {base} isn&apos;t available to buy yet. You can still chart it, and sell it if you hold
          any.
        </p>
      ) : !buying && token && heldBalance <= 0 ? (
        <p className="mt-2 text-center text-xs font-normal text-white/45">
          You don&apos;t own any {base} to sell yet.
        </p>
      ) : null}

      <SpotConfirmSheet
        open={confirmOpen}
        side={side}
        base={base}
        logo={token?.logo}
        rows={confirmRows}
        phase={phase}
        progressPct={progress.pct}
        stageLabel={STAGE_LABEL[stage]}
        onConfirm={() => void runOrder()}
        onClose={closeSheet}
      />
    </div>
  );
}
