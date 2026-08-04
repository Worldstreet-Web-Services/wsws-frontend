"use client";

import { useCallback, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { encodeFunctionData, erc20Abi } from "viem";
import { useEvmSendBatch } from "@/hooks/use-evm-send";
import { usePortfolio } from "@/hooks/use-portfolio";
import { fetchLifiQuote, fetchLifiStatus, type LifiQuote } from "@/lib/trade/lifi";
import {
  BASE_USDC,
  LIFI_BASE_CHAIN,
  LIFI_SOLANA_CHAIN,
  planSignature,
  resizeBridgeSend,
  type FundingPlan,
} from "@/lib/rwa/funding";
import { USDC_BY_CHAIN } from "@/lib/rwa-api";
import { fromBaseUnits, toBaseUnits } from "@/lib/trade/math";
import { getWalletAddress } from "@/lib/user";

export type FundingPhase = "idle" | "quoting" | "signing" | "settling" | "done" | "failed";
export type StepStatus = "pending" | "active" | "done" | "failed";

// One visible line of the progress list. The panel renders these directly, so a
// stalled run always says what the transfer was doing when it stalled.
export interface FundingStep {
  status: StepStatus;
  phase: FundingPhase;
  usdc: number;
}

const SLIPPAGE = 0.005;
const POLL_MS = 3_000;
// Bridges quote ~30s for a USDC hop, so this is generous headroom. It is a
// wall-clock deadline rather than a poll count because a slow status endpoint
// would otherwise stretch the wait far past it.
const SETTLE_DEADLINE_MS = 150_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Moves Base USDC to the user's Solana wallet so a Solana RWA buy can run. The
// transaction is on Base, so the user's sponsored send pays no gas — and the
// buy itself is fee-sponsored on Solana, so USDC is all that has to move.
export function useSolanaFunding() {
  const { user } = usePrivy();
  const evmSendBatch = useEvmSendBatch();
  const portfolio = usePortfolio();
  const [phase, setPhase] = useState<FundingPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<FundingStep[]>([]);
  // The plan already broadcast for. A retry after a slow settle must not
  // re-send: the balances a fresh plan would be derived from have not caught
  // up precisely because the transfer is still in flight.
  const sentRef = useRef<string>("");

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setSteps([]);
    sentRef.current = "";
  }, []);

  const fund = useCallback(
    async (plan: FundingPlan): Promise<boolean> => {
      const from = getWalletAddress(user, "ethereum");
      const to = getWalletAddress(user, "solana");
      if (!from || !to) {
        setError("No wallet");
        setPhase("failed");
        return false;
      }

      if (sentRef.current === planSignature(plan)) return false;

      // What is left on Base to spend, so a re-sized send can never ask for
      // more than the wallet holds.
      const availableBase =
        portfolio.tokens.find(
          (t) => t.network === "base-mainnet" && t.symbol.toUpperCase() === "USDC"
        )?.balance ?? 0;

      const mark = (status: StepStatus, legPhase: FundingPhase, usdc?: number) =>
        setSteps((prev) =>
          prev.map((s) => ({ ...s, status, phase: legPhase, usdc: usdc ?? s.usdc }))
        );

      setSteps([{ usdc: plan.bridgeUsdc, status: "pending", phase: "idle" }]);
      setError(null);

      try {
        setPhase("quoting");
        mark("active", "quoting");
        const { quote, amountIn } = await sizedQuote(plan, from, to, availableBase);
        const sentUsdc = Number(fromBaseUnits(amountIn, 6));
        mark("active", "quoting", sentUsdc);

        setPhase("signing");
        mark("active", "signing");
        // The bridge pulls the USDC with transferFrom, so it needs an
        // allowance first or it reverts. Both calls go out as one atomic
        // sponsored operation: the allowance is granted and spent in the same
        // transaction, so it is never left standing and the user signs once.
        const hash = await evmSendBatch(
          [
            {
              to: BASE_USDC as `0x${string}`,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [quote.approvalAddress as `0x${string}`, amountIn],
              }),
            },
            {
              to: quote.transactionRequest.to as `0x${string}`,
              data: quote.transactionRequest.data as `0x${string}`,
              value: BigInt(quote.transactionRequest.value || "0"),
            },
          ],
          quote.transactionRequest.chainId
        );
        // Recorded the moment it is broadcast, not when it settles: the money
        // has left either way.
        sentRef.current = planSignature(plan);

        // The Base transaction is confirmed; the funds still have to land on
        // Solana before the buy can spend them.
        setPhase("settling");
        mark("active", "settling");
        let settled = false;
        const deadline = Date.now() + SETTLE_DEADLINE_MS;
        while (!settled && Date.now() < deadline) {
          await delay(POLL_MS);
          const status = await fetchLifiStatus(hash).catch(() => "PENDING" as const);
          if (status === "DONE") settled = true;
          else if (status === "FAILED") throw new Error("The transfer did not complete.");
        }
        if (!settled) throw new Error("The transfer is still on its way. Check back shortly.");
        mark("done", "done");

        setPhase("done");
        return true;
      } catch (e) {
        mark("failed", "failed");
        setError(e instanceof Error ? e.message : "The transfer did not complete.");
        setPhase("failed");
        return false;
      } finally {
        // Balances moved on every path that broadcast anything, so the plan
        // the panel derives from them is never left stale.
        void portfolio.refetchUntilChanged();
      }
    },
    [user, evmSendBatch, portfolio]
  );

  return {
    fund,
    phase,
    steps,
    error,
    reset,
    busy: phase !== "idle" && phase !== "done" && phase !== "failed",
  };
}

// A quote whose delivery actually covers what the plan has to land. The first
// quote is only an estimate of the bridge's cost; if it comes back short, the
// send is re-sized from what it really delivers and quoted once more. Without
// this the purchase leg lands under the price and the buy stays unaffordable —
// with too little left on Base to try again.
async function sizedQuote(
  plan: FundingPlan,
  from: string,
  to: string,
  availableBase: number
): Promise<{ quote: LifiQuote; amountIn: bigint }> {
  const ask = async (usdc: number) => {
    const amountIn = toBaseUnits(usdc.toFixed(6), 6);
    const quote = await fetchLifiQuote({
      fromChain: LIFI_BASE_CHAIN,
      toChain: LIFI_SOLANA_CHAIN,
      fromToken: BASE_USDC,
      toToken: USDC_BY_CHAIN.solana.address,
      fromAmount: amountIn,
      fromAddress: from,
      toAddress: to,
      slippage: SLIPPAGE,
    });
    return { quote, amountIn };
  };

  const first = await ask(plan.bridgeUsdc);
  if (plan.requiredArrivalUsdc <= 0) return first;

  const delivered = Number(fromBaseUnits(first.quote.toAmountMin, 6));
  const resized = resizeBridgeSend(
    plan.bridgeUsdc,
    delivered,
    plan.requiredArrivalUsdc,
    availableBase
  );
  return resized == null ? first : await ask(resized);
}
