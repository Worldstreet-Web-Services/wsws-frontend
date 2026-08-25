import { describe, expect, it } from "vitest";
import { classifyCashier, classifyVault } from "@/features/casino/lib/migration-adapter";
import type { CashierBalance } from "@/features/casino/lib/api/cashier";
import type { LotteryTicket } from "@/features/casino/lib/api/lottery";

function ticket(overrides: Partial<LotteryTicket>): LotteryTicket {
  return {
    id: "t1",
    drawId: "d1",
    player: "0xOld",
    receiptHash: "0xabc",
    priceUsdc: "2",
    whiteNumbers: [1, 2, 3, 4, 5],
    powerNumber: 6,
    status: "active",
    payoutUsdc: "0",
    acceptedAt: "2026-01-01T00:00:00Z",
    settledAt: null,
    ...overrides,
  };
}

describe("classifyCashier", () => {
  it("withdraws the available balance and hands every lock to the backend", () => {
    const balance: CashierBalance = {
      player: "0xOld",
      availableUsdc: "12.5",
      lockedUsdc: "7",
      lockedMatchUsdc: "5",
      lockedSwissUsdc: "0",
      lockedBetUsdc: "0",
      pendingWithdrawalUsdc: "2",
      lockedOtherUsdc: "0",
      totalUsdc: "19.5",
    };
    const holdings = classifyCashier(balance, []);

    expect(holdings.map((h) => [h.id, h.amount, h.settleability])).toEqual([
      ["cashier:available:balance", 12_500_000n, { state: "now" }],
      [
        "cashier:locked:lockedMatchUsdc",
        5_000_000n,
        { state: "needsBackend", reason: "lockedBucket" },
      ],
      [
        "cashier:locked:pendingWithdrawalUsdc",
        2_000_000n,
        { state: "needsBackend", reason: "pendingWithdrawal" },
      ],
    ]);
  });

  it("lists active and won tickets, ignores lost and refunded ones", () => {
    const holdings = classifyCashier(null, [
      ticket({ id: "a", status: "active" }),
      ticket({ id: "w", status: "won", payoutUsdc: "50" }),
      ticket({ id: "l", status: "lost" }),
      ticket({ id: "r", status: "refunded" }),
    ]);
    expect(holdings.map((h) => [h.id, h.amount])).toEqual([
      ["cashier:ticket:a", 2_000_000n],
      ["cashier:ticket:w", 50_000_000n],
    ]);
    expect(holdings.every((h) => h.settleability.state === "needsBackend")).toBe(true);
  });

  it("is empty with a zero balance and no tickets", () => {
    const balance: CashierBalance = {
      player: "0xOld",
      availableUsdc: "0",
      lockedUsdc: "0",
      totalUsdc: "0",
    };
    expect(classifyCashier(balance, [])).toEqual([]);
  });
});

describe("classifyVault", () => {
  const NOW = 1_700_000_000;
  const me = "0xAbCdEf0000000000000000000000000000000001";
  const game = (overrides: Partial<Parameters<typeof classifyVault>[0]["games"][number]>) => ({
    gameId: 7,
    starter: "0x0000000000000000000000000000000000000002",
    king: me.toLowerCase(),
    potWei: 2n * 10n ** 18n,
    endTime: NOW - 10,
    settled: false,
    ...overrides,
  });

  it("settles an expired game the wallet won or started, and claims what is pending", () => {
    const holdings = classifyVault({
      wallet: me,
      games: [game({}), game({ gameId: 8, king: "0x03", starter: me })],
      pendingWei: 10n ** 18n,
      nowSeconds: NOW,
      ethPriceUsd: 2000,
    });
    expect(holdings.map((h) => [h.id, h.valueUsd])).toEqual([
      ["vault:settle:7", 4000],
      ["vault:settle:8", 4000],
      ["vault:claim:pending", 2000],
    ]);
  });

  it("skips running, settled, and other people's games", () => {
    const holdings = classifyVault({
      wallet: me,
      games: [
        game({ endTime: NOW + 60 }),
        game({ gameId: 9, settled: true }),
        game({ gameId: 10, king: "0x03" }),
      ],
      pendingWei: 0n,
      nowSeconds: NOW,
      ethPriceUsd: 2000,
    });
    expect(holdings).toEqual([]);
  });
});
