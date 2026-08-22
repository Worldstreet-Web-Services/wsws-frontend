import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPendingRwasPurchase,
  migrateLegacyPendingRwasPurchases,
  pendingRwasPurchasesSnapshot,
  requestPendingRwasPurchaseRetry,
  savePendingRwasPurchase,
  subscribePendingRwasPurchaseRetries,
  type PendingRwasPurchase,
} from "@/features/rwas/lib/pending-purchase";

const WALLET = "0x1111111111111111111111111111111111111111";
const ASSET = "0x2222222222222222222222222222222222222222";

function purchase(requestId = "request-new"): PendingRwasPurchase {
  return {
    version: 1,
    requestId,
    walletAddress: WALLET,
    assetSymbol: "IBITon",
    assetAddress: ASSET,
    requestedAmount: "10000000",
    expectedAmount: "9970000",
    minimumAmount: "9900000",
    startingEthereumUsdc: "5000000",
    createdAt: Date.now(),
  };
}

beforeEach(() => {
  for (const pending of pendingRwasPurchasesSnapshot()) {
    clearPendingRwasPurchase(pending.requestId);
  }
  window.localStorage.clear();
});

describe("pending Ondo purchases", () => {
  it("migrates the original per-asset record without changing its amounts", () => {
    const legacy = purchase("request-legacy");
    window.localStorage.setItem(
      `rwas:base-to-ethereum-buy:${WALLET.toLowerCase()}:ibiton`,
      JSON.stringify(legacy)
    );

    expect(migrateLegacyPendingRwasPurchases()).toBe(1);
    expect(pendingRwasPurchasesSnapshot()).toEqual([legacy]);
    expect(
      window.localStorage.getItem(`rwas:base-to-ethereum-buy:${WALLET.toLowerCase()}:ibiton`)
    ).toBeNull();
  });

  it("signals a retry without replacing or clearing the funded intent", () => {
    const pending = purchase();
    const listener = vi.fn();
    savePendingRwasPurchase(pending);
    const unsubscribe = subscribePendingRwasPurchaseRetries(listener);

    requestPendingRwasPurchaseRetry(pending.requestId);

    expect(listener).toHaveBeenCalledWith(pending.requestId);
    expect(pendingRwasPurchasesSnapshot()).toEqual([pending]);
    unsubscribe();
  });

  it("persists Across recovery hashes without changing the purchase identity", () => {
    const userOperationHash = `0x${"a".repeat(64)}` as const;
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const pending: PendingRwasPurchase = {
      ...purchase("across-quote-1"),
      version: 2,
      provider: "across",
      userOperationHash,
      sourceTransactionHash: null,
      expectedFillTime: 7,
    };
    savePendingRwasPurchase(pending);
    savePendingRwasPurchase({ ...pending, sourceTransactionHash });

    expect(pendingRwasPurchasesSnapshot()).toEqual([{ ...pending, sourceTransactionHash }]);
  });

  it("persists separate CCTP settlement and Ondo order recovery state", () => {
    const userOperationHash = `0x${"a".repeat(64)}` as const;
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const destinationUserOperationHash = `0x${"c".repeat(64)}` as const;
    const pending: PendingRwasPurchase = {
      ...purchase("cctp-quote-1"),
      version: 3,
      provider: "cctp",
      userOperationHash,
      sourceTransactionHash,
      destinationUserOperationHash: null,
      destinationTransactionHash: null,
      expectedFillTime: 8,
    };

    savePendingRwasPurchase(pending);
    savePendingRwasPurchase({
      ...pending,
      destinationUserOperationHash,
      destinationOperationKind: "mint",
      settledAmount: "9998700",
    });

    expect(pendingRwasPurchasesSnapshot()).toEqual([
      {
        ...pending,
        destinationUserOperationHash,
        destinationOperationKind: "mint",
        settledAmount: "9998700",
      },
    ]);
  });
});
