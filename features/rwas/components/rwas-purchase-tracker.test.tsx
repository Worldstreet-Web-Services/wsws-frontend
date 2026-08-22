import type { ReactNode } from "react";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RwasPurchaseTracker } from "@/features/rwas/components/rwas-purchase-tracker";
import {
  clearPendingRwasPurchase,
  pendingRwasPurchasesSnapshot,
  savePendingRwasPurchase,
} from "@/features/rwas/lib/pending-purchase";

const WALLET = "0x1111111111111111111111111111111111111111";
const ASSET = "0x2222222222222222222222222222222222222222";

const mocks = vi.hoisted(() => ({
  fetchBalance: vi.fn(),
  fetchMarketAsset: vi.fn(),
  fetchFirmQuote: vi.fn(),
  fetchOneInchStatus: vi.fn(),
  fetchDepositStatus: vi.fn(),
  fetchAcrossStatus: vi.fn(),
  fetchUserOperationTransactionHash: vi.fn(),
  fetchCctpStatus: vi.fn(),
  fetchCctpUserOperationReceipt: vi.fn(),
  fetchCctpMessageReceived: vi.fn(),
  buildCctpReceiveCall: vi.fn(),
  sendBatch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  walletsReady: true,
  wallets: [] as Array<{ walletClientType: string; address: string }>,
}));

vi.mock("@privy-io/react-auth", () => ({
  getAccessToken: vi.fn(),
  getIdentityToken: vi.fn(),
  usePrivy: () => ({
    user: {
      linkedAccounts: [
        {
          type: "wallet",
          walletClientType: "privy",
          chainType: "ethereum",
          address: WALLET,
        },
      ],
    },
  }),
  useWallets: () => ({
    ready: mocks.walletsReady,
    wallets: mocks.wallets,
  }),
}));

vi.mock("@/features/rwas/hooks/use-rwas-oneinch-order", () => ({
  useRwasOneInchOrder: () => mocks.fetchFirmQuote,
}));

vi.mock("@/features/rwas/lib/evm-balance", () => ({
  fetchErc20Balance: mocks.fetchBalance,
}));

vi.mock("@/features/rwas/lib/api", () => ({
  fetchMarketAsset: mocks.fetchMarketAsset,
}));

vi.mock("@/features/rwas/lib/oneinch", () => ({
  fetchRwasOneInchOrderStatus: mocks.fetchOneInchStatus,
}));

vi.mock("@/features/rwas/lib/across", () => ({
  fetchRwasAcrossStatus: mocks.fetchAcrossStatus,
  fetchBaseUserOperationTransactionHash: mocks.fetchUserOperationTransactionHash,
}));

vi.mock("@/features/rwas/lib/cctp", () => ({
  fetchRwasCctpStatus: mocks.fetchCctpStatus,
  fetchCctpUserOperationReceipt: mocks.fetchCctpUserOperationReceipt,
  fetchRwasCctpMessageReceived: mocks.fetchCctpMessageReceived,
  buildRwasCctpReceiveCall: mocks.buildCctpReceiveCall,
}));

vi.mock("@/hooks/use-deposit", () => ({
  fetchDepositStatus: mocks.fetchDepositStatus,
}));

vi.mock("@/hooks/use-evm-send", () => ({
  useEvmSendBatch: () => mocks.sendBatch,
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.walletsReady = true;
  mocks.wallets.splice(0, mocks.wallets.length, {
    walletClientType: "privy",
    address: WALLET,
  });
  for (const pending of pendingRwasPurchasesSnapshot()) {
    clearPendingRwasPurchase(pending.requestId);
  }
  window.localStorage.clear();
  mocks.fetchBalance.mockResolvedValue(15_000_000n);
  mocks.fetchMarketAsset.mockResolvedValue({ minimumAmountUsd: "1" });
  mocks.fetchFirmQuote.mockImplementation(async ({ amount }: { amount: string }) => ({
    orderHash: `0x${"e".repeat(64)}`,
    status: "pending",
    expiresAt: "2099-01-01T00:00:00.000Z",
    quote: {
      side: "buy",
      input: {
        address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        symbol: "USDC",
        decimals: 6,
        amount: parseUnits(amount, 6).toString(),
      },
      output: {
        address: ASSET,
        symbol: "IBITon",
        decimals: 18,
        amount: "220000000000000000",
        minimumAmount: "218900000000000000",
      },
    },
  }));
  mocks.fetchOneInchStatus.mockResolvedValue({
    orderHash: `0x${"e".repeat(64)}`,
    status: "pending",
    transactionHash: null,
  });
  mocks.sendBatch.mockResolvedValue(
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  );
  mocks.fetchAcrossStatus.mockResolvedValue({
    status: "pending",
    depositTxnRef: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    fillTxnRef: null,
    refundTxnRef: null,
  });
  mocks.fetchUserOperationTransactionHash.mockResolvedValue(null);
  mocks.fetchCctpStatus.mockResolvedValue({
    status: "pending",
    sourceTransactionHash: `0x${"b".repeat(64)}`,
  });
  mocks.fetchCctpUserOperationReceipt.mockResolvedValue({
    state: "pending",
    transactionHash: null,
  });
  mocks.fetchCctpMessageReceived.mockResolvedValue(false);
  mocks.buildCctpReceiveCall.mockReturnValue({
    to: "0x3333333333333333333333333333333333333333",
    data: "0x1234",
    outputAmount: 9_998_700n,
  });
});

describe("RwasPurchaseTracker", () => {
  it("submits the Ethereum venue trade from delivered USDC before requesting bridge status", async () => {
    savePendingRwasPurchase({
      version: 1,
      requestId: "request-1",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "10000000",
      expectedAmount: "9970000",
      minimumAmount: "9900000",
      startingEthereumUsdc: "5000000",
      createdAt: Date.now(),
    });

    const { container } = render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(mocks.fetchFirmQuote).toHaveBeenCalledOnce());
    expect(mocks.fetchFirmQuote).toHaveBeenCalledWith({
      symbol: "IBITon",
      side: "buy",
      amount: "9.97",
      walletAddress: WALLET,
    });
    expect(mocks.fetchDepositStatus).not.toHaveBeenCalled();
    expect(mocks.sendBatch).not.toHaveBeenCalled();
    expect(pendingRwasPurchasesSnapshot()).toEqual([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("recovers the Base transaction after local user-operation receipt polling times out", async () => {
    const userOperationHash = `0x${"c".repeat(64)}` as const;
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    mocks.fetchBalance.mockResolvedValue(5_000_000n);
    mocks.fetchUserOperationTransactionHash.mockResolvedValue(sourceTransactionHash);
    savePendingRwasPurchase({
      version: 2,
      provider: "across",
      requestId: "quote-2",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "10000000",
      expectedAmount: "9970000",
      minimumAmount: "9900000",
      startingEthereumUsdc: "5000000",
      userOperationHash,
      sourceTransactionHash: null,
      expectedFillTime: 7,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() =>
      expect(mocks.fetchAcrossStatus).toHaveBeenCalledWith(sourceTransactionHash)
    );
    expect(mocks.fetchDepositStatus).not.toHaveBeenCalled();
    expect(pendingRwasPurchasesSnapshot()).toEqual([
      expect.objectContaining({
        requestId: "quote-2",
        userOperationHash,
        sourceTransactionHash,
      }),
    ]);
  });

  it("releases a filled purchase when the delivered USDC is below the Ondo minimum", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    mocks.fetchBalance.mockResolvedValue(830_591n);
    savePendingRwasPurchase({
      version: 2,
      provider: "across",
      requestId: "quote-too-small",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1000000",
      expectedAmount: "830591",
      minimumAmount: "820000",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      expectedFillTime: 2,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(pendingRwasPurchasesSnapshot()).toEqual([]));
    expect(mocks.fetchFirmQuote).not.toHaveBeenCalled();
    expect(mocks.sendBatch).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Across delivered 0.830591 Ethereum USDC, below the 1 USDC minimum for IBITon. No asset order was submitted; the USDC remains in your Ethereum wallet."
    );
  });

  it("claims Circle USDC before buying the asset", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    mocks.fetchCctpStatus.mockResolvedValue({
      status: "complete",
      sourceTransactionHash,
      message: "0x12",
      attestation: "0x34",
      outputAmount: "9998700",
      feeExecuted: "1300",
    });
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-quote-1",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "10000000",
      expectedAmount: "9998700",
      minimumAmount: "9998360",
      startingEthereumUsdc: "5000000",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash: null,
      destinationTransactionHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(mocks.fetchFirmQuote).toHaveBeenCalledOnce());
    expect(mocks.fetchCctpStatus).toHaveBeenCalledWith({
      sourceTransactionHash,
      depositor: WALLET,
      amount: "10000000",
    });
    expect(mocks.fetchFirmQuote).toHaveBeenCalledWith({
      symbol: "IBITon",
      side: "buy",
      amount: "9.9987",
      walletAddress: WALLET,
    });
    const [settlementCalls, settlementChainId] = mocks.sendBatch.mock.calls[0] as [
      Array<{ to: string; data: string }>,
      number,
    ];
    expect(settlementChainId).toBe(1);
    expect(settlementCalls).toEqual([
      {
        to: "0x3333333333333333333333333333333333333333",
        data: "0x1234",
      },
    ]);
    expect(mocks.sendBatch).toHaveBeenCalledOnce();
    expect(pendingRwasPurchasesSnapshot()).toEqual([
      expect.objectContaining({
        requestId: "cctp-quote-1",
        oneInchOrderHash: `0x${"e".repeat(64)}`,
      }),
    ]);
  });

  it("clears a bridged purchase only after the Fusion order fills", async () => {
    const orderHash = `0x${"e".repeat(64)}` as const;
    const transactionHash = `0x${"f".repeat(64)}` as const;
    mocks.fetchOneInchStatus.mockResolvedValue({
      orderHash,
      status: "filled",
      transactionHash,
    });
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-fusion-filled",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "10000000",
      expectedAmount: "9998700",
      minimumAmount: "9998360",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash: `0x${"b".repeat(64)}`,
      destinationUserOperationHash: null,
      destinationTransactionHash: `0x${"d".repeat(64)}`,
      destinationOperationKind: "mint",
      ethereumUsdcReceivedAt: Date.now(),
      settledAmount: "9998700",
      oneInchOrderHash: orderHash,
      oneInchOrderExpiresAt: Date.now() + 30_000,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(pendingRwasPurchasesSnapshot()).toEqual([]));
    expect(mocks.fetchOneInchStatus).toHaveBeenCalledWith(orderHash);
    expect(mocks.fetchFirmQuote).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("IBITon purchase filled through 1inch Fusion.");
  });

  it("keeps Ethereum USDC retryable when a Fusion order expires", async () => {
    const orderHash = `0x${"e".repeat(64)}` as const;
    mocks.fetchOneInchStatus.mockResolvedValue({
      orderHash,
      status: "expired",
      transactionHash: null,
    });
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-fusion-expired",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "10000000",
      expectedAmount: "9998700",
      minimumAmount: "9998360",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash: `0x${"b".repeat(64)}`,
      destinationUserOperationHash: null,
      destinationTransactionHash: `0x${"d".repeat(64)}`,
      destinationOperationKind: "mint",
      ethereumUsdcReceivedAt: Date.now(),
      settledAmount: "9998700",
      oneInchOrderHash: orderHash,
      oneInchOrderExpiresAt: Date.now() - 1,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() =>
      expect(pendingRwasPurchasesSnapshot()).toEqual([
        expect.objectContaining({
          requestId: "cctp-fusion-expired",
          oneInchOrderHash: null,
          oneInchOrderExpiresAt: null,
        }),
      ])
    );
    expect(mocks.fetchFirmQuote).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "The 1inch Fusion order expired. Your Ethereum USDC remains available. Select Continue purchase to retry."
    );
  });

  it("discovers a claimable Circle transfer while Privy's wallet list is hydrating", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    mocks.walletsReady = false;
    mocks.wallets.length = 0;
    mocks.fetchCctpStatus.mockResolvedValue({
      status: "complete",
      sourceTransactionHash,
      message: "0x12",
      attestation: "0x34",
      outputAmount: "1009869",
      feeExecuted: "131",
    });
    mocks.buildCctpReceiveCall.mockReturnValue({
      to: "0x3333333333333333333333333333333333333333",
      data: "0x1234",
      outputAmount: 1_009_869n,
    });
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-wallet-not-ready",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1010000",
      expectedAmount: "1009869",
      minimumAmount: "1009835",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash: null,
      destinationTransactionHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() =>
      expect(pendingRwasPurchasesSnapshot()).toEqual([
        expect.objectContaining({
          requestId: "cctp-wallet-not-ready",
          destinationOperationKind: "mint",
          settledAmount: "1009869",
        }),
      ])
    );
    expect(mocks.fetchCctpStatus).toHaveBeenCalled();
    expect(mocks.fetchCctpMessageReceived).toHaveBeenCalled();
    expect(mocks.sendBatch).not.toHaveBeenCalled();
  });

  it("releases a stale Ethereum claim so the user can submit it again", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const destinationUserOperationHash = `0x${"c".repeat(64)}` as const;
    mocks.fetchCctpStatus.mockResolvedValue({
      status: "complete",
      sourceTransactionHash,
      message: "0x12",
      attestation: "0x34",
      outputAmount: "1009869",
      feeExecuted: "131",
    });
    mocks.buildCctpReceiveCall.mockReturnValue({
      to: "0x3333333333333333333333333333333333333333",
      data: "0x1234",
      outputAmount: 1_009_869n,
    });
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-stale-claim",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1010000",
      expectedAmount: "1009869",
      minimumAmount: "1009835",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash,
      destinationTransactionHash: null,
      destinationOperationKind: "mint",
      destinationOperationSubmittedAt: Date.now() - 3 * 60_000,
      ethereumUsdcReceivedAt: null,
      settledAmount: "1009869",
      expectedFillTime: 8,
      createdAt: Date.now() - 3 * 60_000,
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() =>
      expect(pendingRwasPurchasesSnapshot()).toEqual([
        expect.objectContaining({
          requestId: "cctp-stale-claim",
          destinationUserOperationHash: null,
          destinationOperationKind: "mint",
          settledAmount: "1009869",
        }),
      ])
    );
    expect(mocks.sendBatch).not.toHaveBeenCalled();
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      "The previous Ethereum claim expired. Your Circle transfer is ready to claim again."
    );
  });

  it("keeps the Circle transfer recoverable when the Ethereum claim reverts", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    mocks.fetchCctpStatus.mockResolvedValue({
      status: "complete",
      sourceTransactionHash,
      message: "0x12",
      attestation: "0x34",
      outputAmount: "1199844",
      feeExecuted: "156",
    });
    mocks.buildCctpReceiveCall.mockReturnValue({
      to: "0x3333333333333333333333333333333333333333",
      data: "0x1234",
      outputAmount: 1_199_844n,
    });
    mocks.sendBatch.mockRejectedValueOnce(new Error("Execution reverted"));
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-quote-order-reverts",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1200000",
      expectedAmount: "1199844",
      minimumAmount: "1199804",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash: null,
      destinationTransactionHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(mocks.sendBatch).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(pendingRwasPurchasesSnapshot()).toEqual([
        expect.objectContaining({
          requestId: "cctp-quote-order-reverts",
          destinationTransactionHash: null,
        }),
      ])
    );
    expect(mocks.sendBatch.mock.calls[0]?.[0] as unknown[]).toHaveLength(1);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Execution reverted Select Continue purchase to claim the Ethereum USDC. No second Base transfer is required."
    );
  });

  it("leaves claimed Ethereum USDC recoverable when the asset quote fails", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const settlementTransactionHash =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
    mocks.fetchBalance.mockResolvedValue(1_009_869n);
    mocks.fetchCctpStatus.mockResolvedValue({
      status: "complete",
      sourceTransactionHash,
      message: "0x12",
      attestation: "0x34",
      outputAmount: "1009869",
      feeExecuted: "131",
    });
    mocks.buildCctpReceiveCall.mockReturnValue({
      to: "0x3333333333333333333333333333333333333333",
      data: "0x1234",
      outputAmount: 1_009_869n,
    });
    mocks.fetchFirmQuote.mockRejectedValueOnce(new Error("No venue route is available"));
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-quote-unavailable-after-claim",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1010000",
      expectedAmount: "1009869",
      minimumAmount: "1009835",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash: null,
      destinationTransactionHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(mocks.fetchFirmQuote).toHaveBeenCalledOnce());
    expect(mocks.sendBatch).toHaveBeenCalledOnce();
    expect(pendingRwasPurchasesSnapshot()).toEqual([
      expect.objectContaining({
        requestId: "cctp-quote-unavailable-after-claim",
        destinationOperationKind: "mint",
        destinationTransactionHash: settlementTransactionHash,
        settledAmount: "1009869",
      }),
    ]);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "No venue route is available Your Ethereum USDC remains available. Select Continue purchase to retry the order without another transfer."
    );
  });

  it("clears a stale mint operation after Circle consumed the message and the USDC moved", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const destinationUserOperationHash = `0x${"c".repeat(64)}` as const;
    mocks.fetchBalance.mockResolvedValue(0n);
    mocks.fetchCctpStatus.mockResolvedValue({
      status: "complete",
      sourceTransactionHash,
      message: "0x12",
      attestation: "0x34",
      outputAmount: "1199844",
      feeExecuted: "156",
    });
    mocks.fetchCctpMessageReceived.mockResolvedValue(true);
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-stale-mint-operation",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1200000",
      expectedAmount: "1199844",
      minimumAmount: "1199804",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash,
      destinationTransactionHash: null,
      destinationOperationKind: "mint",
      settledAmount: "1199844",
      orderUserOperationHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(pendingRwasPurchasesSnapshot()).toEqual([]));
    expect(mocks.fetchCctpMessageReceived).toHaveBeenCalledWith({
      message: "0x12",
      depositor: WALLET,
      amount: 1_200_000n,
    });
    expect(mocks.sendBatch).not.toHaveBeenCalled();
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      "The previous IBITon purchase was cleared because its Ethereum USDC was moved from the wallet.",
      { id: "rwas-purchase-cleared-cctp-stale-mint-operation" }
    );
  });

  it("clears a settled purchase after its reserved Ethereum USDC is moved", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const settlementTransactionHash = `0x${"d".repeat(64)}` as const;
    mocks.fetchBalance.mockResolvedValue(0n);
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-usdc-moved",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1200000",
      expectedAmount: "1199844",
      minimumAmount: "1199804",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash: null,
      destinationTransactionHash: settlementTransactionHash,
      destinationOperationKind: "mint",
      settledAmount: "1199844",
      orderUserOperationHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(pendingRwasPurchasesSnapshot()).toEqual([]));
    expect(mocks.sendBatch).not.toHaveBeenCalled();
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      "The previous IBITon purchase was cleared because its Ethereum USDC was moved from the wallet.",
      { id: "rwas-purchase-cleared-cctp-usdc-moved" }
    );
  });

  it("waits silently while Privy's embedded wallet list is hydrating", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const settlementTransactionHash = `0x${"d".repeat(64)}` as const;
    mocks.walletsReady = false;
    mocks.wallets.length = 0;
    mocks.fetchBalance.mockResolvedValue(1_199_844n);
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-wallet-hydrating",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1200000",
      expectedAmount: "1199844",
      minimumAmount: "1199804",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash: null,
      destinationTransactionHash: settlementTransactionHash,
      destinationOperationKind: "mint",
      settledAmount: "1199844",
      orderUserOperationHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() => expect(mocks.fetchBalance).toHaveBeenCalled());
    expect(pendingRwasPurchasesSnapshot()).toEqual([
      expect.objectContaining({ requestId: "cctp-wallet-hydrating" }),
    ]);
    expect(mocks.sendBatch).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("marks a reverted legacy atomic destination operation for safe settlement retry", async () => {
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    const destinationUserOperationHash = `0x${"c".repeat(64)}` as const;
    mocks.fetchCctpUserOperationReceipt.mockResolvedValue({
      state: "failed",
      transactionHash: `0x${"d".repeat(64)}`,
    });
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-legacy-atomic-failure",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1200000",
      expectedAmount: "1199844",
      minimumAmount: "1199804",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash,
      destinationUserOperationHash,
      destinationTransactionHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() =>
      expect(pendingRwasPurchasesSnapshot()).toEqual([
        expect.objectContaining({
          requestId: "cctp-legacy-atomic-failure",
          destinationUserOperationHash: null,
          destinationOperationKind: null,
        }),
      ])
    );
    expect(mocks.sendBatch).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "The combined Ethereum transaction failed. Select Continue purchase to retry it; no second Base transfer is required."
    );
  });

  it("recovers the sponsored Base CCTP burn before polling Iris", async () => {
    const userOperationHash = `0x${"c".repeat(64)}` as const;
    const sourceTransactionHash = `0x${"b".repeat(64)}` as const;
    mocks.fetchCctpUserOperationReceipt.mockResolvedValue({
      state: "confirmed",
      transactionHash: sourceTransactionHash,
    });
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "cctp-quote-2",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "10000000",
      expectedAmount: "9998700",
      minimumAmount: "9998360",
      startingEthereumUsdc: "5000000",
      userOperationHash,
      sourceTransactionHash: null,
      destinationUserOperationHash: null,
      destinationTransactionHash: null,
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasPurchaseTracker />, { wrapper });

    await waitFor(() =>
      expect(mocks.fetchCctpStatus).toHaveBeenCalledWith({
        sourceTransactionHash,
        depositor: WALLET,
        amount: "10000000",
      })
    );
    expect(mocks.fetchCctpUserOperationReceipt).toHaveBeenCalledWith(
      "base-mainnet",
      userOperationHash
    );
    expect(pendingRwasPurchasesSnapshot()).toEqual([
      expect.objectContaining({ requestId: "cctp-quote-2", sourceTransactionHash }),
    ]);
  });
});
