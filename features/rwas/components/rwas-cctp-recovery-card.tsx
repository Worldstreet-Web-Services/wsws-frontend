"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";

import {
  buildRwasCctpReceiveCall,
  fetchRwasCctpMessageReceived,
  fetchRwasCctpStatus,
} from "@/features/rwas/lib/cctp";
import {
  pendingRwasPurchasesSnapshot,
  requestPendingRwasPurchaseRetry,
  serverPendingRwasPurchasesSnapshot,
  subscribePendingRwasPurchases,
  type CctpPendingRwasPurchase,
} from "@/features/rwas/lib/pending-purchase";
import { ETHEREUM_CHAIN_ID, USDC_DECIMALS } from "@/features/rwas/lib/ondo-order";
import { apiFetch } from "@/lib/api";
import type { RwasCctpStatus } from "@/lib/api/schemas/rwas-cctp";
import { recordSelfInitiated } from "@/lib/analytics/self-initiated";
import type { ActivityItem } from "@/lib/server/activity";
import { toast } from "@/lib/toast";
import { getWalletAddress } from "@/lib/user";
import { useEvmSendBatch } from "@/hooks/use-evm-send";
import { usePortfolio } from "@/hooks/use-portfolio";

const ACTIVITY_POLL_MS = 60_000;
const RECOVERY_POLL_MS = 15_000;
const MAX_CCTP_CANDIDATES = 8;

interface DiscoveredCctpRecovery {
  sourceTransactionHash: `0x${string}`;
  inputAmount: string;
  status: Extract<RwasCctpStatus, { status: "complete" }>;
}

function activityAmountUnits(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const units = Math.round(amount * 10 ** USDC_DECIMALS);
  return Number.isSafeInteger(units) && units > 0 ? String(units) : null;
}

export function RwasCctpRecoveryCard() {
  const { ready, authenticated, user } = usePrivy();
  const queryClient = useQueryClient();
  const sendBatch = useEvmSendBatch();
  const portfolio = usePortfolio();
  const [claiming, setClaiming] = useState(false);
  const wallet = getWalletAddress(user, "ethereum");
  const solana = getWalletAddress(user, "solana");
  const pending = useSyncExternalStore(
    subscribePendingRwasPurchases,
    pendingRwasPurchasesSnapshot,
    serverPendingRwasPurchasesSnapshot
  );
  const purchase = useMemo(
    () =>
      wallet
        ? ([...pending]
            .reverse()
            .find(
              (candidate): candidate is CctpPendingRwasPurchase =>
                candidate.version === 3 &&
                candidate.walletAddress.toLowerCase() === wallet.toLowerCase()
            ) ?? null)
        : null,
    [pending, wallet]
  );

  // This intentionally shares useActivity's query key. When RecentActivity has
  // already loaded, discovery reuses that response without another Alchemy call.
  const activityQuery = useQuery<{ items: ActivityItem[] }>({
    queryKey: ["activity", wallet, solana],
    enabled: Boolean(!purchase && ready && authenticated && wallet),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (wallet) params.set("evm", wallet);
      if (solana) params.set("solana", solana);
      const response = await apiFetch(
        `/api/activity?${params.toString()}`,
        {},
        { requireAuth: true }
      );
      if (!response.ok) throw new Error("Could not inspect recent wallet activity.");
      return response.json();
    },
    staleTime: ACTIVITY_POLL_MS,
    refetchInterval: ACTIVITY_POLL_MS,
    retry: 1,
  });
  const candidates = useMemo(
    () =>
      (activityQuery.data?.items ?? [])
        .filter(
          (item) =>
            item.network === "base-mainnet" &&
            item.direction === "out" &&
            item.symbol.toUpperCase() === "USDC" &&
            /^0x[0-9a-fA-F]{64}$/u.test(item.hash)
        )
        .slice(0, MAX_CCTP_CANDIDATES)
        .flatMap((item) => {
          const inputAmount = activityAmountUnits(item.amount);
          return inputAmount
            ? [{ sourceTransactionHash: item.hash as `0x${string}`, inputAmount }]
            : [];
        }),
    [activityQuery.data?.items]
  );
  const candidateKey = candidates
    .map((candidate) => `${candidate.sourceTransactionHash}:${candidate.inputAmount}`)
    .join(",");
  const recoveryQuery = useQuery<DiscoveredCctpRecovery | null>({
    queryKey: ["rwas-cctp-recovery", wallet, candidateKey],
    enabled: Boolean(!purchase && wallet && candidateKey),
    queryFn: async () => {
      if (!wallet) return null;
      for (const candidate of candidates) {
        try {
          const status = await fetchRwasCctpStatus({
            ...candidate,
            depositor: wallet as Address,
            amount: candidate.inputAmount,
          });
          if (status.status !== "complete") continue;
          const received = await fetchRwasCctpMessageReceived({
            message: status.message as `0x${string}`,
            depositor: wallet as Address,
            amount: BigInt(candidate.inputAmount),
          });
          if (!received) return { ...candidate, status };
        } catch {
          // Most Base USDC withdrawals are not CCTP burns. Ignore them and
          // continue until Circle validates an exact wallet, hash, and amount.
        }
      }
      return null;
    },
    staleTime: RECOVERY_POLL_MS,
    refetchInterval: RECOVERY_POLL_MS,
    retry: 1,
  });
  const discovered = purchase ? null : recoveryQuery.data;

  const claimDiscovered = async () => {
    if (!wallet || !discovered || claiming) return;
    setClaiming(true);
    let submitted = false;
    try {
      const status = await fetchRwasCctpStatus({
        sourceTransactionHash: discovered.sourceTransactionHash,
        depositor: wallet as Address,
        amount: discovered.inputAmount,
      });
      if (status.status !== "complete") {
        throw new Error("Circle is still confirming this transfer.");
      }
      const alreadyReceived = await fetchRwasCctpMessageReceived({
        message: status.message as `0x${string}`,
        depositor: wallet as Address,
        amount: BigInt(discovered.inputAmount),
      });
      if (!alreadyReceived) {
        const receive = buildRwasCctpReceiveCall({
          status,
          depositor: wallet as Address,
          amount: BigInt(discovered.inputAmount),
        });
        const hash = await sendBatch([{ to: receive.to, data: receive.data }], ETHEREUM_CHAIN_ID, {
          onUserOperationSubmitted: () => {
            submitted = true;
          },
        });
        recordSelfInitiated([hash]);
      }
      toast.success("Ethereum USDC received.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rwas-trade-balances"] }),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
        recoveryQuery.refetch(),
      ]);
      void portfolio.refetchUntilChanged();
    } catch (error) {
      if (submitted) {
        toast.info("Ethereum claim submitted. The app is checking for confirmation.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "The Ethereum claim failed.");
    } finally {
      setClaiming(false);
    }
  };

  if (!purchase && !discovered) return null;

  if (discovered) {
    const amount = formatUnits(BigInt(discovered.status.outputAmount), USDC_DECIMALS);
    return (
      <section className="mt-3 flex flex-col gap-4 rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/30 text-[13px] font-semibold text-white/80">
            US
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white">USDC ready to claim</p>
            <p className="mt-1 max-w-[680px] text-[12.5px] leading-5 text-white/55">
              Circle confirmed {amount} USDC for Ethereum. Claim it now; no second Base transfer is
              required.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={claiming}
          onClick={() => void claimDiscovered()}
          className="shrink-0 cursor-pointer rounded-xl bg-white px-4 py-2.5 text-[12.5px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-55"
        >
          {claiming ? "Claiming Ethereum USDC..." : "Claim Ethereum USDC"}
        </button>
      </section>
    );
  }

  if (!purchase) return null;

  const amount = formatUnits(
    BigInt(purchase.settledAmount ?? purchase.expectedAmount),
    USDC_DECIMALS
  );
  const received = Boolean(purchase.ethereumUsdcReceivedAt || purchase.destinationTransactionHash);
  const claimSubmitted = Boolean(purchase.destinationUserOperationHash);
  const claimReady = Boolean(
    purchase.sourceTransactionHash &&
    purchase.destinationOperationKind === "mint" &&
    purchase.settledAmount &&
    !received &&
    !claimSubmitted
  );

  const title = received
    ? "Ethereum USDC received"
    : claimSubmitted
      ? "Ethereum claim submitted"
      : claimReady
        ? "USDC ready to claim"
        : "USDC transfer in progress";
  const body = received
    ? `${amount} USDC is in your Ethereum wallet. Continue the ${purchase.assetSymbol} purchase without transferring from Base again.`
    : claimSubmitted
      ? `Confirming ${amount} USDC on Ethereum. Your Base transfer is already complete.`
      : claimReady
        ? `Circle confirmed ${amount} USDC for Ethereum. Claim it now; no second Base transfer is required.`
        : `${amount} USDC left Base and is waiting for Circle confirmation.`;
  const action = received
    ? `Continue ${purchase.assetSymbol} purchase`
    : claimReady
      ? "Claim Ethereum USDC"
      : null;

  return (
    <section className="mt-3 flex flex-col gap-4 rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/30 text-[13px] font-semibold text-white/80">
          US
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-white">{title}</p>
          <p className="mt-1 max-w-[680px] text-[12.5px] leading-5 text-white/55">{body}</p>
        </div>
      </div>
      {action ? (
        <button
          type="button"
          onClick={() => requestPendingRwasPurchaseRetry(purchase.requestId)}
          className="shrink-0 cursor-pointer rounded-xl bg-white px-4 py-2.5 text-[12.5px] font-semibold text-black transition-opacity hover:opacity-90"
        >
          {action}
        </button>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-2 text-[12px] text-white/45">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
          Monitoring
        </span>
      )}
    </section>
  );
}
