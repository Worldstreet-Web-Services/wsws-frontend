// A deposit that was sent on-chain but not yet credited.
//
// The dangerous moment in the deposit flow is the gap between the transfer
// landing in the service's wallet and the service being told about it. If the
// confirm call fails there, the money is gone from the player's wallet and
// nowhere in their balance, and the only proof is a transaction hash held in a
// variable that a page reload destroys.
//
// So the hash is written down before confirm is attempted, and only cleared once
// the service has credited it. On the next visit the screen can offer to finish
// the job. Keyed by wallet so two accounts on one browser never see each other's
// pending deposit.

const KEY_PREFIX = "wsws.chess-cashier.pending-deposit.";

export interface PendingDeposit {
  txHash: string;
  // Micro-USDC as a string: localStorage cannot hold a bigint.
  amountMicro: string;
  savedAt: number;
}

function keyFor(wallet: string): string {
  return `${KEY_PREFIX}${wallet.toLowerCase()}`;
}

// All storage access is wrapped: a browser with storage disabled must not take
// the deposit flow down with it. Losing the safety net is survivable, throwing
// mid-deposit is not.
export function readPendingDeposit(wallet: string | null): PendingDeposit | null {
  if (!wallet || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(wallet));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingDeposit>;
    if (typeof parsed?.txHash !== "string" || !parsed.txHash) return null;
    return {
      txHash: parsed.txHash,
      amountMicro: typeof parsed.amountMicro === "string" ? parsed.amountMicro : "0",
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function savePendingDeposit(wallet: string | null, deposit: PendingDeposit): void {
  if (!wallet || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(wallet), JSON.stringify(deposit));
  } catch {
    // Storage full or blocked. The deposit still proceeds; only the recovery
    // hint is lost.
  }
}

export function clearPendingDeposit(wallet: string | null): void {
  if (!wallet || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(wallet));
  } catch {
    // Nothing to do: a stale entry only causes a redundant confirm, which the
    // service treats as idempotent.
  }
}
