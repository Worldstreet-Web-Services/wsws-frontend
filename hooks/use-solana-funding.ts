"use client";

import { useCallback, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { encodeFunctionData, erc20Abi } from "viem";
import { useEvmSend } from "@/hooks/use-evm-send";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useSendUsdc } from "@/hooks/use-withdraw";
import { apiFetch } from "@/lib/api";
import { normalizeBuyQuote, type BuyQuote } from "@/lib/buy-quote";
import {
  BASE_USDC,
  LIFI_BASE_CHAIN,
  fundingLegs,
  planSignature,
  resizeBridgeSend,
  type FundingLeg,
  type FundingPlan,
} from "@/lib/rwa/funding";
import { USDC_BY_CHAIN } from "@/lib/rwa-api";
import {
  depositProgress,
  SOLANA_CHAIN_ID,
  TERMINAL_STAGES,
  type DepositStatusResult,
} from "@/lib/deposit";
import { fromBaseUnits, toBaseUnits } from "@/lib/trade/math";
import { getWalletAddress } from "@/lib/user";

export type FundingPhase = "idle" | "quoting" | "signing" | "settling" | "done" | "failed";
export type StepStatus = "pending" | "active" | "done" | "failed";

// One visible line of the progress list. The panel renders these directly, so a
// stalled run always says which leg it stalled on and what it was doing.
export interface FundingStep {
  kind: FundingLeg["kind"];
  status: StepStatus;
  phase: FundingPhase;
  usdc: number;
}

const SLIPPAGE_BPS = 50;
const POLL_MS = 3_000;
// Dextopus quotes 2-5 minutes for a deposit to settle, so the deadline gives
// that range headroom. It is a wall-clock deadline rather than a poll count
// because a slow status endpoint would otherwise stretch the wait far past it.
const SETTLE_DEADLINE_MS = 420_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Moves USDC into place so a Solana RWA buy can run: a native-SOL hop for the
// network fee, then the purchase funds. Every leg is a Dextopus deposit, the
// same rail as the deposit and sell flows: quote a deposit address, make one
// sponsored USDC transfer to it, and poll until Dextopus settles on Solana.
// A leg pays from Base by default; the gas leg pays from spare Solana USDC
// when the plan says Base cannot cover it. Either way the user signs once per
// leg and pays no gas.
export function useSolanaFunding() {
  const { user } = usePrivy();
  const evmSend = useEvmSend();
  const { sendUsdc } = useSendUsdc();
  const portfolio = usePortfolio();
  const [phase, setPhase] = useState<FundingPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<FundingStep[]>([]);
  // Legs already broadcast for the plan on screen. A retry after a slow settle
  // must not re-send them: the balances a fresh plan would be derived from
  // have not caught up precisely because the transfer is still in flight.
  const sentRef = useRef<{ signature: string; kinds: Set<string> }>({
    signature: "",
    kinds: new Set(),
  });

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setSteps([]);
    sentRef.current = { signature: "", kinds: new Set() };
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

      // A materially different plan starts a fresh record; the same plan
      // resumes where it stopped.
      const signature = planSignature(plan);
      if (sentRef.current.signature !== signature) {
        sentRef.current = { signature, kinds: new Set() };
      }

      // What is left on Base to spend, so a re-sized send can never ask for
      // more than the wallet holds. Decremented as each leg goes out, because
      // the portfolio will not have caught up mid-run.
      let availableBase =
        portfolio.tokens.find(
          (t) => t.network === "base-mainnet" && t.symbol.toUpperCase() === "USDC"
        )?.balance ?? 0;

      const legs = fundingLegs(plan);
      const mark = (index: number, status: StepStatus, legPhase: FundingPhase) =>
        setSteps((prev) =>
          prev.map((s, i) => (i === index ? { ...s, status, phase: legPhase } : s))
        );

      setSteps(
        legs.map((leg) => ({
          kind: leg.kind,
          usdc: leg.usdc,
          status: sentRef.current.kinds.has(leg.kind) ? "done" : "pending",
          phase: "idle" as FundingPhase,
        }))
      );
      setError(null);

      let index = -1;
      try {
        for (const leg of legs) {
          index++;
          if (sentRef.current.kinds.has(leg.kind)) continue;

          setPhase("quoting");
          mark(index, "active", "quoting");
          const { quote, amountIn } = await sizedQuote(leg, plan, from, to, availableBase);
          const sentUsdc = Number(fromBaseUnits(amountIn, 6));
          if (leg.source === "base") availableBase -= sentUsdc;
          setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, usdc: sentUsdc } : s)));

          setPhase("signing");
          mark(index, "active", "signing");
          // One sponsored transfer of exactly the quoted amount to the
          // deposit address. Dextopus watches the address and settles on
          // Solana by itself, so unlike a router call there is no allowance
          // to grant and nothing else to sign.
          if (leg.source === "base") {
            await evmSend({
              to: BASE_USDC as `0x${string}`,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [quote.depositAddress as `0x${string}`, amountIn],
              }),
              chainId: LIFI_BASE_CHAIN,
            });
          } else {
            // Spare Solana USDC pays for this leg. The send is the same
            // sponsored transfer withdrawals use, so it needs no SOL.
            await sendUsdc({ chainType: "solana", to: quote.depositAddress, amount: amountIn });
          }
          // Recorded the moment it is broadcast, not when it settles: the
          // money has left either way.
          sentRef.current.kinds.add(leg.kind);

          // The transfer is out; the funds still have to land before the buy
          // can spend them.
          setPhase("settling");
          mark(index, "active", "settling");
          await awaitSettled(quote.requestId);
          mark(index, "done", "done");
        }

        setPhase("done");
        return true;
      } catch (e) {
        if (index >= 0) mark(index, "failed", "failed");
        setError(e instanceof Error ? e.message : "The transfer did not complete.");
        setPhase("failed");
        return false;
      } finally {
        // Balances moved on every path that broadcast anything, so the plan
        // the panel derives from them is never left stale.
        void portfolio.refetchUntilChanged();
      }
    },
    [user, evmSend, sendUsdc, portfolio]
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

// Polls the deposit until Dextopus reports a terminal stage. Settled resolves;
// failed or refunded throws so the leg is marked and the run stops.
async function awaitSettled(requestId: string): Promise<void> {
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (Date.now() < deadline) {
    await delay(POLL_MS);
    const status = await fetchDepositStatus(requestId).catch(() => null);
    if (!status) continue;
    const { stage } = depositProgress(status.status, status.executionStatus);
    if (stage === "settled") return;
    if (TERMINAL_STAGES.has(stage)) {
      throw new Error("The transfer did not complete. Any funds sent are refunded.");
    }
  }
  throw new Error("The transfer is still on its way. Check back shortly.");
}

async function fetchDepositStatus(requestId: string): Promise<DepositStatusResult> {
  const res = await apiFetch(
    `/api/dextopus/deposit/status?depositRequestId=${encodeURIComponent(requestId)}`
  );
  if (!res.ok) throw new Error("Couldn't check the transfer status.");
  return (await res.json()) as DepositStatusResult;
}

// Quote one funding leg with Dextopus. The origin is the chain the leg pays
// from; the destination is always the user's Solana wallet. The response is
// normalized by the same parser the buy flow uses, at the delivered token's
// decimals (SOL 9, USDC 6).
async function fetchLegQuote(
  leg: FundingLeg,
  amountIn: bigint,
  from: string,
  to: string
): Promise<BuyQuote> {
  const fromBase = leg.source === "base";
  const res = await apiFetch("/api/dextopus/deposit/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      originChainId: fromBase ? LIFI_BASE_CHAIN : SOLANA_CHAIN_ID,
      originAsset: fromBase ? BASE_USDC : USDC_BY_CHAIN.solana.address,
      destinationChainId: SOLANA_CHAIN_ID,
      destinationAsset: leg.toToken,
      amount: amountIn.toString(),
      recipient: to,
      // Refunds return to the wallet that paid, on the chain it paid from.
      refundTo: fromBase ? from : to,
      slippageBps: SLIPPAGE_BPS,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string" ? data.message : "Couldn't prepare the transfer.";
    throw new Error(message);
  }
  return normalizeBuyQuote(data, leg.kind === "gas" ? 9 : 6);
}

// A quote whose delivery actually covers what the leg has to land. The first
// quote is only an estimate of the bridge's cost; if it comes back short, the
// send is re-sized from what it really delivers and quoted once more. Without
// this the purchase leg lands under the price and the buy stays unaffordable,
// with too little left on Base to try again.
async function sizedQuote(
  leg: FundingLeg,
  plan: FundingPlan,
  from: string,
  to: string,
  availableBase: number
): Promise<{ quote: BuyQuote; amountIn: bigint }> {
  const ask = async (usdc: number) => {
    const amountIn = toBaseUnits(usdc.toFixed(6), 6);
    const quote = await fetchLegQuote(leg, amountIn, from, to);
    return { quote, amountIn };
  };

  const first = await ask(leg.usdc);
  // The gas leg buys SOL, so there is no USDC arrival to check against.
  if (leg.kind !== "usdc" || plan.requiredArrivalUsdc <= 0) return first;

  const delivered = Number(fromBaseUnits(first.quote.minOutput, 6));
  const resized = resizeBridgeSend(leg.usdc, delivered, plan.requiredArrivalUsdc, availableBase);
  return resized == null ? first : await ask(resized);
}
