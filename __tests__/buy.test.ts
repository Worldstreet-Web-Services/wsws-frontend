import { describe, expect, it } from "vitest";
import {
  BUY_ORIGIN,
  DEFAULT_BUY_CHAIN_ID,
  buyableSymbols,
  defaultRouteForSymbol,
  isBuyable,
  routesForSymbol,
  sortRoutes,
  type BuyRoute,
} from "@/lib/buy";

const BASE = DEFAULT_BUY_CHAIN_ID; // 8453
const ARBITRUM = 42161;
const POLYGON = 137;
const SOLANA = 792703809;

function route(overrides: Partial<BuyRoute>): BuyRoute {
  return {
    destinationChainId: BASE,
    chainName: "Base",
    asset: "0xtoken",
    symbol: "ETH",
    decimals: 18,
    ...overrides,
  };
}

// ETH on three chains, USDT on two, cbBTC on Base only, WIF on Solana only.
const DESTINATIONS: BuyRoute[] = [
  route({ symbol: "ETH", destinationChainId: ARBITRUM, chainName: "Arbitrum" }),
  route({ symbol: "ETH", destinationChainId: BASE, chainName: "Base" }),
  route({ symbol: "ETH", destinationChainId: POLYGON, chainName: "Polygon" }),
  route({ symbol: "USDT", destinationChainId: POLYGON, chainName: "Polygon", decimals: 6 }),
  route({ symbol: "USDT", destinationChainId: ARBITRUM, chainName: "Arbitrum", decimals: 6 }),
  route({ symbol: "cbBTC", destinationChainId: BASE, chainName: "Base", decimals: 8 }),
  route({ symbol: "WIF", destinationChainId: SOLANA, chainName: "Solana", decimals: 6 }),
];

describe("BUY_ORIGIN", () => {
  it("is USDC on Base with 6 decimals", () => {
    expect(BUY_ORIGIN.chainId).toBe(8453);
    expect(BUY_ORIGIN.decimals).toBe(6);
    expect(BUY_ORIGIN.asset.toLowerCase()).toBe("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
  });
});

describe("routesForSymbol", () => {
  it("returns every chain a symbol can be delivered to, Base first", () => {
    const routes = routesForSymbol(DESTINATIONS, "ETH");
    expect(routes.map((r) => r.chainName)).toEqual(["Base", "Arbitrum", "Polygon"]);
  });

  it("orders non-Base chains alphabetically when Base is absent", () => {
    const routes = routesForSymbol(DESTINATIONS, "USDT");
    expect(routes.map((r) => r.chainName)).toEqual(["Arbitrum", "Polygon"]);
  });

  it("matches the symbol case-insensitively and ignores surrounding space", () => {
    expect(routesForSymbol(DESTINATIONS, " eth ")).toHaveLength(3);
  });

  it("returns a single route for a symbol tied to one chain", () => {
    const routes = routesForSymbol(DESTINATIONS, "WIF");
    expect(routes).toHaveLength(1);
    expect(routes[0].destinationChainId).toBe(SOLANA);
  });

  it("returns nothing for an unbuyable symbol", () => {
    expect(routesForSymbol(DESTINATIONS, "DOGE")).toEqual([]);
  });
});

describe("defaultRouteForSymbol", () => {
  it("picks Base when the symbol is on several chains", () => {
    expect(defaultRouteForSymbol(DESTINATIONS, "ETH")?.destinationChainId).toBe(BASE);
  });

  it("picks the only chain for a single-chain symbol", () => {
    expect(defaultRouteForSymbol(DESTINATIONS, "cbBTC")?.destinationChainId).toBe(BASE);
    expect(defaultRouteForSymbol(DESTINATIONS, "WIF")?.destinationChainId).toBe(SOLANA);
  });

  it("is null for an unbuyable symbol", () => {
    expect(defaultRouteForSymbol(DESTINATIONS, "DOGE")).toBeNull();
  });
});

describe("buyableSymbols / isBuyable", () => {
  it("collects the uppercased buyable symbol set", () => {
    expect(buyableSymbols(DESTINATIONS)).toEqual(new Set(["ETH", "USDT", "CBBTC", "WIF"]));
  });

  it("reports buyability case-insensitively", () => {
    expect(isBuyable(DESTINATIONS, "eth")).toBe(true);
    expect(isBuyable(DESTINATIONS, "DOGE")).toBe(false);
  });
});

describe("sortRoutes", () => {
  it("does not mutate its input", () => {
    const input = [
      route({ destinationChainId: POLYGON, chainName: "Polygon" }),
      route({ destinationChainId: BASE, chainName: "Base" }),
    ];
    const before = input.map((r) => r.chainName);
    sortRoutes(input);
    expect(input.map((r) => r.chainName)).toEqual(before);
  });
});
