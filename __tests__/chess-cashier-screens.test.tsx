import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CashierSheet } from "@/components/dashboard/casino/chess/cashier-sheet";
import { ChessBalance } from "@/components/dashboard/casino/chess/chess-balance";

// Mocked at the API-client seam, so the real hooks, query wiring and render
// paths all run.

const cashierApi = vi.hoisted(() => ({
  fetchCashierConfig: vi.fn(),
  fetchPlayerBalance: vi.fn(),
  confirmDeposit: vi.fn(),
  createWithdrawal: vi.fn(),
  isCashierOff: vi.fn(() => false),
}));
vi.mock("@/lib/casino/api/cashier", () => cashierApi);

const sendToken = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-withdraw", () => ({
  useSendToken: () => ({ sendToken, sending: false }),
}));

const WALLET = "0x1111111111111111111111111111111111111111";
vi.mock("@/hooks/use-casino-wallet", () => ({
  useCasinoWallet: () => ({
    address: WALLET,
    connected: true,
    balance: 0,
    balanceUsd: 0,
    unitPriceUsd: 0,
    isLoading: false,
    canAfford: () => true,
    refetch: vi.fn(),
    format: (n: number) => `$${n}`,
  }),
}));

vi.mock("@/hooks/use-portfolio", () => ({
  usePortfolio: () => ({
    tokens: [{ network: "base-mainnet", symbol: "USDC", balance: 100, valueUsd: 100 }],
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const CONFIG = {
  chainId: 8453,
  tokenSymbol: "USDC",
  tokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  depositAddress: "0xBACKENDWALLET",
  requiredConfirmations: 1,
  platformFeeBps: 500,
};

function balance(available: bigint, locked = 0n) {
  return {
    player: WALLET,
    availableMicro: available,
    lockedMicro: locked,
    totalMicro: available + locked,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  cashierApi.fetchCashierConfig.mockResolvedValue(CONFIG);
  cashierApi.fetchPlayerBalance.mockResolvedValue(balance(50_000_000n));
  cashierApi.confirmDeposit.mockResolvedValue({ txHash: "0xabc", amountMicro: 10_000_000n });
  cashierApi.createWithdrawal.mockResolvedValue({
    id: "w1",
    player: WALLET,
    toAddress: WALLET,
    amountMicro: 10_000_000n,
    txHash: `0x${"f".repeat(64)}`,
    status: "broadcasted",
    sentAt: null,
  });
  sendToken.mockResolvedValue(`0x${"a".repeat(64)}`);
});

describe("cashier availability", () => {
  it("shows the balance once the cashier is on", async () => {
    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    expect(await screen.findByText("50 USDC")).toBeInTheDocument();
  });

  it("says staked chess is off when the service has no cashier", async () => {
    // What the deployed service answers today.
    cashierApi.fetchCashierConfig.mockResolvedValue(null);

    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });

    expect(await screen.findByText(/isn't switched on yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add to chess balance/i })).not.toBeInTheDocument();
  });

  it("renders no balance pill at all without a cashier", async () => {
    cashierApi.fetchCashierConfig.mockResolvedValue(null);

    const { container } = render(<ChessBalance />, { wrapper });

    await waitFor(() => expect(cashierApi.fetchCashierConfig).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("shows what is locked in play separately from what is spendable", async () => {
    cashierApi.fetchPlayerBalance.mockResolvedValue(balance(30_000_000n, 20_000_000n));

    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });

    expect(await screen.findByText("30 USDC")).toBeInTheDocument();
    expect(screen.getByText("In play")).toBeInTheDocument();
  });
});

describe("deposit", () => {
  it("sends the transfer then tells the service about it", async () => {
    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("50 USDC");

    fireEvent.change(screen.getByLabelText("Deposit amount"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /add to chess balance/i }));

    await waitFor(() =>
      expect(sendToken).toHaveBeenCalledWith(
        expect.objectContaining({ to: CONFIG.depositAddress, amount: 10_000_000n, decimals: 6 })
      )
    );
    await waitFor(() =>
      expect(cashierApi.confirmDeposit).toHaveBeenCalledWith(WALLET, `0x${"a".repeat(64)}`)
    );
  });

  it("refuses more than the wallet holds", async () => {
    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("50 USDC");

    fireEvent.change(screen.getByLabelText("Deposit amount"), { target: { value: "500" } });

    expect(await screen.findByText(/more than your wallet holds/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to chess balance/i })).toBeDisabled();
  });

  it("keeps the hash when the credit call fails, so the money is recoverable", async () => {
    // The money has left the wallet at this point. Losing the hash would lose
    // the only proof of it.
    cashierApi.confirmDeposit.mockRejectedValue(
      Object.assign(new Error("boom"), { code: "UPSTREAM_ERROR" })
    );

    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("50 USDC");

    fireEvent.change(screen.getByLabelText("Deposit amount"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /add to chess balance/i }));

    await waitFor(() => {
      const stored = window.localStorage.getItem(
        `wsws.chess-cashier.pending-deposit.${WALLET.toLowerCase()}`
      );
      expect(stored).toContain(`0x${"a".repeat(64)}`);
    });
  }, 30_000);

  it("offers to finish a deposit left uncredited from a previous visit", async () => {
    window.localStorage.setItem(
      `wsws.chess-cashier.pending-deposit.${WALLET.toLowerCase()}`,
      JSON.stringify({ txHash: `0x${"b".repeat(64)}`, amountMicro: "10000000", savedAt: 1 })
    );

    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: /finish crediting/i }));

    await waitFor(() =>
      expect(cashierApi.confirmDeposit).toHaveBeenCalledWith(WALLET, `0x${"b".repeat(64)}`)
    );
  });

  it("credits a hash the user pasted in", async () => {
    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("50 USDC");

    fireEvent.click(screen.getByRole("button", { name: /credit it by transaction hash/i }));
    fireEvent.change(screen.getByLabelText(/transaction hash/i), {
      target: { value: `0x${"c".repeat(64)}` },
    });
    fireEvent.click(screen.getByRole("button", { name: /credit this transaction/i }));

    await waitFor(() =>
      expect(cashierApi.confirmDeposit).toHaveBeenCalledWith(WALLET, `0x${"c".repeat(64)}`)
    );
  });

  it("will not credit something that is not a transaction hash", async () => {
    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("50 USDC");

    fireEvent.click(screen.getByRole("button", { name: /credit it by transaction hash/i }));
    fireEvent.change(screen.getByLabelText(/transaction hash/i), { target: { value: "0xnope" } });

    expect(screen.getByRole("button", { name: /credit this transaction/i })).toBeDisabled();
  });
});

describe("withdraw", () => {
  it("sends the withdrawal for the typed amount", async () => {
    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("50 USDC");

    fireEvent.click(screen.getByRole("button", { name: "withdraw" }));
    fireEvent.change(await screen.findByLabelText("Withdrawal amount"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    await waitFor(() =>
      expect(cashierApi.createWithdrawal).toHaveBeenCalledWith({
        player: WALLET,
        amountMicro: 10_000_000n,
      })
    );
  });

  it("refuses more than is available, ignoring what is locked in play", async () => {
    // Locked money belongs to a game in progress and is not the player's to
    // take back yet.
    cashierApi.fetchPlayerBalance.mockResolvedValue(balance(10_000_000n, 40_000_000n));

    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("10 USDC");

    fireEvent.click(screen.getByRole("button", { name: "withdraw" }));
    fireEvent.change(await screen.findByLabelText("Withdrawal amount"), {
      target: { value: "30" },
    });

    expect(await screen.findByText(/more than your available balance/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Withdraw" })).toBeDisabled();
    expect(cashierApi.createWithdrawal).not.toHaveBeenCalled();
  });

  it("surfaces the service refusing for want of balance", async () => {
    cashierApi.createWithdrawal.mockRejectedValue(
      Object.assign(new Error("insufficient available balance"), { code: "CONFLICT" })
    );

    render(<CashierSheet open onClose={vi.fn()} />, { wrapper });
    await screen.findByText("50 USDC");

    fireEvent.click(screen.getByRole("button", { name: "withdraw" }));
    fireEvent.change(await screen.findByLabelText("Withdrawal amount"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    await waitFor(() => expect(cashierApi.createWithdrawal).toHaveBeenCalled());
    // The failure must not read as a success: no explorer link appears.
    expect(screen.queryByText(/view your withdrawal/i)).not.toBeInTheDocument();
  });
});
