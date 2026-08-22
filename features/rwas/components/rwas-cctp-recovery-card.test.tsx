import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RwasCctpRecoveryCard } from "@/features/rwas/components/rwas-cctp-recovery-card";
import {
  clearPendingRwasPurchase,
  pendingRwasPurchasesSnapshot,
  savePendingRwasPurchase,
  subscribePendingRwasPurchaseRetries,
} from "@/features/rwas/lib/pending-purchase";

const WALLET = "0x1111111111111111111111111111111111111111";
const ASSET = "0x2222222222222222222222222222222222222222";
const SOURCE_HASH = `0x${"b".repeat(64)}` as const;

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  fetchStatus: vi.fn(),
  fetchMessageReceived: vi.fn(),
  buildReceiveCall: vi.fn(),
  sendBatch: vi.fn(),
  refetchUntilChanged: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: true,
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
}));

vi.mock("@/lib/api", () => ({ apiFetch: mocks.apiFetch }));
vi.mock("@/features/rwas/lib/cctp", () => ({
  fetchRwasCctpStatus: mocks.fetchStatus,
  fetchRwasCctpMessageReceived: mocks.fetchMessageReceived,
  buildRwasCctpReceiveCall: mocks.buildReceiveCall,
}));
vi.mock("@/hooks/use-evm-send", () => ({ useEvmSendBatch: () => mocks.sendBatch }));
vi.mock("@/hooks/use-portfolio", () => ({
  usePortfolio: () => ({ refetchUntilChanged: mocks.refetchUntilChanged }),
}));
vi.mock("@/lib/toast", () => ({
  toast: {
    success: mocks.toastSuccess,
    info: mocks.toastInfo,
    error: mocks.toastError,
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const pending of pendingRwasPurchasesSnapshot()) {
    clearPendingRwasPurchase(pending.requestId);
  }
  window.localStorage.clear();
  mocks.apiFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
  mocks.fetchStatus.mockResolvedValue({
    status: "pending",
    sourceTransactionHash: SOURCE_HASH,
  });
  mocks.fetchMessageReceived.mockResolvedValue(false);
  mocks.buildReceiveCall.mockReturnValue({
    to: "0x3333333333333333333333333333333333333333",
    data: "0x1234",
    outputAmount: 1_009_869n,
  });
  mocks.sendBatch.mockResolvedValue(`0x${"a".repeat(64)}`);
  mocks.refetchUntilChanged.mockResolvedValue(true);
});

describe("RwasCctpRecoveryCard", () => {
  it("shows the recoverable amount and requests a claim retry", () => {
    const retry = vi.fn();
    const unsubscribe = subscribePendingRwasPurchaseRetries(retry);
    savePendingRwasPurchase({
      version: 3,
      provider: "cctp",
      requestId: "claimable-transfer",
      walletAddress: WALLET,
      assetSymbol: "IBITon",
      assetAddress: ASSET,
      requestedAmount: "1010000",
      expectedAmount: "1009869",
      minimumAmount: "1009835",
      startingEthereumUsdc: "0",
      userOperationHash: null,
      sourceTransactionHash: SOURCE_HASH,
      destinationUserOperationHash: null,
      destinationTransactionHash: null,
      destinationOperationKind: "mint",
      destinationOperationSubmittedAt: null,
      ethereumUsdcReceivedAt: null,
      settledAmount: "1009869",
      expectedFillTime: 8,
      createdAt: Date.now(),
    });

    render(<RwasCctpRecoveryCard />, { wrapper });

    expect(screen.getByText("USDC ready to claim")).toBeInTheDocument();
    expect(screen.getByText(/Circle confirmed 1.009869 USDC/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Claim Ethereum USDC" }));
    expect(retry).toHaveBeenCalledWith("claimable-transfer");
    unsubscribe();
  });

  it("reconstructs and claims a Circle transfer from Base activity without local state", async () => {
    mocks.apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: `out:${SOURCE_HASH}`,
            hash: SOURCE_HASH,
            network: "base-mainnet",
            direction: "out",
            symbol: "USDC",
            amount: 1.01,
            timestamp: Date.now(),
            counterparty: "0xfd78ee919681417d192449715b2594ab58f5d002",
            logo: null,
          },
        ],
      }),
    });
    mocks.fetchStatus.mockResolvedValue({
      status: "complete",
      sourceTransactionHash: SOURCE_HASH,
      message: "0x12",
      attestation: "0x34",
      outputAmount: "1009869",
      feeExecuted: "131",
    });

    render(<RwasCctpRecoveryCard />, { wrapper });

    expect(await screen.findByText("USDC ready to claim")).toBeInTheDocument();
    expect(screen.getByText(/Circle confirmed 1.009869 USDC/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Claim Ethereum USDC" }));

    await waitFor(() => expect(mocks.sendBatch).toHaveBeenCalledOnce());
    expect(mocks.fetchStatus).toHaveBeenCalledWith({
      sourceTransactionHash: SOURCE_HASH,
      depositor: WALLET,
      amount: "1010000",
    });
    expect(mocks.sendBatch).toHaveBeenCalledWith(
      [{ to: "0x3333333333333333333333333333333333333333", data: "0x1234" }],
      1,
      expect.objectContaining({ onUserOperationSubmitted: expect.any(Function) })
    );
  });
});
