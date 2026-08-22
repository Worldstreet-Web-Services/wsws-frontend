import { decodeFunctionData } from "viem";
import { describe, expect, it, vi } from "vitest";

import { buildRwasDexCalls } from "@/features/rwas/lib/dex";
import type { RwasDexQuote } from "@/lib/api/schemas/rwas-dex";

const USDC = "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const ASSET = "0x122940c4c5f9ccfae7fa86455a42d3ec140855ce";
const SPENDER = "0x0000000000001fF3684f28c67538d4D072C22734";

function quote(overrides: Partial<RwasDexQuote> = {}): RwasDexQuote {
  return {
    quoteId: `0x${"1".repeat(64)}`,
    provider: "bitget",
    providerName: "Bitget",
    side: "buy",
    chainId: 1,
    input: { address: USDC, symbol: "USDC", decimals: 6, amount: "1200000" },
    output: {
      address: ASSET,
      symbol: "IBITon",
      decimals: 18,
      amount: "27000000000000000",
      minimumAmount: "26865000000000000",
    },
    approval: {
      tokenAddress: USDC,
      spenderAddress: SPENDER,
      amount: "1200000",
    },
    transaction: { to: SPENDER, data: "0x1234", value: "0" },
    estimatedTimeSeconds: 1,
    gasFeeUsd: "0.02",
    expiresAt: "2099-01-01T00:00:00.000Z",
    simulated: true,
    ...overrides,
  };
}

describe("buildRwasDexCalls", () => {
  it("builds an exact approval followed by the simulated venue transaction", () => {
    const calls = buildRwasDexCalls(quote());

    expect(calls).toHaveLength(2);
    expect(calls[0]?.to.toLowerCase()).toBe(USDC.toLowerCase());
    expect(calls[1]).toEqual({ to: SPENDER, data: "0x1234", value: 0n });
    expect(
      decodeFunctionData({
        abi: [
          {
            type: "function",
            name: "approve",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ] as const,
        data: calls[0]?.data ?? "0x",
      }).args
    ).toEqual([SPENDER, 1_200_000n]);
  });

  it("rejects an expired quote before a wallet request is created", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    expect(() => buildRwasDexCalls(quote({ expiresAt: "2026-08-21T11:59:59.000Z" }))).toThrow(
      "quote expired"
    );
    vi.useRealTimers();
  });
});
