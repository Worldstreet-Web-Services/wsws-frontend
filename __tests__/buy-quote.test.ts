import { describe, expect, it } from "vitest";
import {
  buildBuyQuoteBody,
  buyStatusStrings,
  normalizeBuyQuote,
  type BuyStatus,
} from "@/lib/buy-quote";
import { BUY_ORIGIN, type BuyRoute } from "@/lib/buy";

const ETH_ARBITRUM: BuyRoute = {
  destinationChainId: 42161,
  chainName: "Arbitrum",
  asset: "0xeeee",
  symbol: "ETH",
  decimals: 18,
};

describe("buildBuyQuoteBody", () => {
  it("always sends origin USDC on Base and carries the destination route", () => {
    const body = buildBuyQuoteBody({
      route: ETH_ARBITRUM,
      amount: 25_000_000n, // 25 USDC at 6 decimals
      recipient: "0xrecipient",
      refundTo: "0xbase",
      slippageBps: 100,
    });
    expect(body).toEqual({
      originChainId: BUY_ORIGIN.chainId,
      originAsset: BUY_ORIGIN.asset,
      destinationChainId: 42161,
      destinationAsset: "0xeeee",
      amount: "25000000",
      recipient: "0xrecipient",
      refundTo: "0xbase",
      slippageBps: 100,
      dry: false,
    });
  });

  it("marks a preview quote as dry", () => {
    const body = buildBuyQuoteBody({
      route: ETH_ARBITRUM,
      amount: 1n,
      recipient: "0xr",
      refundTo: "0xb",
      slippageBps: 50,
      dry: true,
    });
    expect(body.dry).toBe(true);
  });
});

describe("normalizeBuyQuote", () => {
  it("reads estimatedOutput as integer base units", () => {
    const quote = normalizeBuyQuote(
      {
        estimatedOutput: "6200000000000000",
        depositAddress: "0xdeposit",
        requestId: "req_1",
        expiresAt: "2026-07-25T00:00:00Z",
      },
      18
    );
    expect(quote.estimatedOutput).toBe(6_200_000_000_000_000n);
    expect(quote.depositAddress).toBe("0xdeposit");
    expect(quote.requestId).toBe("req_1");
  });

  it("falls back to amountOut when estimatedOutput is absent", () => {
    const quote = normalizeBuyQuote({ amountOut: "1000000" }, 6);
    expect(quote.estimatedOutput).toBe(1_000_000n);
    expect(quote.depositAddress).toBeNull();
    expect(quote.requestId).toBeNull();
  });

  it("defensively parses a human-decimal output without precision loss", () => {
    // 0.0062 ETH at 18 decimals -> 6_200_000_000_000_000 base units.
    expect(normalizeBuyQuote({ estimatedOutput: "0.0062" }, 18).estimatedOutput).toBe(
      6_200_000_000_000_000n
    );
    // 1.5 USDC at 6 decimals -> 1_500_000 base units.
    expect(normalizeBuyQuote({ amountOut: "1.5" }, 6).estimatedOutput).toBe(1_500_000n);
  });

  it("throws when no output amount is present", () => {
    expect(() => normalizeBuyQuote({ depositAddress: "0x" }, 18)).toThrow();
  });
});

describe("buyStatusStrings", () => {
  const base = (progress: BuyStatus["progress"], status = ""): BuyStatus => ({
    status,
    progress,
    destinationTxHash: null,
  });

  it("maps settled progress to the settled stage", () => {
    const s = buyStatusStrings(base({ deposited: true, bridged: true, settled: true }));
    expect(s.executionStatus).toBe("settled");
  });

  it("maps bridged (not settled) to processing", () => {
    const s = buyStatusStrings(base({ deposited: true, bridged: true, settled: false }));
    expect(s.executionStatus).toBe("processing");
  });

  it("maps deposited only to detected", () => {
    const s = buyStatusStrings(base({ deposited: true, bridged: false, settled: false }));
    expect(s.executionStatus).toBe("detected");
  });

  it("maps no progress to an empty stage and preserves the raw status", () => {
    const s = buyStatusStrings(
      base({ deposited: false, bridged: false, settled: false }, "waiting")
    );
    expect(s.executionStatus).toBe("");
    expect(s.status).toBe("waiting");
  });
});
