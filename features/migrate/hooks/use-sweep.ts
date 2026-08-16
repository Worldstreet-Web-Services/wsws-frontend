"use client";

import { useCallback } from "react";
import type { EvmBatchCall } from "@/hooks/use-evm-send";
import {
  useLegacyEvmSendBatch,
  useLegacySendToken,
} from "@/features/migrate/hooks/use-legacy-send";
import { chainIdForNetwork, encodeErc20Transfer } from "@/lib/deposit";
import type { ChainSweep } from "@/features/migrate/lib/plan";

export interface SweepDestinations {
  evm: string;
  solana: string;
}

export interface SweepResult {
  done: number;
  failed: number;
  // The first failure's message, for the toast; later failures repeat the
  // same causes (expired session, refused signature) almost every time.
  firstError: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Transfer failed";
}

// Runs the one-click sweep: per EVM chain one atomic sponsored batch (all
// ERC-20 transfers plus the full native balance, gas paid by the sponsor),
// and on Solana one sponsored transaction per asset. A failure counts and
// moves on, so one bad asset never strands the rest; clicking Update Balance
// again replans from whatever balances remain, which is the retry.
// Signing goes through the LEGACY Privy hooks: the sweep spends from the old
// wallets, which only the Privy session can sign for.
export function useSweep() {
  const sendBatch = useLegacyEvmSendBatch();
  const sendToken = useLegacySendToken();

  return useCallback(
    async (plan: ChainSweep[], destinations: SweepDestinations): Promise<SweepResult> => {
      let done = 0;
      let failed = 0;
      let firstError: string | null = null;
      const fail = (count: number, error: unknown) => {
        failed += count;
        if (firstError === null) firstError = errorMessage(error);
      };

      for (const chain of plan) {
        if (chain.kind === "evm-batch") {
          try {
            const chainId = chainIdForNetwork(chain.network);
            if (!chainId) throw new Error(`No chain id for network ${chain.network}`);
            const calls: EvmBatchCall[] = chain.assets.map((a) =>
              a.tokenAddress === null
                ? { to: destinations.evm as `0x${string}`, value: a.amount }
                : {
                    to: a.tokenAddress as `0x${string}`,
                    data: encodeErc20Transfer(destinations.evm, a.amount),
                  }
            );
            await sendBatch(calls, chainId);
            done += chain.assets.length;
          } catch (error) {
            fail(chain.assets.length, error);
          }
        } else {
          for (const asset of chain.assets) {
            try {
              await sendToken({
                network: asset.network,
                tokenAddress: asset.tokenAddress,
                decimals: asset.decimals,
                to: destinations.solana,
                amount: asset.amount,
              });
              done += 1;
            } catch (error) {
              fail(1, error);
            }
          }
        }
      }
      return { done, failed, firstError };
    },
    [sendBatch, sendToken]
  );
}
