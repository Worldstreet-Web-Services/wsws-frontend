"use client";

import { useCallback } from "react";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { createPublicClient, http, type Chain } from "viem";
import { arbitrum, base, polygon } from "viem/chains";
import { fetchLifiQuote } from "@/lib/trade/lifi";
import {
  encodeAllowanceCall,
  encodeApprove,
  isNativeToken,
  parseAllowance,
} from "@/lib/trade/erc20";
import { getWalletAddress } from "@/lib/user";

export interface EvmSwapExecuteInput {
  fromChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: bigint;
  slippageBps: number;
}

// Chains the swap flow supports. Reads (allowance, receipt) go through a client
// pinned to one of these, never the embedded wallet's ambient provider: Privy
// can leave that provider pointed at a different chain, so a receipt for a
// Base/Polygon/Arbitrum transaction would be polled on the wrong chain and never
// found, timing the swap out even though it actually landed.
const SWAP_CHAINS: Record<number, Chain> = {
  [base.id]: base,
  [arbitrum.id]: arbitrum,
  [polygon.id]: polygon,
};

// Cap the wait so a genuinely stuck transaction surfaces an error instead of
// hanging the flow. Fast L2 blocks (~2s) confirm well inside this.
const RECEIPT_TIMEOUT_MS = 120_000;
const RECEIPT_POLL_MS = 2_000;

function publicClientFor(chainId: number) {
  const chain = SWAP_CHAINS[chainId];
  if (!chain) throw new Error(`This swap chain isn't supported yet (${chainId}).`);
  return createPublicClient({ chain, transport: http() });
}

// Inferred so it tracks the app's viem version (a second copy is bundled by
// other deps, and naming the exported PublicClient type collides with it).
type SwapClient = ReturnType<typeof publicClientFor>;

async function readAllowance(
  client: SwapClient,
  token: string,
  owner: string,
  spender: string
): Promise<bigint> {
  const { data } = await client.call({
    to: token as `0x${string}`,
    data: encodeAllowanceCall(owner, spender),
  });
  return parseAllowance(data ?? "0x");
}

// Waits for a transaction to confirm on its own chain. `label` names the step so
// a timeout or revert reports the step that actually failed instead of always
// blaming the approval.
async function awaitReceipt(client: SwapClient, hash: string, label: string): Promise<void> {
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      timeout: RECEIPT_TIMEOUT_MS,
      pollingInterval: RECEIPT_POLL_MS,
    });
  } catch {
    throw new Error(
      `${label} is taking longer than usual to confirm. Check your wallet, then try again.`
    );
  }
  if (receipt.status === "reverted") {
    throw new Error(`${label} failed on-chain. No funds were moved. Try again.`);
  }
}

// Executes an EVM swap on the token's own chain (Base, Arbitrum or Polygon)
// through LI.FI, signed by the Privy embedded EVM wallet. Fetches a fresh quote
// for the taker on input.fromChainId, grants the ERC-20 allowance if the router
// needs one, then sends the swap transaction. The backend never holds keys; the
// wallet signs client-side. Returns once the swap has confirmed on-chain so the
// caller's balance refetch reflects the received token.
export function useEvmSwapExecute() {
  const { user } = usePrivy();
  const { sendTransaction } = useSendTransaction();

  return useCallback(
    async (input: EvmSwapExecuteInput): Promise<void> => {
      const owner = getWalletAddress(user, "ethereum");
      if (!owner) throw new Error("No EVM wallet is connected.");

      const client = publicClientFor(input.fromChainId);

      const quote = await fetchLifiQuote({
        fromChain: input.fromChainId,
        toChain: input.fromChainId,
        fromToken: input.fromToken,
        toToken: input.toToken,
        fromAmount: input.fromAmount,
        fromAddress: owner,
        slippage: input.slippageBps / 10000,
      });

      if (!isNativeToken(input.fromToken)) {
        const allowance = await readAllowance(
          client,
          input.fromToken,
          owner,
          quote.approvalAddress
        );
        if (allowance < input.fromAmount) {
          const { hash } = await sendTransaction({
            to: input.fromToken,
            data: encodeApprove(quote.approvalAddress, input.fromAmount),
            chainId: input.fromChainId,
          });
          await awaitReceipt(client, hash, "Token approval");
        }
      }

      const tx = quote.transactionRequest;
      const { hash } = await sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        chainId: tx.chainId,
        gasLimit: tx.gasLimit,
      });
      // Wait for the swap to mine so the caller's balance refetch reflects the
      // received token instead of the pre-swap balance.
      await awaitReceipt(client, hash, "The swap");
    },
    [user, sendTransaction]
  );
}
