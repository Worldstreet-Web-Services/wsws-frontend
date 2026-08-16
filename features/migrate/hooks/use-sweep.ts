"use client";

import { useCallback, useRef, useState } from "react";
import { useEvmSendBatch, type EvmBatchCall } from "@/hooks/use-evm-send";
import { useSendToken } from "@/hooks/use-withdraw";
import { chainIdForNetwork, encodeErc20Transfer } from "@/lib/deposit";
import type { ChainSweep } from "@/features/migrate/lib/plan";
import {
  itemsFromPlan,
  markItems,
  planFromFailures,
  type SweepItem,
} from "@/features/migrate/lib/progress";

export interface SweepDestinations {
  evm: string;
  solana: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Transfer failed";
}

// Runs the sweep: per EVM chain one atomic sponsored batch (all ERC-20
// transfers plus the full native balance, gas paid by the sponsor), and on
// Solana one sponsored transaction per asset. A failure marks its items and
// moves on, so one bad asset never strands the rest; retryFailed() re-sends
// only what did not land.
export function useSweep() {
  const sendBatch = useEvmSendBatch();
  const { sendToken } = useSendToken();
  const [items, setItems] = useState<SweepItem[]>([]);
  const [running, setRunning] = useState(false);
  // The full original plan and destinations, kept so a retry can rebuild a
  // failure-only plan without asking the caller to hold state.
  const lastRunRef = useRef<{ plan: ChainSweep[]; destinations: SweepDestinations } | null>(null);

  const runPlan = useCallback(
    async (plan: ChainSweep[], destinations: SweepDestinations): Promise<void> => {
      setRunning(true);
      try {
        for (const chain of plan) {
          if (chain.kind === "evm-batch") {
            const ids = chain.assets.map((a) => a.id);
            setItems((prev) => markItems(prev, ids, { status: "active", error: undefined }));
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
              const hash = await sendBatch(calls, chainId);
              setItems((prev) => markItems(prev, ids, { status: "done", txHash: hash }));
            } catch (error) {
              setItems((prev) =>
                markItems(prev, ids, { status: "failed", error: errorMessage(error) })
              );
            }
          } else {
            for (const asset of chain.assets) {
              setItems((prev) =>
                markItems(prev, [asset.id], { status: "active", error: undefined })
              );
              try {
                const signature = await sendToken({
                  network: asset.network,
                  tokenAddress: asset.tokenAddress,
                  decimals: asset.decimals,
                  to: destinations.solana,
                  amount: asset.amount,
                });
                setItems((prev) =>
                  markItems(prev, [asset.id], { status: "done", txHash: signature })
                );
              } catch (error) {
                setItems((prev) =>
                  markItems(prev, [asset.id], { status: "failed", error: errorMessage(error) })
                );
              }
            }
          }
        }
      } finally {
        setRunning(false);
      }
    },
    [sendBatch, sendToken]
  );

  const start = useCallback(
    async (plan: ChainSweep[], destinations: SweepDestinations): Promise<void> => {
      lastRunRef.current = { plan, destinations };
      setItems(itemsFromPlan(plan));
      await runPlan(plan, destinations);
    },
    [runPlan]
  );

  const retryFailed = useCallback(async (): Promise<void> => {
    const lastRun = lastRunRef.current;
    if (!lastRun) return;
    const retryPlan = planFromFailures(lastRun.plan, items);
    if (retryPlan.length === 0) return;
    await runPlan(retryPlan, lastRun.destinations);
  }, [items, runPlan]);

  return { items, running, start, retryFailed };
}
