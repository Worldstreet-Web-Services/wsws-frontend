"use client";

import { useCallback, useState } from "react";
import { OrderSide, OrderType } from "@polymarket/client";
import { friendlyError } from "@/lib/errors";
import { usePolymarketSession, type SessionStatus } from "@/hooks/use-polymarket-session";
import { usePolymarketFunding } from "@/hooks/use-polymarket-funding";
import { BUILDER_CODE } from "@/lib/polymarket/config";

export type BetPhase = "idle" | "placing" | "funding" | "settling";

// How long to keep retrying the bet while the deposit bridge credits pUSD.
const SETTLE_POLL_MS = 5000;
const SETTLE_MAX_MS = 120_000;

// A market buy must cross the spread to fill. maxPrice is the highest price per
// share we accept, so set it a little above the estimate: the order still fills
// at the real ask (never worse), but a normal spread or a small book move
// between estimate and placement no longer kills a Fill-and-Kill order.
const PRICE_SLIPPAGE = 0.03;
// Prediction prices are 0..1. Cap just below 1, and round to whole cents so the
// price is always a valid tick (0.01 divides every market's tick size).
const MAX_SHARE_PRICE = 0.99;

function crossingPrice(estimate: number): number {
  const bumped = Math.ceil(estimate * (1 + PRICE_SLIPPAGE) * 100) / 100;
  return Math.min(Math.max(bumped, 0.01), MAX_SHARE_PRICE);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A user-facing error whose message is already friendly, so the outer handler
// shows it verbatim instead of running it through the generic translator.
class BetError extends Error {}

// True when a place failed only because the account is short on pUSD. This is the
// signal to fund from Base and retry, rather than a real failure. Polymarket
// phrases this several ways, so match the known variants.
function isInsufficientFunds(e: unknown): boolean {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return /balance|allowance|insufficient|collateral|exceeds|funds/.test(m);
}

// True when the order couldn't match because the book is empty or too thin at
// our price. Funding won't help, so this stops the flow with a clear message.
function isNoLiquidity(e: unknown): boolean {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return /no orders found to match|no match|not enough liquidity|no liquidity/.test(m);
}

const NO_LIQUIDITY_MESSAGE =
  "This market doesn't have matching orders right now. Try again in a moment, a different amount, or another market.";

export interface PlaceBetInput {
  // CLOB token of the outcome being bought (Yes or No token).
  tokenId: string;
  // Dollars to stake.
  amountUsd: number;
}

// The whole bet flow behind one action: place the market order, and if the
// account is short on pUSD, move the stake from Base USDC and retry until the
// bridge credits it. No pUSD balance read is needed: the order's own
// insufficient-funds error is the signal, so there is no fragile RPC call.
export function useBet() {
  const { ensureReady, status: sessionStatus } = usePolymarketSession();
  const { fund, usdcTotal, portfolioLoading } = usePolymarketFunding();
  const [phase, setPhase] = useState<BetPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  // A single market-buy attempt. Throws on any failure (including insufficient
  // funds) so the orchestrator can decide whether to fund and retry.
  const attempt = useCallback(
    async ({ tokenId, amountUsd }: PlaceBetInput) => {
      const client = await ensureReady();
      const amount = String(amountUsd);
      const estimate = await client.estimateMarketPrice({
        tokenId,
        side: OrderSide.BUY,
        amount,
        orderType: OrderType.FAK,
      });
      // No ask depth to model a price against: the book is empty.
      if (!(estimate > 0)) throw new BetError(NO_LIQUIDITY_MESSAGE);

      const res = await client.placeMarketOrder({
        tokenId,
        side: OrderSide.BUY,
        amount,
        maxPrice: crossingPrice(estimate),
        orderType: OrderType.FAK,
        ...(BUILDER_CODE ? { builderCode: BUILDER_CODE as `0x${string}` } : {}),
      });
      if (!res.ok) {
        // Log the full rejection so its real shape (message/code) is visible
        // while we map the failure cases; the user still sees a friendly message.
        console.error("Polymarket order rejected:", res);
        throw new Error(res.message || "The order was not accepted.");
      }
      return res;
    },
    [ensureReady]
  );

  const placeBet = useCallback(
    async (input: PlaceBetInput) => {
      setError(null);
      setPhase("placing");
      try {
        // Optimistic: if the account already holds enough pUSD, this places now.
        try {
          return await attempt(input);
        } catch (e) {
          if (isNoLiquidity(e)) throw new BetError(NO_LIQUIDITY_MESSAGE);
          if (!isInsufficientFunds(e)) throw e;
        }

        // Short on pUSD: fund the stake from Base USDC.
        if (!portfolioLoading && usdcTotal < input.amountUsd) {
          throw new BetError(
            `You have $${usdcTotal.toFixed(2)} USDC on Base, which isn't enough for a $${input.amountUsd} bet. Add USDC first.`
          );
        }
        setPhase("funding");
        await fund(input.amountUsd);

        // Wait out the bridge, retrying the bet until the pUSD lands.
        setPhase("settling");
        const started = Date.now();
        while (Date.now() - started < SETTLE_MAX_MS) {
          await delay(SETTLE_POLL_MS);
          try {
            return await attempt(input);
          } catch (e) {
            if (isNoLiquidity(e)) throw new BetError(NO_LIQUIDITY_MESSAGE);
            if (!isInsufficientFunds(e)) throw e;
          }
        }
        throw new BetError(
          "Your funds are on the way. This can take a minute — try placing the bet again shortly."
        );
      } catch (e) {
        // Log unexpected failures with context (BetError is an expected,
        // already-explained user condition, so it doesn't need logging).
        if (!(e instanceof BetError)) console.error("placeBet failed:", e);
        setError(
          e instanceof BetError
            ? e.message
            : friendlyError(e, "Couldn't place your bet. Try again.")
        );
        throw e;
      } finally {
        setPhase("idle");
      }
    },
    [attempt, fund, usdcTotal, portfolioLoading]
  );

  return {
    placeBet,
    phase,
    error,
    sessionStatus: sessionStatus as SessionStatus,
    usdcTotal,
    portfolioLoading,
  };
}
