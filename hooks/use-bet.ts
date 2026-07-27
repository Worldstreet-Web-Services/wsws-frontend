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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A user-facing error whose message is already friendly, so the outer handler
// shows it verbatim instead of running it through the generic translator.
class BetError extends Error {}

// True when a place failed only because the account is short on pUSD. This is the
// signal to fund from Base and retry, rather than a real failure. Polymarket
// phrases this several ways, so match the known variants.
function isInsufficientFunds(e: unknown): boolean {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return /balance|allowance|insufficient|not enough|collateral|exceeds|funds/.test(m);
}

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
      const maxPrice = await client.estimateMarketPrice({
        tokenId,
        side: OrderSide.BUY,
        amount,
        orderType: OrderType.FAK,
      });
      const res = await client.placeMarketOrder({
        tokenId,
        side: OrderSide.BUY,
        amount,
        maxPrice,
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
            if (!isInsufficientFunds(e)) throw e;
          }
        }
        throw new BetError(
          "Your funds are on the way. This can take a minute — try placing the bet again shortly."
        );
      } catch (e) {
        // Surface the real cause in the console while keeping the UI friendly,
        // so a failure that isn't a known case can still be diagnosed.
        console.error("placeBet failed:", e);
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
