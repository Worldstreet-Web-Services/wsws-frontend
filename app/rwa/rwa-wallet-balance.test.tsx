import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RwaWalletBalance } from "./rwa-wallet-balance";

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, authenticated: true }),
}));

vi.mock("@/hooks/use-portfolio", () => ({
  usePortfolio: () => ({
    tokens: [
      { network: "base-mainnet", symbol: "USDC", balance: 87.42 },
      { network: "eth-mainnet", symbol: "USDC", balance: 500 },
    ],
    loading: false,
    error: false,
  }),
}));

describe("RwaWalletBalance", () => {
  it("shows only spendable Base USDC and links to Portfolio", () => {
    render(<RwaWalletBalance />);

    const balance = screen.getByRole("link", {
      name: "Base USDC available balance $87.42",
    });
    expect(balance).toHaveAttribute("href", "/dashboard#portfolio");
    expect(balance).toHaveTextContent("$87.42");
    expect(balance).toHaveTextContent("USDC");
  });
});
