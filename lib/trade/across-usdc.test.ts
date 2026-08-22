import { describe, expect, it } from "vitest";

import {
  buildEthereumUsdcToBaseCalls,
  isEthereumUsdcToBase,
} from "@/lib/trade/across-usdc";

const WALLET = "0x1111111111111111111111111111111111111111" as const;

describe("Ethereum USDC return route", () => {
  it("only selects native Ethereum USDC", () => {
    expect(
      isEthereumUsdcToBase("eth-mainnet", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
    ).toBe(true);
    expect(
      isEthereumUsdcToBase("base-mainnet", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
    ).toBe(false);
    expect(isEthereumUsdcToBase("eth-mainnet", null)).toBe(false);
  });

  it("builds only Ethereum calls from a live-shaped quote", () => {
    const quote = {
      id: "quote-1",
      inputAmount: "581972",
      expectedOutputAmount: "578587",
      minOutputAmount: "578587",
      expectedFillTime: 2,
      quoteExpiryTimestamp: Math.floor(Date.now() / 1_000) + 60,
      approvalTxns: [{ chainId: 1, to: WALLET, data: "0x095ea7b3", value: "0" }],
      swapTx: { chainId: 1, to: WALLET, data: "0x1234", value: "0" },
    };

    expect(buildEthereumUsdcToBaseCalls(quote)).toEqual([
      { to: WALLET, data: "0x095ea7b3", value: 0n },
      { to: WALLET, data: "0x1234", value: 0n },
    ]);
  });
});
