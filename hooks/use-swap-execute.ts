"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth/solana";
import { buildJupiterSwapTransaction } from "@/lib/trade/jupiter";
import { confirmSolanaSignature } from "@/lib/trade/solana-confirm";
import { useSponsoredSolanaSend } from "@/hooks/use-sponsored-solana";

export interface SwapExecuteInput {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  slippageBps: number;
}

// Builds the Jupiter swap transaction for the embedded Solana wallet and sends
// it through gas sponsorship. The backend never holds keys; the wallet signs
// client-side and the sponsor submits.
export function useSwapExecute() {
  const sendSponsored = useSponsoredSolanaSend();
  const { wallets } = useWallets();

  return useCallback(
    async (input: SwapExecuteInput): Promise<void> => {
      const wallet = wallets[0];
      if (!wallet) throw new Error("No Solana wallet is connected.");
      const txBase64 = await buildJupiterSwapTransaction(input, wallet.address);
      const signature = await sendSponsored({ transaction: txBase64, wallet });
      await confirmSolanaSignature(signature);
    },
    [sendSponsored, wallets]
  );
}
