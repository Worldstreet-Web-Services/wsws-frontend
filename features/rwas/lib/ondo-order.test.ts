import { describe, expect, it } from "vitest";

import {
  buildOndoOrderCalls,
  confirmedBridgeSpend,
  effectiveLimitPrice,
  ETHEREUM_USDC_ADDRESS,
  ONDO_LIMIT_ORDER_ADDRESS,
} from "@/features/rwas/lib/ondo-order";
import type { MarketAssetFirmQuote } from "@/lib/api/schemas/rwas";

const ASSET = "0x2222222222222222222222222222222222222222";
const NOW = Date.parse("2026-08-20T12:00:00.000Z");

function quote(side: "buy" | "sell" = "buy"): MarketAssetFirmQuote {
  return {
    symbol: "ONDSon",
    side,
    chainId: 1,
    assetAddress: ASSET,
    tokenAmount: "0.098",
    notionalValue: "10",
    price: "100",
    quotePrice: "100",
    appliedGasFee: "0.02",
    volatilityAllowance: "0.02",
    expiresAt: "2026-08-20T12:00:10.000Z",
  };
}

describe("Ondo Ethereum order construction", () => {
  it("applies the provider allowance in the conservative direction", () => {
    expect(effectiveLimitPrice("buy", quote())).toBe(102n * 10n ** 18n);
    expect(effectiveLimitPrice("sell", quote("sell"))).toBe(98n * 10n ** 18n);
  });

  it("atomically approves exact Ethereum USDC and creates a buy order", () => {
    const calls = buildOndoOrderCalls({
      side: "buy",
      assetAddress: ASSET,
      inputAmount: 10_000_000n,
      quote: quote(),
      now: NOW,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].to).toBe(ETHEREUM_USDC_ADDRESS);
    expect(calls[0].data).toMatch(/^0x095ea7b3/u);
    expect(calls[1].to).toBe(ONDO_LIMIT_ORDER_ADDRESS);
  });

  it("approves the RWA token rather than USDC for a sell", () => {
    const calls = buildOndoOrderCalls({
      side: "sell",
      assetAddress: ASSET,
      inputAmount: 100_000n,
      quote: quote("sell"),
      now: NOW,
    });

    expect(calls[0].to.toLowerCase()).toBe(ASSET.toLowerCase());
    expect(calls[1].to).toBe(ONDO_LIMIT_ORDER_ADDRESS);
  });

  it("never spends pre-existing Ethereum USDC as bridge output", () => {
    expect(
      confirmedBridgeSpend({
        startingBalance: 50_000_000n,
        currentBalance: 59_970_000n,
        requestedAmount: 10_000_000n,
        expectedAmount: 9_970_000n,
      })
    ).toBe(9_970_000n);
    expect(
      confirmedBridgeSpend({
        startingBalance: 50_000_000n,
        currentBalance: 50_000_000n,
        requestedAmount: 10_000_000n,
        expectedAmount: 9_970_000n,
      })
    ).toBe(0n);
  });

  it("rejects an asset mismatch and an expired firm quote", () => {
    expect(() =>
      buildOndoOrderCalls({
        side: "buy",
        assetAddress: "0x3333333333333333333333333333333333333333",
        inputAmount: 1n,
        quote: quote(),
        now: NOW,
      })
    ).toThrow(/does not match/u);
    expect(() =>
      buildOndoOrderCalls({
        side: "buy",
        assetAddress: ASSET,
        inputAmount: 1n,
        quote: quote(),
        now: Date.parse("2026-08-20T12:00:11.000Z"),
      })
    ).toThrow(/expired/u);
  });
});
