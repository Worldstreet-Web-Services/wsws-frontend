"use client";

import { useCallback, useState } from "react";
import { OrderSide, OrderType } from "@polymarket/client";
import { friendlyError } from "@/lib/errors";
import { usePolymarketSession, type SessionStatus } from "@/hooks/use-polymarket-session";
import { usePolymarketFunding } from "@/hooks/use-polymarket-funding";
import { readCollateralUsd } from "@/lib/polymarket/collateral";
import { BUILDER_CODE } from "@/lib/polymarket/config";
import type { SecureClient } from "@/lib/polymarket/secure-client";

export type BetPhase = "idle" | "placing" | "funding" | "settling";

// How long to keep waiting while the deposit bridge credits pUSD.
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

// The whole bet flow behind one action. It reads the account's spendable pUSD
// first and only moves the shortfall from Base USDC, so existing balance is
// reused and a stake is never funded twice. Then it places a market order,
// crossing the spread so it actually fills.
export function useBet() {
  const { ensureReady, status: sessionStatus } = usePolymarketSession();
  const { fund, usdcTotal, portfolioLoading } = usePolymarketFunding();
  const [phase, setPhase] = useState<BetPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const placeOrder = useCallback(async (client: SecureClient, input: PlaceBetInput) => {
    const amount = String(input.amountUsd);
    const estimate = await client.estimateMarketPrice({
      tokenId: input.tokenId,
      side: OrderSide.BUY,
      amount,
      orderType: OrderType.FAK,
    });
    // No ask depth to model a price against: the book is empty.
    if (!(estimate > 0)) throw new BetError(NO_LIQUIDITY_MESSAGE);

    const res = await client.placeMarketOrder({
      tokenId: input.tokenId,
      side: OrderSide.BUY,
      amount,
      maxPrice: crossingPrice(estimate),
      orderType: OrderType.FAK,
      ...(BUILDER_CODE ? { builderCode: BUILDER_CODE as `0x${string}` } : {}),
    });
    if (!res.ok) throw new Error(res.message || "The order was not accepted.");
    return res;
  }, []);

  const placeBet = useCallback(
    async (input: PlaceBetInput) => {
      setError(null);
      setPhase("placing");
      try {
        const client = await ensureReady();

        // Reuse pUSD the account already holds; only fund what's missing.
        let available = await readCollateralUsd(client);
        if (available < input.amountUsd) {
          const shortfall = Math.ceil((input.amountUsd - available) * 100) / 100;
          if (!portfolioLoading && usdcTotal < shortfall) {
            throw new BetError(
              `You have $${usdcTotal.toFixed(2)} USDC on Base, which isn't enough for a $${input.amountUsd} bet. Add USDC first.`
            );
          }
          setPhase("funding");
          await fund(shortfall);

          // Wait for the bridge to credit the pUSD before placing.
          setPhase("settling");
          const started = Date.now();
          while (available < input.amountUsd && Date.now() - started < SETTLE_MAX_MS) {
            await delay(SETTLE_POLL_MS);
            available = await readCollateralUsd(client);
          }
          if (available < input.amountUsd) {
            throw new BetError(
              "Your funds are on the way. This can take a minute — try placing the bet again shortly."
            );
          }
        }

        setPhase("placing");
        return await placeOrder(client, input);
      } catch (e) {
        if (e instanceof BetError) {
          setError(e.message);
          throw e;
        }
        if (isNoLiquidity(e)) {
          setError(NO_LIQUIDITY_MESSAGE);
          throw e;
        }
        setError(friendlyError(e, "Couldn't place your bet. Try again."));
        throw e;
      } finally {
        setPhase("idle");
      }
    },
    [ensureReady, fund, placeOrder, usdcTotal, portfolioLoading]
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
