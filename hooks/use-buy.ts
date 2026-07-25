"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useSendUsdc } from "@/hooks/use-withdraw";
import { getWalletAddress } from "@/lib/user";
import {
  SETTLE_CHAINS,
  SOLANA_CHAIN_ID,
  TERMINAL_STAGES,
  depositProgress,
  type WalletChainType,
} from "@/lib/deposit";
import type { BuyRoute } from "@/lib/buy";
import {
  buyStatusStrings,
  fetchBuyQuote,
  fetchBuyStatus,
  type BuyQuote,
  type BuyStatus,
} from "@/lib/buy-quote";

const TEN_SECONDS = 10 * 1000;
const POLL_MS = 4000;

// The bought token settles to the user's own wallet on the destination chain.
// Solana destinations settle to the Solana embedded wallet, every other chain to
// the EVM one.
function recipientChainType(destinationChainId: number): WalletChainType {
  return destinationChainId === SOLANA_CHAIN_ID ? "solana" : "ethereum";
}

// Live preview quote (dry: no deposit address minted) for the buy sheet. Refreshes
// on a short interval while the sheet is open, like the swap quote.
export function useBuyQuote(route: BuyRoute | null, amount: bigint, slippageBps: number) {
  const { user } = usePrivy();
  const recipient = route
    ? getWalletAddress(user, recipientChainType(route.destinationChainId))
    : null;
  const refundTo = getWalletAddress(user, "ethereum");
  const enabled = Boolean(route && recipient && refundTo && amount > 0n);

  return useQuery<BuyQuote>({
    queryKey: [
      "buy-quote",
      route?.destinationChainId,
      route?.asset,
      amount.toString(),
      slippageBps,
    ],
    enabled,
    staleTime: TEN_SECONDS,
    refetchInterval: TEN_SECONDS,
    queryFn: () => {
      if (!route || !recipient || !refundTo) throw new Error("Missing buy parameters");
      return fetchBuyQuote({ route, amount, recipient, refundTo, slippageBps, dry: true });
    },
  });
}

export interface BuyExecuteInput {
  route: BuyRoute;
  amount: bigint;
  slippageBps: number;
}

export interface BuyExecuteResult {
  requestId: string;
  txHash: string;
}

// Executes a buy: fetch a real quote for the deposit address, then send the USDC
// on Base to it from the embedded wallet. Dextopus bridges and settles the bought
// token to the recipient on the destination chain. Returns the requestId to poll.
export function useBuy() {
  const { user } = usePrivy();
  const { sendUsdc } = useSendUsdc();

  return useMutation<BuyExecuteResult, Error, BuyExecuteInput>({
    mutationFn: async ({ route, amount, slippageBps }) => {
      const recipient = getWalletAddress(user, recipientChainType(route.destinationChainId));
      const refundTo = getWalletAddress(user, "ethereum");
      if (!recipient) throw new Error("Connect a wallet for the destination chain first.");
      if (!refundTo) throw new Error("No Base wallet is connected.");

      const quote = await fetchBuyQuote({
        route,
        amount,
        recipient,
        refundTo,
        slippageBps,
        dry: false,
      });
      if (!quote.depositAddress || !quote.requestId) {
        throw new Error("The quote did not return a deposit address.");
      }

      const txHash = await sendUsdc({
        chainType: "ethereum",
        to: quote.depositAddress,
        amount,
        settle: SETTLE_CHAINS.base,
      });
      return { requestId: quote.requestId, txHash };
    },
  });
}

// Polls buy status until the bridge reaches a terminal stage (settled, refunded
// or failed), reusing the deposit stage model.
export function useBuyStatus(requestId: string | null) {
  return useQuery<BuyStatus>({
    queryKey: ["buy-status", requestId],
    enabled: requestId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return POLL_MS;
      const { status, executionStatus } = buyStatusStrings(data);
      const { stage } = depositProgress(status, executionStatus);
      return TERMINAL_STAGES.has(stage) ? false : POLL_MS;
    },
    queryFn: () => {
      if (requestId === null) throw new Error("Missing request id");
      return fetchBuyStatus(requestId);
    },
  });
}
