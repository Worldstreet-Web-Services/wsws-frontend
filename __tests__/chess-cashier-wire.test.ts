import { describe, expect, it } from "vitest";
import {
  toChessChallenge,
  toChessMatch,
  toWager,
  type ChessMatchWire,
} from "@/lib/casino/api/chess-wire";
import { isCashierOff } from "@/lib/casino/api/cashier";

// Most chess games are free. The dangerous mistakes here are showing a stake
// where there is none, and showing zero where the amount was unreadable.

function matchWire(over: Partial<ChessMatchWire> = {}): ChessMatchWire {
  return {
    id: "00ac5642-2163-48fc-98c0-d5d8eeafd48a",
    status: "active",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    turn: "white",
    ply: 0,
    timeControl: { initialSeconds: 600, incrementSeconds: 3 },
    clocks: { whiteMs: 600_000, blackMs: 600_000 },
    white: "0xaaaa",
    black: "0xbbbb",
    drawOfferBy: null,
    result: null,
    resultReason: null,
    createdAt: "2026-07-31T12:00:00Z",
    startedAt: null,
    finishedAt: null,
    ...over,
  };
}

describe("wager", () => {
  it("reads a real stake into exact micro-USDC", () => {
    const wager = toWager({ stakeUsdc: "10", feeBps: 500, status: "active" });
    expect(wager?.stakeMicro).toBe(10_000_000n);
    expect(wager?.feeBps).toBe(500);
    expect(wager?.state).toBe("active");
  });

  it("keeps a free game free", () => {
    // The live service sends `wager: null` on every unstaked game, which is
    // most of them. Turning that into a zero stake would put a money panel on
    // every casual game.
    expect(toWager(null)).toBeNull();
    expect(toWager(undefined)).toBeNull();
  });

  it("treats a zero stake as no stake", () => {
    expect(toWager({ stakeUsdc: "0" })).toBeNull();
  });

  it("treats an unreadable stake as no stake rather than as zero", () => {
    // Showing "0 USDC at stake" on a game that actually has money on it would
    // be worse than showing nothing.
    expect(toWager({ stakeUsdc: "not-a-number" })).toBeNull();
    expect(toWager({})).toBeNull();
  });

  it("never invents a fee the service did not report", () => {
    expect(toWager({ stakeUsdc: "10" })?.feeBps).toBe(0);
    expect(toWager({ stakeUsdc: "10", feeBps: -5 })?.feeBps).toBe(0);
  });

  it("falls back rather than dropping a state it doesn't recognise", () => {
    expect(toWager({ stakeUsdc: "10", status: "something-new" })?.state).toBe("pending");
  });

  it("reads the lock flags as false unless the service says otherwise", () => {
    const wager = toWager({ stakeUsdc: "10" });
    expect(wager?.creatorLocked).toBe(false);
    expect(wager?.opponentLocked).toBe(false);
    expect(toWager({ stakeUsdc: "10", creatorLocked: true })?.creatorLocked).toBe(true);
  });
});

describe("match and challenge", () => {
  it("carries the wager onto the match", () => {
    const match = toChessMatch(matchWire({ wager: { stakeUsdc: "5", feeBps: 500 } }));
    expect(match.wager?.stakeMicro).toBe(5_000_000n);
  });

  it("leaves a free match with no wager", () => {
    expect(toChessMatch(matchWire({ wager: null })).wager).toBeNull();
    // The field is optional on the wire, and an older service omits it.
    expect(toChessMatch(matchWire()).wager).toBeNull();
  });

  it("carries the wager onto an open challenge, so the lobby can price it", () => {
    const challenge = toChessChallenge(
      matchWire({ status: "waiting", black: null, wager: { stakeUsdc: "2.5" } })
    );
    expect(challenge.wager?.stakeMicro).toBe(2_500_000n);
  });

  it("reports the last move in coordinate form for the board highlight", () => {
    const match = toChessMatch(matchWire(), {
      moves: [
        {
          ply: 1,
          uci: "e2e4",
          san: "e4",
          fenAfter: "",
          byPlayer: "0xaaaa",
          clockMsRemaining: null,
          createdAt: "2026-07-31T12:00:05Z",
        },
      ],
    });
    expect(match.lastMoveUci).toBe("e2e4");
  });

  it("has no last move before anyone has moved", () => {
    expect(toChessMatch(matchWire()).lastMoveUci).toBeNull();
  });
});

describe("cashier availability", () => {
  it("reads the service's own refusal as switched off", () => {
    // What the deployed service answers today. It is a deployment without a
    // cashier, not a fault, and must not surface as an error.
    expect(
      isCashierOff(Object.assign(new Error("cashier is not configured"), { code: "CONFLICT" }))
    ).toBe(true);
  });

  it("reads an unreachable service as switched off", () => {
    expect(isCashierOff(Object.assign(new Error("down"), { code: "SERVICE_UNAVAILABLE" }))).toBe(
      true
    );
    expect(isCashierOff(Object.assign(new Error("nope"), { code: "NOT_CONFIGURED" }))).toBe(true);
  });

  it("does not swallow a real failure", () => {
    // A genuine outage has to reach the user as an error, not hide the whole
    // staking surface as though it were never switched on.
    expect(isCashierOff(Object.assign(new Error("boom"), { code: "UPSTREAM_ERROR" }))).toBe(false);
    expect(isCashierOff(Object.assign(new Error("nope"), { code: "CONFLICT" }))).toBe(false);
    expect(isCashierOff(null)).toBe(false);
  });
});
