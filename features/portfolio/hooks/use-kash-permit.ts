"use client";

import { useCallback } from "react";
import { useSocialWallet } from "decane-connect-kit";
import { ensureUnlocked } from "@/lib/decane";
import { publicClientForChain } from "@/lib/trade/receipt";
import {
  buildKashPermitTypedData,
  permitDeadline,
  splitPermitSignature,
  type KashChainInfo,
  type KashPermitSignature,
} from "@/features/portfolio/lib/kash-permit";

const NONCES_ABI = [
  {
    name: "nonces",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Signs the EIP-2612 permit a real-chain conversion needs: reads the token's
// live nonce, builds the typed payload, and has the holder's embedded wallet
// sign it. Free for the user, no transaction. Returns the split signature the
// engine forwards to token.permit().
export function useKashPermitSigner() {
  const wallet = useSocialWallet();

  return useCallback(
    async (
      chain: KashChainInfo,
      owner: string,
      kashAmount: string
    ): Promise<KashPermitSignature> => {
      // The permit is only valid signed by the owner, and the session holds
      // exactly one EVM wallet, so anything else here is a caller bug.
      const signer = wallet.addresses?.evm;
      if (!signer || signer.toLowerCase() !== owner.toLowerCase()) {
        throw new Error("Signing wallet is not connected.");
      }

      const client = publicClientForChain(chain.chainId);
      const nonce = await client.readContract({
        address: chain.tokenAddress as `0x${string}`,
        abi: NONCES_ABI,
        functionName: "nonces",
        args: [owner as `0x${string}`],
      });

      const deadline = permitDeadline(Date.now());
      const typedData = buildKashPermitTypedData({ chain, owner, kashAmount, nonce, deadline });

      await ensureUnlocked(wallet);
      const signature = await wallet.signTypedData({
        chain: `evm:${chain.chainId}`,
        domain: typedData.domain,
        types: typedData.types,
        message: typedData.message,
        primaryType: typedData.primaryType,
      });

      return splitPermitSignature(signature, deadline);
    },
    [wallet]
  );
}
