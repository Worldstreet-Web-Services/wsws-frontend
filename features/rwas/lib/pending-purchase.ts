import { isAddress, type Address } from "viem";

const KEY = "wsws.rwas.pending-purchases.v1";
const LEGACY_PREFIX = "rwas:base-to-ethereum-buy:";
const RETRY_EVENT = "rwas:retry-pending-purchase";
const EMPTY: readonly PendingRwasPurchase[] = [];

export const PENDING_RWAS_PURCHASE_TTL_MS = 24 * 60 * 60 * 1_000;

interface PendingRwasPurchaseBase {
  requestId: string;
  walletAddress: Address;
  assetSymbol: string;
  assetAddress: Address;
  requestedAmount: string;
  expectedAmount: string;
  minimumAmount: string;
  startingEthereumUsdc: string;
  createdAt: number;
}

export interface LegacyPendingRwasPurchase extends PendingRwasPurchaseBase {
  version: 1;
}

export interface AcrossPendingRwasPurchase extends PendingRwasPurchaseBase {
  version: 2;
  provider: "across";
  userOperationHash: `0x${string}` | null;
  sourceTransactionHash: `0x${string}` | null;
  expectedFillTime: number;
}

export interface CctpPendingRwasPurchase extends PendingRwasPurchaseBase {
  version: 3;
  provider: "cctp";
  userOperationHash: `0x${string}` | null;
  sourceTransactionHash: `0x${string}` | null;
  destinationUserOperationHash: `0x${string}` | null;
  destinationTransactionHash: `0x${string}` | null;
  destinationOperationKind?: "atomic" | "mint" | null;
  destinationOperationSubmittedAt?: number | null;
  ethereumUsdcReceivedAt?: number | null;
  settledAmount?: string | null;
  orderUserOperationHash?: `0x${string}` | null;
  oneInchOrderHash?: `0x${string}` | null;
  oneInchOrderExpiresAt?: number | null;
  expectedFillTime: number;
}

export type PendingRwasPurchase =
  LegacyPendingRwasPurchase | AcrossPendingRwasPurchase | CctpPendingRwasPurchase;

function isUnsignedInteger(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

function isHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/u.test(value);
}

function isPendingRwasPurchase(value: unknown): value is PendingRwasPurchase {
  if (!value || typeof value !== "object") return false;
  const pending = value as Record<string, unknown>;
  return (
    (pending.version === 1 ||
      (pending.version === 2 &&
        pending.provider === "across" &&
        (pending.userOperationHash === null || isHash(pending.userOperationHash)) &&
        (pending.sourceTransactionHash === null || isHash(pending.sourceTransactionHash)) &&
        typeof pending.expectedFillTime === "number" &&
        Number.isFinite(pending.expectedFillTime) &&
        pending.expectedFillTime >= 0) ||
      (pending.version === 3 &&
        pending.provider === "cctp" &&
        (pending.userOperationHash === null || isHash(pending.userOperationHash)) &&
        (pending.sourceTransactionHash === null || isHash(pending.sourceTransactionHash)) &&
        (pending.destinationUserOperationHash === null ||
          isHash(pending.destinationUserOperationHash)) &&
        (pending.destinationTransactionHash === null ||
          isHash(pending.destinationTransactionHash)) &&
        (pending.destinationOperationKind === undefined ||
          pending.destinationOperationKind === null ||
          pending.destinationOperationKind === "atomic" ||
          pending.destinationOperationKind === "mint") &&
        (pending.destinationOperationSubmittedAt === undefined ||
          pending.destinationOperationSubmittedAt === null ||
          (typeof pending.destinationOperationSubmittedAt === "number" &&
            Number.isFinite(pending.destinationOperationSubmittedAt))) &&
        (pending.ethereumUsdcReceivedAt === undefined ||
          pending.ethereumUsdcReceivedAt === null ||
          (typeof pending.ethereumUsdcReceivedAt === "number" &&
            Number.isFinite(pending.ethereumUsdcReceivedAt))) &&
        (pending.settledAmount === undefined ||
          pending.settledAmount === null ||
          isUnsignedInteger(pending.settledAmount)) &&
        (pending.orderUserOperationHash === undefined ||
          pending.orderUserOperationHash === null ||
          isHash(pending.orderUserOperationHash)) &&
        (pending.oneInchOrderHash === undefined ||
          pending.oneInchOrderHash === null ||
          isHash(pending.oneInchOrderHash)) &&
        (pending.oneInchOrderExpiresAt === undefined ||
          pending.oneInchOrderExpiresAt === null ||
          (typeof pending.oneInchOrderExpiresAt === "number" &&
            Number.isFinite(pending.oneInchOrderExpiresAt))) &&
        typeof pending.expectedFillTime === "number" &&
        Number.isFinite(pending.expectedFillTime) &&
        pending.expectedFillTime >= 0)) &&
    typeof pending.requestId === "string" &&
    pending.requestId !== "" &&
    typeof pending.walletAddress === "string" &&
    isAddress(pending.walletAddress) &&
    typeof pending.assetSymbol === "string" &&
    pending.assetSymbol !== "" &&
    typeof pending.assetAddress === "string" &&
    isAddress(pending.assetAddress) &&
    isUnsignedInteger(pending.requestedAmount) &&
    BigInt(pending.requestedAmount) > 0n &&
    isUnsignedInteger(pending.expectedAmount) &&
    isUnsignedInteger(pending.minimumAmount) &&
    isUnsignedInteger(pending.startingEthereumUsdc) &&
    typeof pending.createdAt === "number" &&
    Number.isFinite(pending.createdAt)
  );
}

let cached: readonly PendingRwasPurchase[] | undefined;
const listeners = new Set<() => void>();

function read(): readonly PendingRwasPurchase[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPendingRwasPurchase) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function notify(): void {
  for (const listener of listeners) listener();
}

function write(next: readonly PendingRwasPurchase[]): void {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory intent so this tab can still finish the purchase.
  }
  notify();
}

export function subscribePendingRwasPurchases(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key?.startsWith(LEGACY_PREFIX)) {
      cached = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function pendingRwasPurchasesSnapshot(): readonly PendingRwasPurchase[] {
  if (cached === undefined) cached = read();
  return cached;
}

export function serverPendingRwasPurchasesSnapshot(): readonly PendingRwasPurchase[] {
  return EMPTY;
}

export function savePendingRwasPurchase(next: PendingRwasPurchase): void {
  const current = pendingRwasPurchasesSnapshot().filter(
    (pending) => pending.requestId !== next.requestId
  );
  write([...current, next].slice(-8));
}

export function clearPendingRwasPurchase(requestId: string): void {
  write(pendingRwasPurchasesSnapshot().filter((pending) => pending.requestId !== requestId));
}

export function requestPendingRwasPurchaseRetry(requestId: string): void {
  window.dispatchEvent(new CustomEvent(RETRY_EVENT, { detail: requestId }));
}

export function subscribePendingRwasPurchaseRetries(
  listener: (requestId: string) => void
): () => void {
  const onRetry = (event: Event) => {
    const requestId = (event as CustomEvent<unknown>).detail;
    if (typeof requestId === "string" && requestId !== "") listener(requestId);
  };
  window.addEventListener(RETRY_EVENT, onRetry);
  return () => window.removeEventListener(RETRY_EVENT, onRetry);
}

export function isPendingRwasPurchaseActive(pending: PendingRwasPurchase, now: number): boolean {
  return now - pending.createdAt < PENDING_RWAS_PURCHASE_TTL_MS;
}

// The first implementation stored one intent per wallet and symbol. Migrate
// those records so purchases already funded on Ethereum continue after this
// tracker ships, rather than asking the user to bridge a second time.
export function migrateLegacyPendingRwasPurchases(): number {
  if (typeof window === "undefined") return 0;
  const legacyKeys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(LEGACY_PREFIX)) legacyKeys.push(key);
  }

  const migrated: PendingRwasPurchase[] = [];
  for (const key of legacyKeys) {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
      if (isPendingRwasPurchase(parsed)) migrated.push(parsed);
    } catch {
      // Invalid legacy data is removed below and cannot be executed.
    }
  }
  if (migrated.length > 0) {
    const byRequestId = new Map(
      [...pendingRwasPurchasesSnapshot(), ...migrated].map((pending) => [
        pending.requestId,
        pending,
      ])
    );
    write([...byRequestId.values()].slice(-8));
  }
  for (const key of legacyKeys) window.localStorage.removeItem(key);
  return migrated.length;
}
