"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import type { EIP1193Provider, Hex } from "viem";

import { fetchErc20Allowance } from "@/features/rwas/lib/evm-balance";
import {
  buildRwasOneInchApproval,
  fetchRwasOneInchQuote,
  prepareRwasOneInchOrder,
  submitRwasOneInchOrder,
} from "@/features/rwas/lib/oneinch";
import { ETHEREUM_CHAIN_ID, ETHEREUM_NETWORK } from "@/features/rwas/lib/ondo-order";
import { useEvmSendBatch } from "@/hooks/use-evm-send";
import type { RwasOneInchQuoteRequest } from "@/lib/api/schemas/rwas-oneinch";

export type RwasOneInchOrderPhase =
  "checking" | "approving" | "preparing" | "signing" | "submitting";

export function useRwasOneInchOrder() {
  const { wallets } = useWallets();
  const sendBatch = useEvmSendBatch();

  return useCallback(
    async (input: RwasOneInchQuoteRequest, onPhase?: (phase: RwasOneInchOrderPhase) => void) => {
      const wallet = wallets.find(
        (candidate) =>
          candidate.walletClientType === "privy" &&
          candidate.address.toLowerCase() === input.walletAddress.toLowerCase()
      );
      if (!wallet) throw new Error("No EVM wallet is connected.");

      onPhase?.("checking");
      const coverage = await fetchRwasOneInchQuote(input);
      if (!coverage.economicallyViable) {
        throw new Error(
          `The current 1inch route guarantees only ${coverage.minimumEffectiveRatePercent.toFixed(2)}% of market value. Enter a larger amount.`
        );
      }

      onPhase?.("preparing");
      let prepared = await prepareRwasOneInchOrder(input);
      const allowance = await fetchErc20Allowance(
        ETHEREUM_NETWORK,
        prepared.approval.tokenAddress as `0x${string}`,
        input.walletAddress as `0x${string}`,
        prepared.approval.spenderAddress as `0x${string}`
      );
      if (allowance < BigInt(prepared.approval.amount)) {
        onPhase?.("approving");
        await sendBatch([buildRwasOneInchApproval(prepared.approval)], ETHEREUM_CHAIN_ID);
        // The first ticket can expire while approval confirms. Requote so the
        // signed order always has current amounts and a full validity window.
        onPhase?.("preparing");
        prepared = await prepareRwasOneInchOrder(input);
      }

      onPhase?.("signing");
      const provider = (await wallet.getEthereumProvider()) as unknown as EIP1193Provider;
      const signature = (await provider.request({
        method: "eth_signTypedData_v4",
        params: [input.walletAddress as `0x${string}`, JSON.stringify(prepared.typedData)],
      })) as string;
      if (!/^0x[0-9a-fA-F]{130}$/u.test(signature)) {
        throw new Error("The wallet returned an invalid 1inch order signature.");
      }

      onPhase?.("submitting");
      const submitted = await submitRwasOneInchOrder(prepared.ticket, signature as Hex);
      if (submitted.orderHash.toLowerCase() !== prepared.orderHash.toLowerCase()) {
        throw new Error("The submitted 1inch order reference changed.");
      }
      return { ...submitted, quote: prepared.quote, expiresAt: prepared.expiresAt };
    },
    [sendBatch, wallets]
  );
}
