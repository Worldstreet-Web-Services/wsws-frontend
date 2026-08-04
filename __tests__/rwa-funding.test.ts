import { describe, expect, it } from "vitest";
import {
  planAffordable,
  planSignature,
  planBaseFunding,
  planSolanaFunding,
  resizeBridgeSend,
} from "@/lib/rwa/funding";

const base = { spendUsdc: 20, solanaUsdc: 0, baseUsdc: 100 };

describe("planSolanaFunding", () => {
  it("needs nothing when Solana already holds the funds", () => {
    expect(planSolanaFunding({ ...base, solanaUsdc: 25 })).toBeNull();
  });

  it("needs nothing when the wallet holds USDC but no SOL", () => {
    // Solana is gasless for us: the sponsor pays the fee and prefunds rent,
    // so a wallet with zero SOL is fully able to buy.
    expect(planSolanaFunding({ ...base, solanaUsdc: 25 })).toBeNull();
  });

  it("sends more than the shortfall so the arrival covers it", () => {
    // A bridge takes a fixed fee plus a rate; sending exactly 8 would land
    // short and leave the buy unaffordable.
    const plan = planSolanaFunding({ ...base, solanaUsdc: 12 });
    expect(plan?.bridgeUsdc).toBeGreaterThan(8);
    expect(plan?.bridgeUsdc).toBeLessThanOrEqual(8.5);
    expect(plan?.requiredArrivalUsdc).toBe(8);
  });

  it("covers the fixed bridge fee that sank a real $3 hop", () => {
    // Measured live: $3.06 sent delivered $2.876, six percent down, because at
    // this size the relayer's flat fee dominates. A purely proportional 2%
    // allowance under-sent and stranded the buy.
    const plan = planSolanaFunding({ ...base, spendUsdc: 3 });
    expect(plan?.bridgeUsdc).toBeGreaterThanOrEqual(3.26);
  });

  it("raises a dust hop to the minimum instead of bridging pennies", () => {
    // 4%+ of a $0.50 hop is lost to fees, and the arrival would still miss.
    const plan = planSolanaFunding({ ...base, spendUsdc: 20, solanaUsdc: 19.7 });
    expect(plan?.bridgeUsdc).toBe(2);
  });

  it("rounds the bridged amount up to the cent", () => {
    const plan = planSolanaFunding({ ...base, spendUsdc: 100 });
    expect(plan?.bridgeUsdc).toBe(102.2);
  });

  it("asks only for the bridge when the wallet is empty", () => {
    // No gas leg: there is nothing to fuel on a sponsored chain.
    const plan = planSolanaFunding(base);
    expect(plan?.bridgeUsdc).toBeCloseTo(20 * 1.02 + 0.2, 6);
  });
});

describe("resizeBridgeSend", () => {
  it("does not resize when the trial quote already delivers enough", () => {
    expect(resizeBridgeSend(3.26, 3.05, 3, 10)).toBeNull();
  });

  it("re-sizes from what the bridge really delivers", () => {
    // The failing run: 3.06 sent, 2.876 delivered, 3 required.
    const resized = resizeBridgeSend(3.06, 2.876, 3, 10);
    expect(resized).not.toBeNull();
    expect(resized!).toBeGreaterThanOrEqual(3.19);
    // Sized off a fixed-fee model plus a small margin, not a runaway multiple.
    expect(resized!).toBeLessThan(3.5);
  });

  it("never asks for more than the wallet can pay", () => {
    expect(resizeBridgeSend(3.06, 2.876, 3, 3.1)).toBeNull();
  });

  it("ignores a degenerate trial rather than dividing by it", () => {
    expect(resizeBridgeSend(3, 0, 3, 10)).toBeNull();
    expect(resizeBridgeSend(0, 0, 3, 10)).toBeNull();
  });
});

describe("planAffordable", () => {
  it("compares the plan against the Base balance", () => {
    const plan = planSolanaFunding(base);
    expect(plan && planAffordable(plan, 21)).toBe(true);
    expect(plan && planAffordable(plan, 20)).toBe(false);
  });

  it("clears a small buy the old gas top-up priced out", () => {
    // The reported case: a $0.10 buy against $2.95 on Base. The gas leg and
    // its $1 top-up used to push the plan to $3.00 and strand the buy.
    const plan = planSolanaFunding({ spendUsdc: 0.1, solanaUsdc: 0, baseUsdc: 2.9536 });
    expect(plan?.bridgeUsdc).toBe(2);
    expect(plan && planAffordable(plan, 2.9536)).toBe(true);
  });
});

describe("planSignature", () => {
  it("is stable for the same plan and differs when the plan changes", () => {
    const a = planSolanaFunding(base);
    const b = planSolanaFunding(base);
    const c = planSolanaFunding({ ...base, spendUsdc: 50 });
    expect(a && b && planSignature(a) === planSignature(b)).toBe(true);
    expect(a && c && planSignature(a) === planSignature(c)).toBe(false);
  });
});

describe("spending exactly the landed balance", () => {
  it("does not re-trigger a bridge on float residue", () => {
    // The escape hatch stages the whole Solana balance. 2.876564 - 2.876564
    // leaves ~1e-16 in binary floating point, which the old check read as a
    // real shortfall and rounded up into a $2 hop.
    const landed = 2.876564;
    expect(
      planSolanaFunding({
        spendUsdc: landed,
        solanaUsdc: landed,
        baseUsdc: 1.8,
      })
    ).toBeNull();
  });

  it("still plans for a shortfall worth acting on", () => {
    const plan = planSolanaFunding({
      spendUsdc: 3,
      solanaUsdc: 2.876564,
      baseUsdc: 10,
    });
    expect(plan?.bridgeUsdc).toBe(2);
  });
});

describe("a full-balance buy is never short of itself", () => {
  it("plans nothing when the spend equals the USDC balance", () => {
    // The panel must pass the spend in USDC, not dollars. The price feed quotes
    // USDC at 1.001, so a USD-valued 2.876564 balance read as $2.87944 and left
    // a phantom $0.0029 shortfall the funding card could never clear.
    const landed = 2.876564;
    expect(
      planSolanaFunding({
        spendUsdc: landed,
        solanaUsdc: landed,
        baseUsdc: 1.818339,
      })
    ).toBeNull();
  });

  it("would have stranded the buy had the spend been valued in dollars", () => {
    // Documents the defect: the same balance, valued at the feed's 1.001,
    // demands a $2 bridge the wallet cannot afford.
    const landed = 2.876564;
    const plan = planSolanaFunding({
      spendUsdc: landed * 1.001,
      solanaUsdc: landed,
      baseUsdc: 1.818339,
    });
    expect(plan?.bridgeUsdc).toBe(2);
    expect(plan && planAffordable(plan, 1.818339)).toBe(false);
  });
});

describe("planBaseFunding — USDC on Solana, buying on Base", () => {
  const solanaHeavy = { spendUsdc: 3, baseUsdc: 0, solanaUsdc: 10 };

  it("plans nothing when Base already covers the spend", () => {
    expect(planBaseFunding({ ...solanaHeavy, baseUsdc: 5 })).toBeNull();
  });

  it("plans nothing when there is no Solana USDC to bring across", () => {
    // Nothing to move: the deposit flow is the answer, not a bridge.
    expect(planBaseFunding({ ...solanaHeavy, solanaUsdc: 0 })).toBeNull();
  });

  it("sizes the hop to cover the shortfall", () => {
    const plan = planBaseFunding(solanaHeavy);
    expect(plan?.requiredArrivalUsdc).toBe(3);
    expect(plan?.bridgeUsdc).toBeGreaterThan(3);
  });

  it("never asks to send more Solana USDC than the wallet holds", () => {
    const plan = planBaseFunding({ ...solanaHeavy, solanaUsdc: 3.1 });
    expect(plan?.bridgeUsdc).toBe(3.1);
  });

  it("counts only the shortfall, not the whole spend", () => {
    const plan = planBaseFunding({ ...solanaHeavy, baseUsdc: 2 });
    expect(plan?.requiredArrivalUsdc).toBe(1);
  });

  it("plans the hop even when the wallet holds no SOL", () => {
    // The outbound Solana send is fee-sponsored, so a USDC-only wallet can
    // still move its funds.
    const plan = planBaseFunding(solanaHeavy);
    expect(plan?.bridgeUsdc).toBeGreaterThan(3);
  });

  it("ignores float residue on a full-balance spend", () => {
    const landed = 2.876564;
    expect(
      planBaseFunding({
        spendUsdc: landed,
        baseUsdc: landed,
        solanaUsdc: 5,
      })
    ).toBeNull();
  });
});

describe("cross-chain fallback is symmetric", () => {
  it("funds a Solana buy from Base USDC", () => {
    const plan = planSolanaFunding({ spendUsdc: 3, solanaUsdc: 0, baseUsdc: 10 });
    expect(plan?.bridgeUsdc).toBeGreaterThan(3);
    expect(plan && planAffordable(plan, 10)).toBe(true);
  });

  it("funds a Base buy from Solana USDC", () => {
    const plan = planBaseFunding({ spendUsdc: 3, baseUsdc: 0, solanaUsdc: 10 });
    expect(plan?.bridgeUsdc).toBeGreaterThan(3);
  });

  it("has nothing to offer when both chains are empty", () => {
    // Neither planner can help; the panel falls back to the deposit flow and a
    // buy button that says why it is disabled.
    expect(
      planSolanaFunding({ spendUsdc: 3, solanaUsdc: 0, baseUsdc: 0 })?.bridgeUsdc
    ).toBeGreaterThan(0);
    expect(
      planAffordable(planSolanaFunding({ spendUsdc: 3, solanaUsdc: 0, baseUsdc: 0 })!, 0)
    ).toBe(false);
    expect(planBaseFunding({ spendUsdc: 3, baseUsdc: 0, solanaUsdc: 0 })).toBeNull();
  });
});
