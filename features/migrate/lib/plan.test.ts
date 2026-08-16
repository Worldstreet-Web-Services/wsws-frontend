import { describe, expect, it } from "vitest";
import { buildSweepPlan, sweepAssetId } from "@/features/migrate/lib/plan";
import type { TokenBalance } from "@/lib/server/alchemy";

function token(partial: Partial<TokenBalance>): TokenBalance {
  return {
    symbol: "TKN",
    name: "Token",
    network: "base-mainnet",
    address: "0x1111111111111111111111111111111111111111",
    decimals: 6,
    kind: "token",
    balance: 1,
    rawBalance: "1000000",
    priceUsd: 1,
    valueUsd: 1,
    logo: null,
    ...partial,
  } as TokenBalance;
}

describe("buildSweepPlan", () => {
  it("drops zero balances and groups the rest by network", () => {
    const plan = buildSweepPlan([
      token({ symbol: "USDC", rawBalance: "5000000" }),
      token({ symbol: "DUST", rawBalance: "0" }),
      token({
        symbol: "SOL",
        network: "solana-mainnet",
        address: null,
        decimals: 9,
        rawBalance: "2000000000",
      }),
    ]);

    expect(plan.map((c) => c.network)).toEqual(["base-mainnet", "solana-mainnet"]);
    expect(plan[0].assets.map((a) => a.symbol)).toEqual(["USDC"]);
    expect(plan[1].assets.map((a) => a.symbol)).toEqual(["SOL"]);
  });

  it("keeps amounts exact through bigint parsing", () => {
    const raw = "123456789012345678901234567890";
    const plan = buildSweepPlan([token({ rawBalance: raw, decimals: 18 })]);

    expect(plan[0].assets[0].amount).toBe(BigInt(raw));
  });

  it("orders each chain's tokens before its native asset", () => {
    const plan = buildSweepPlan([
      token({ symbol: "ETH", address: null, decimals: 18, rawBalance: "1000000000000000000" }),
      token({ symbol: "USDC", rawBalance: "5000000" }),
      token({
        symbol: "WSWS",
        address: "0x2222222222222222222222222222222222222222",
        rawBalance: "7",
      }),
    ]);

    expect(plan[0].assets.map((a) => a.symbol)).toEqual(["USDC", "WSWS", "ETH"]);
  });

  it("marks EVM chains as batched and Solana as sequential", () => {
    const plan = buildSweepPlan([
      token({}),
      token({ network: "solana-mainnet", address: null, decimals: 9, rawBalance: "1" }),
    ]);

    expect(plan.find((c) => c.network === "base-mainnet")?.kind).toBe("evm-batch");
    expect(plan.find((c) => c.network === "solana-mainnet")?.kind).toBe("solana-sequential");
  });

  it("orders chains deterministically with Solana last", () => {
    const plan = buildSweepPlan([
      token({ network: "solana-mainnet", address: null, decimals: 9, rawBalance: "1" }),
      token({ network: "polygon-mainnet" }),
      token({ network: "base-mainnet" }),
    ]);

    expect(plan.map((c) => c.network)).toEqual([
      "base-mainnet",
      "polygon-mainnet",
      "solana-mainnet",
    ]);
  });

  it("refuses to plan an unsupported network instead of guessing", () => {
    expect(() => buildSweepPlan([token({ network: "sepolia" })])).toThrow(/unsupported network/i);
  });

  it("returns an empty plan for an empty portfolio", () => {
    expect(buildSweepPlan([])).toEqual([]);
  });
});

describe("sweepAssetId", () => {
  it("keys native assets apart from tokens on the same chain", () => {
    expect(sweepAssetId("base-mainnet", null)).toBe("base-mainnet:native");
    expect(sweepAssetId("base-mainnet", "0xabc")).toBe("base-mainnet:0xabc");
  });
});
