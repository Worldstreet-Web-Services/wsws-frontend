"use client";

// The chess cashier: a backend-custody USDC balance on Base.
//
// The service holds one wallet and one internal ledger. A player deposits by
// sending USDC to that wallet and telling the service the transaction hash;
// stakes lock against the ledger; withdrawals are sent back out from the same
// wallet. This is custody, not an on-chain escrow, which is why every screen
// that touches it names the balance as held by the service.

import { chessAuthedGet, chessPost } from "@/lib/casino/api/chess-client";
import { parseUsdc, usdcToApi } from "@/lib/casino/cashier-money";
import type {
  CashierConfig,
  CashierDeposit,
  CashierWithdrawal,
  PlayerBalance,
} from "@/lib/casino/api/types";

interface CashierConfigWire {
  chainId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  depositAddress?: string;
  requiredConfirmations?: number;
  platformFeeBps?: number;
}

interface PlayerBalanceWire {
  player?: string;
  availableUsdc?: string;
  lockedUsdc?: string;
  totalUsdc?: string;
}

interface DepositWire {
  txHash?: string;
  player?: string;
  amountUsdc?: string;
  status?: string;
  confirmedAt?: string | null;
}

interface WithdrawalWire {
  id?: string;
  player?: string;
  toAddress?: string;
  amountUsdc?: string;
  txHash?: string | null;
  status?: string;
  sentAt?: string | null;
}

// The service answers CONFLICT "cashier is not configured" when the operator
// has not set a backend wallet. That is a deployment without a cashier, not a
// fault, so it becomes null and every staking affordance hides.
export async function fetchCashierConfig(): Promise<CashierConfig | null> {
  try {
    const wire = await chessAuthedGet<CashierConfigWire>("/cashier/config");
    if (!wire.depositAddress) return null;
    return {
      chainId: wire.chainId ?? 8453,
      tokenSymbol: wire.tokenSymbol ?? "USDC",
      tokenAddress: wire.tokenAddress ?? "",
      depositAddress: wire.depositAddress,
      requiredConfirmations: wire.requiredConfirmations ?? 1,
      // The fee is the service's to set. A hardcoded copy here would quote a
      // payout the winner does not receive.
      platformFeeBps: wire.platformFeeBps ?? 0,
    };
  } catch (error) {
    if (isCashierOff(error)) return null;
    throw error;
  }
}

// True when the failure means the cashier is switched off rather than broken.
export function isCashierOff(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (err?.code === "NOT_CONFIGURED" || err?.code === "SERVICE_UNAVAILABLE") return true;
  return err?.code === "CONFLICT" && /not configured/i.test(err.message ?? "");
}

export async function fetchPlayerBalance(player: string): Promise<PlayerBalance> {
  const wire = await chessAuthedGet<PlayerBalanceWire>(
    `/cashier/players/${encodeURIComponent(player)}/balance`
  );
  return {
    player: wire.player ?? player,
    // Null rather than zero when unreadable: an empty balance and an unreadable
    // one must not look the same on screen.
    availableMicro: parseUsdc(wire.availableUsdc),
    lockedMicro: parseUsdc(wire.lockedUsdc),
    totalMicro: parseUsdc(wire.totalUsdc),
  };
}

// Tells the service a deposit landed. The service verifies the receipt itself,
// so a hash for somebody else's transfer credits nobody.
//
// Idempotent upstream: the hash is unique in the service's table and
// re-confirming returns the row it already credited. That is what makes the
// retry in useConfirmDeposit safe.
export async function confirmDeposit(player: string, txHash: string): Promise<CashierDeposit> {
  const wire = await chessPost<DepositWire>("/cashier/deposits/confirm", { player, txHash });
  return {
    txHash: wire.txHash ?? txHash,
    player: wire.player ?? player,
    amountMicro: parseUsdc(wire.amountUsdc),
    status: wire.status ?? "confirmed",
    confirmedAt: wire.confirmedAt ?? null,
  };
}

export interface CreateWithdrawalInput {
  player: string;
  amountMicro: bigint;
  // Defaults to the player's own wallet upstream when omitted.
  toAddress?: string;
}

export async function createWithdrawal(input: CreateWithdrawalInput): Promise<CashierWithdrawal> {
  const wire = await chessPost<WithdrawalWire>("/cashier/withdrawals", {
    player: input.player,
    amountUsdc: usdcToApi(input.amountMicro),
    ...(input.toAddress ? { toAddress: input.toAddress } : {}),
  });
  return {
    id: wire.id ?? "",
    player: wire.player ?? input.player,
    toAddress: wire.toAddress ?? input.toAddress ?? input.player,
    amountMicro: parseUsdc(wire.amountUsdc) ?? input.amountMicro,
    txHash: wire.txHash ?? null,
    status: wire.status ?? "broadcasted",
    sentAt: wire.sentAt ?? null,
  };
}
