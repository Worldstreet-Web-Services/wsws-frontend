"use client";

import type { TradeSide } from "@/lib/trade/side";

export type { TradeSide };

import { useId } from "react";
import { ButtonSpinner } from "@/components/ui/button-spinner";
import { amountStatus } from "@/lib/trade/amount";

// The action end of a trade ticket. Buy and Sell are actions, so they carry
// the action tokens (bg-buy, bg-sell), never the price-delta colours.
//
// It lives here rather than under features/trade because none of the rule it
// enforces is specific to a desk. Every word it prints arrives through
// `labels`, so a desk binds its own message namespace on the way in and this
// file never reads a catalogue.
//
// ONE button, for the side the switch above has chosen. It used to render both
// at once, and that was the bug: a single amount field cannot be denominated in
// USDC and in the coin at the same time, so whichever button you were not
// looking at was reading the other leg's number as its own. Typing 100 to buy
// $100 of a coin had the Sell button reading it as 100 coins and refusing on a
// balance that had nothing to do with it.
//
// Each side is still gated against its own asset. Buying spends the pay token,
// so Buy is gated on the pay balance. Selling draws down the asset being sold
// and needs no pay balance at all, so gating Sell on the pay token would strand
// a user who holds the asset but little USDC: they could not close the
// position. A sell is the way out of a position, so its gate must be about the
// thing being sold and nothing else.
//
// Neither button is ever a silently dead control: whenever one is disabled a
// line says why and names the asset it is short of, and every button points at
// its reason through aria-describedby so it reaches a screen reader too.

// An asset one side of the ticket draws on.
export interface SideAsset {
  // Spendable balance, in this asset's own base units.
  balance: bigint;
  decimals: number;
  symbol: string;
}

// The asset Sell draws down. A union rather than a nullable balance, because
// `decimals` is only knowable from a holding: a market the wallet holds none of
// has no token record to read it from. Splitting the two cases keeps callers
// from inventing a decimals value for a balance that is never measured.
export type SellAsset =
  | SideAsset
  // The user holds none of it, or the holding has not loaded. Sell is disabled
  // and names the asset; it never falls back to the pay balance.
  | { balance: null; symbol: string };

// Every string the actions print. Three of the nine name an asset or its
// decimal limit, so they are functions rather than strings: filling a slot in a
// message is the catalogue's job, and this component has no catalogue. The
// caller closes over its own translator and hands the finished sentence back.
export interface TradeActionsLabels {
  // Shown in place of every other reason while an order is in flight.
  stageWaiting: string;
  ctaEnterAmount: string;
  ctaNoBalanceOf: (symbol: string) => string;
  amountTooPrecise: (symbol: string, decimals: number) => string;
  amountInvalid: string;
  // Shown on the sell leg before a market has been chosen at all.
  ctaSelect: string;
  noSellBalance: (symbol: string) => string;
  buy: string;
  sell: string;
}

export interface TradeActionsProps {
  // Which leg the switch has chosen. Decides which button is rendered, and so
  // which asset the amount is measured against.
  side: TradeSide;
  // The entered amount, as a decimal string. Handed back to the callback
  // untouched, so what executes is what was typed.
  amount: string;
  // What Buy spends. Checked against the amount in base units.
  pay: SideAsset;
  // What Sell draws down. Omit it when there is no sell leg at all, e.g. before
  // a market is chosen: Sell is disabled and asks for a market rather than
  // reporting a balance it was never given.
  sell?: SellAsset;
  onBuy: (amount: string) => void;
  onSell: (amount: string) => void;
  // The side currently executing, or null when nothing is in flight.
  pending?: TradeSide | null;
  labels: TradeActionsLabels;
}

export function TradeActions({
  side,
  amount,
  pay,
  sell,
  onBuy,
  onSell,
  pending = null,
  labels,
}: TradeActionsProps) {
  const baseId = useId();
  const inFlight = pending !== null;

  // While an order is in flight both sides are locked, whatever the balances
  // say, so the amount cannot move under a signature.
  const waiting = inFlight ? labels.stageWaiting : null;

  // Why one side cannot act on the entered amount, or null when it can. The
  // message names the asset, because the two sides are short of different
  // things and a bare "Not enough balance" would point at the wrong one.
  const amountReason = (balance: bigint, decimals: number, symbol: string): string | null => {
    const status = amountStatus(amount, balance, decimals);
    if (status === "ok") return null;
    if (status === "empty") return labels.ctaEnterAmount;
    if (status === "above-balance") return labels.ctaNoBalanceOf(symbol);
    if (status === "too-precise") return labels.amountTooPrecise(symbol, decimals);
    return labels.amountInvalid;
  };

  const buyReason = waiting ?? amountReason(pay.balance, pay.decimals, pay.symbol);

  const sellReason =
    waiting ??
    (sell === undefined
      ? labels.ctaSelect
      : sell.balance === null
        ? labels.noSellBalance(sell.symbol)
        : amountReason(sell.balance, sell.decimals, sell.symbol));

  const buying = side === "buy";
  const reason = buying ? buyReason : sellReason;
  const reasonId = `${baseId}-${side}`;

  return (
    <div className="flex w-full flex-col gap-2">
      <ActionButton
        label={buying ? labels.buy : labels.sell}
        tone={side}
        busy={pending === side}
        disabled={reason !== null}
        describedBy={reasonId}
        onClick={() => (buying ? onBuy(amount) : onSell(amount))}
      />
      <Reason id={reasonId} text={reason} />
    </div>
  );
}

// Always rendered, so aria-describedby resolves even when there is nothing to
// say. An empty reason is present but silent.
function Reason({ id, text }: { id: string; text: string | null }) {
  if (text === null) return <p id={id} aria-live="polite" className="sr-only" />;
  return (
    <p
      id={id}
      aria-live="polite"
      className="text-center text-[13px] font-medium text-[rgba(148,163,184,0.6)]"
    >
      {text}
    </p>
  );
}

function ActionButton({
  label,
  tone,
  busy,
  disabled,
  describedBy,
  onClick,
}: {
  label: string;
  tone: TradeSide;
  busy: boolean;
  disabled: boolean;
  describedBy: string;
  onClick: () => void;
}) {
  // The design set the label in Inter; production keeps its body face, Geist.
  //
  // The button must not carry flex-1. Its parent is a column, so flex-1 would
  // set flex-basis: 0% on the vertical axis, which replaces h-12 as the flex
  // base size; the column is content-height, so the button collapsed to the
  // 24px line box instead of the 48px the design draws. It is a fixed-height
  // control: h-12 for the height, w-full for the width the column gives it,
  // and shrink-0 so a shorter parent can never squeeze it again.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      aria-describedby={describedBy}
      className={`flex h-12 w-full shrink-0 items-center justify-center rounded-3xl font-sans text-[16px] font-semibold text-white transition-opacity disabled:opacity-45 ${
        tone === "buy" ? "bg-buy" : "bg-sell"
      }`}
    >
      {busy ? <ButtonSpinner /> : null}
      {label}
    </button>
  );
}
