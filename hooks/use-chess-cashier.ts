"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmDeposit,
  createWithdrawal,
  fetchCashierConfig,
  fetchPlayerBalance,
} from "@/lib/casino/api/cashier";
import {
  clearPendingDeposit,
  readPendingDeposit,
  savePendingDeposit,
} from "@/lib/casino/pending-deposit";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";
import { useSendToken } from "@/hooks/use-withdraw";
import { SETTLE_CHAINS } from "@/lib/deposit";
import { usdcToApi } from "@/lib/casino/cashier-money";

// The balance moves when a game settles, which happens on the service's clock
// rather than ours, so it is polled while a cashier screen is open.
const BALANCE_POLL_MS = 15_000;

// The service verifies a deposit against the chain, and an early confirm can
// legitimately fail while the transfer is still gathering confirmations. These
// retries cover that as well as a dropped request.
const CONFIRM_ATTEMPTS = 4;
const CONFIRM_BACKOFF_MS = 2_000;

export const CASHIER_KEYS = {
  config: ["casino", "chess", "cashier", "config"] as const,
  balance: (player: string) => ["casino", "chess", "cashier", "balance", player] as const,
};

// Whether this deployment has a cashier at all. A service without one answers
// CONFLICT rather than erroring, which becomes null here, and every staking
// affordance in the UI keys off `enabled` so it hides cleanly.
export function useCashierConfig() {
  const query = useQuery({
    queryKey: CASHIER_KEYS.config,
    queryFn: fetchCashierConfig,
    // The operator does not switch a cashier on mid-session, so this is asked
    // once and kept.
    staleTime: Infinity,
  });

  return {
    config: query.data ?? null,
    enabled: !!query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function usePlayerBalance() {
  const wallet = useCasinoWallet();
  const { enabled } = useCashierConfig();
  const address = wallet.address;

  const query = useQuery({
    queryKey: CASHIER_KEYS.balance(address ?? "none"),
    queryFn: () => fetchPlayerBalance(address as string),
    enabled: !!address && enabled,
    refetchInterval: BALANCE_POLL_MS,
  });

  return {
    balance: query.data ?? null,
    availableMicro: query.data?.availableMicro ?? null,
    lockedMicro: query.data?.lockedMicro ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// Invalidates the caller's balance. Used after a deposit, a withdrawal, and
// whenever a staked game reaches a terminal state.
export function useRefreshBalance() {
  const queryClient = useQueryClient();
  const wallet = useCasinoWallet();
  const address = wallet.address;

  return useCallback(() => {
    if (!address) return;
    void queryClient.invalidateQueries({ queryKey: CASHIER_KEYS.balance(address) });
  }, [queryClient, address]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tells the service about a transfer, retrying because the alternative is money
// sitting in the service's wallet with nothing crediting it. Safe to repeat:
// the hash is unique upstream and re-confirming returns the row already
// credited.
export function useConfirmDeposit() {
  const wallet = useCasinoWallet();
  const refresh = useRefreshBalance();
  const address = wallet.address;

  const mutation = useMutation({
    mutationFn: async (txHash: string) => {
      if (!address) throw new Error("Connect your wallet first.");
      let lastError: unknown;
      for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt += 1) {
        try {
          const deposit = await confirmDeposit(address, txHash);
          clearPendingDeposit(address);
          return deposit;
        } catch (error) {
          lastError = error;
          if (attempt < CONFIRM_ATTEMPTS - 1) await delay(CONFIRM_BACKOFF_MS * (attempt + 1));
        }
      }
      throw lastError;
    },
    onSuccess: refresh,
  });

  return {
    confirm: mutation.mutateAsync,
    confirming: mutation.isPending,
    error: mutation.error,
  };
}

// The full deposit: send USDC to the service's wallet, then tell the service.
//
// On Base the send is sponsored and returns an already-confirmed hash, so there
// is no receipt wait here. The hash is written down before confirm is tried, so
// a failure between the two steps is recoverable rather than lost.
export function useDepositToCashier() {
  const wallet = useCasinoWallet();
  const { config } = useCashierConfig();
  const { sendToken } = useSendToken();
  const { confirm } = useConfirmDeposit();
  const address = wallet.address;

  const mutation = useMutation({
    mutationFn: async (amountMicro: bigint) => {
      if (!address) throw new Error("Connect your wallet first.");
      if (!config) throw new Error("The chess cashier isn't available right now.");

      const txHash = await sendToken({
        network: "base-mainnet",
        tokenAddress: SETTLE_CHAINS.base.usdc,
        decimals: SETTLE_CHAINS.base.decimals,
        to: config.depositAddress,
        amount: amountMicro,
      });

      // Written down before the confirm is attempted: from here on the money
      // has left the player's wallet, and this hash is the only proof of it.
      savePendingDeposit(address, {
        txHash,
        amountMicro: amountMicro.toString(),
        savedAt: Date.now(),
      });

      await confirm(txHash);
      return { txHash, amountUsdc: usdcToApi(amountMicro) };
    },
  });

  return {
    deposit: mutation.mutateAsync,
    depositing: mutation.isPending,
    error: mutation.error,
  };
}

// A deposit that was sent but never credited, so the screen can offer to
// finish it rather than leaving the player to work out where their money went.
export function usePendingDeposit() {
  const wallet = useCasinoWallet();
  const address = wallet.address;
  return {
    pending: readPendingDeposit(address),
    dismiss: () => clearPendingDeposit(address),
  };
}

export function useCreateWithdrawal() {
  const wallet = useCasinoWallet();
  const refresh = useRefreshBalance();
  const address = wallet.address;

  const mutation = useMutation({
    mutationFn: (input: { amountMicro: bigint; toAddress?: string }) => {
      if (!address) throw new Error("Connect your wallet first.");
      return createWithdrawal({ player: address, ...input });
    },
    onSuccess: refresh,
  });

  return {
    withdraw: mutation.mutateAsync,
    withdrawing: mutation.isPending,
    error: mutation.error,
  };
}
