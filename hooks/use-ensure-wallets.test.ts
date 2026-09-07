import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { User } from "@privy-io/react-auth";

const mockCreateEthereumWallet = vi.fn();
const mockCreateSolanaWallet = vi.fn();
const mockDelegateWallet = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  useCreateWallet: () => ({ createWallet: mockCreateEthereumWallet }),
  useHeadlessDelegatedActions: () => ({ delegateWallet: mockDelegateWallet }),
}));

vi.mock("@privy-io/react-auth/solana", () => ({
  useCreateWallet: () => ({ createWallet: mockCreateSolanaWallet }),
}));

describe("useEnsureWallets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions and delegates missing wallets", async () => {
    const { useEnsureWallets } = await import("./use-ensure-wallets");
    const userWithoutWallets = {
      id: "did:privy:user1",
      linkedAccounts: [],
    } as unknown as User;

    mockCreateEthereumWallet.mockResolvedValue({
      address: "0x1111111111111111111111111111111111111111",
      chainType: "ethereum",
    });
    mockCreateSolanaWallet.mockResolvedValue({
      wallet: {
        address: "So11111111111111111111111111111111111111112",
        chainType: "solana",
      },
    });
    mockDelegateWallet.mockResolvedValue(undefined);

    const { result } = renderHook(() => useEnsureWallets());
    await result.current(userWithoutWallets);

    expect(mockCreateEthereumWallet).toHaveBeenCalledTimes(1);
    expect(mockCreateSolanaWallet).toHaveBeenCalledTimes(1);
    expect(mockDelegateWallet).toHaveBeenCalledWith({
      address: "0x1111111111111111111111111111111111111111",
      chainType: "ethereum",
    });
    expect(mockDelegateWallet).toHaveBeenCalledWith({
      address: "So11111111111111111111111111111111111111112",
      chainType: "solana",
    });
  });

  it("delegates existing undelegated wallets without recreating them", async () => {
    const { useEnsureWallets } = await import("./use-ensure-wallets");
    const userWithUndelegatedWallets = {
      id: "did:privy:user2",
      linkedAccounts: [
        {
          type: "wallet",
          walletClientType: "privy",
          chainType: "ethereum",
          address: "0x2222222222222222222222222222222222222222",
          delegated: false,
        },
        {
          type: "wallet",
          walletClientType: "privy",
          chainType: "solana",
          address: "So22222222222222222222222222222222222222222",
          delegated: false,
        },
      ],
    } as unknown as User;

    const { result } = renderHook(() => useEnsureWallets());
    await result.current(userWithUndelegatedWallets);

    expect(mockCreateEthereumWallet).not.toHaveBeenCalled();
    expect(mockCreateSolanaWallet).not.toHaveBeenCalled();
    expect(mockDelegateWallet).toHaveBeenCalledWith({
      address: "0x2222222222222222222222222222222222222222",
      chainType: "ethereum",
    });
    expect(mockDelegateWallet).toHaveBeenCalledWith({
      address: "So22222222222222222222222222222222222222222",
      chainType: "solana",
    });
  });

  it("skips delegation if already delegated", async () => {
    const { useEnsureWallets } = await import("./use-ensure-wallets");
    const userAlreadyDelegated = {
      id: "did:privy:user3",
      linkedAccounts: [
        {
          type: "wallet",
          walletClientType: "privy",
          chainType: "ethereum",
          address: "0x3333333333333333333333333333333333333333",
          delegated: true,
        },
        {
          type: "wallet",
          walletClientType: "privy",
          chainType: "solana",
          address: "So33333333333333333333333333333333333333333",
          delegated: true,
        },
      ],
    } as unknown as User;

    const { result } = renderHook(() => useEnsureWallets());
    await result.current(userAlreadyDelegated);

    expect(mockCreateEthereumWallet).not.toHaveBeenCalled();
    expect(mockCreateSolanaWallet).not.toHaveBeenCalled();
    expect(mockDelegateWallet).not.toHaveBeenCalled();
  });
});
