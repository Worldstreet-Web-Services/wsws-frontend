import { describe, expect, it } from "vitest";
import type { ChainSweep, SweepAsset } from "@/features/migrate/lib/plan";
import {
  itemsFromPlan,
  markItems,
  planFromFailures,
  sweepCounts,
} from "@/features/migrate/lib/progress";

function asset(id: string, network: string, tokenAddress: string | null): SweepAsset {
  return { id, network, tokenAddress, symbol: "TKN", decimals: 6, amount: 1n, valueUsd: 1 };
}

const PLAN: ChainSweep[] = [
  {
    network: "base-mainnet",
    kind: "evm-batch",
    assets: [
      asset("base-mainnet:0xa", "base-mainnet", "0xa"),
      asset("base-mainnet:native", "base-mainnet", null),
    ],
  },
  {
    network: "solana-mainnet",
    kind: "solana-sequential",
    assets: [asset("solana-mainnet:native", "solana-mainnet", null)],
  },
];

describe("itemsFromPlan", () => {
  it("flattens the plan into pending items in sweep order", () => {
    const items = itemsFromPlan(PLAN);

    expect(items.map((i) => i.id)).toEqual([
      "base-mainnet:0xa",
      "base-mainnet:native",
      "solana-mainnet:native",
    ]);
    expect(items.every((i) => i.status === "pending")).toBe(true);
  });
});

describe("markItems", () => {
  it("patches only the named items", () => {
    const items = itemsFromPlan(PLAN);
    const marked = markItems(items, ["base-mainnet:0xa"], { status: "done", txHash: "0xhash" });

    expect(marked[0]).toMatchObject({ status: "done", txHash: "0xhash" });
    expect(marked[1].status).toBe("pending");
    expect(marked[2].status).toBe("pending");
  });
});

describe("planFromFailures", () => {
  it("rebuilds a plan holding only the failed items, keeping chain kind", () => {
    const items = markItems(itemsFromPlan(PLAN), ["base-mainnet:native", "solana-mainnet:native"], {
      status: "failed",
      error: "boom",
    });

    const retry = planFromFailures(PLAN, items);

    expect(retry).toEqual([
      { network: "base-mainnet", kind: "evm-batch", assets: [PLAN[0].assets[1]] },
      { network: "solana-mainnet", kind: "solana-sequential", assets: [PLAN[1].assets[0]] },
    ]);
  });

  it("drops chains with nothing failed", () => {
    const items = markItems(itemsFromPlan(PLAN), ["solana-mainnet:native"], { status: "failed" });

    const retry = planFromFailures(PLAN, items);

    expect(retry.map((c) => c.network)).toEqual(["solana-mainnet"]);
  });

  it("is empty when everything landed", () => {
    const items = markItems(
      itemsFromPlan(PLAN),
      ["base-mainnet:0xa", "base-mainnet:native", "solana-mainnet:native"],
      { status: "done" }
    );

    expect(planFromFailures(PLAN, items)).toEqual([]);
  });
});

describe("sweepCounts", () => {
  it("tallies done and failed against the total", () => {
    let items = itemsFromPlan(PLAN);
    items = markItems(items, ["base-mainnet:0xa"], { status: "done" });
    items = markItems(items, ["solana-mainnet:native"], { status: "failed" });

    expect(sweepCounts(items)).toEqual({ total: 3, done: 1, failed: 1 });
  });
});
