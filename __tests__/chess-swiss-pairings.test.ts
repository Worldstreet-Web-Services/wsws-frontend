import { describe, expect, it } from "vitest";
import {
  checkForbiddenPairings,
  checkPairings,
  needsManualPairings,
} from "@/lib/casino/swiss-pairings";

// A bad pairing block wastes a round for everyone in the tournament, so it is
// checked here rather than discovered upstream.

const PLAYERS = ["alice", "bob", "carol", "dave"];

describe("manual pairings", () => {
  it("reads two boards", () => {
    const check = checkPairings("alice bob\ncarol dave", PLAYERS);
    expect(check.error).toBeNull();
    expect(check.lines).toEqual([
      { white: "alice", black: "bob" },
      { white: "carol", black: "dave" },
    ]);
    expect(check.unassigned).toEqual([]);
  });

  it("reads a bye", () => {
    // "player 1" is how the service writes a one-point bye.
    const check = checkPairings("alice bob\ncarol 1", PLAYERS);
    expect(check.error).toBeNull();
    expect(check.lines[1]).toEqual({ white: "carol", black: null });
  });

  it("reports who is left out rather than silently benching them", () => {
    const check = checkPairings("alice bob", PLAYERS);
    expect(check.error).toBeNull();
    expect(check.unassigned).toEqual(["carol", "dave"]);
  });

  it("refuses a player paired twice", () => {
    // Would give one player two boards and leave another with none.
    expect(checkPairings("alice bob\nalice carol", PLAYERS).error).toMatch(/more than once/i);
    expect(checkPairings("alice bob\ncarol bob", PLAYERS).error).toMatch(/more than once/i);
  });

  it("refuses a self-pairing", () => {
    expect(checkPairings("alice alice", PLAYERS).error).toMatch(/themselves/i);
  });

  it("refuses a name that is not playing", () => {
    expect(checkPairings("alice mallory", PLAYERS).error).toMatch(/isn't in this tournament/i);
    expect(checkPairings("mallory bob", PLAYERS).error).toMatch(/isn't in this tournament/i);
  });

  it("refuses a line that is not two tokens", () => {
    expect(checkPairings("alice", PLAYERS).error).toMatch(/white black/i);
    expect(checkPairings("alice bob carol", PLAYERS).error).toMatch(/white black/i);
  });

  it("asks for something when given nothing", () => {
    expect(checkPairings("", PLAYERS).error).toMatch(/at least one/i);
    expect(checkPairings("   \n  \n", PLAYERS).error).toMatch(/at least one/i);
  });

  it("ignores blank lines and stray spacing", () => {
    const check = checkPairings("  alice   bob  \n\n  carol dave\n", PLAYERS);
    expect(check.error).toBeNull();
    expect(check.lines).toHaveLength(2);
  });
});

describe("forbidden pairings", () => {
  it("accepts an empty block, since it is optional", () => {
    expect(checkForbiddenPairings("")).toBeNull();
    expect(checkForbiddenPairings("  \n ")).toBeNull();
  });

  it("accepts pairs to keep apart", () => {
    expect(checkForbiddenPairings("alice bob\ncarol dave")).toBeNull();
  });

  it("lets a player appear in several pairs", () => {
    // Unlike a round's pairings: one person can be kept apart from many.
    expect(checkForbiddenPairings("alice bob\nalice carol")).toBeNull();
  });

  it("refuses a line that is not two names", () => {
    expect(checkForbiddenPairings("alice")).toMatch(/two names/i);
  });

  it("refuses a pair of the same person", () => {
    expect(checkForbiddenPairings("alice alice")).toMatch(/themselves/i);
  });

  it("only checks names against entrants when there are any", () => {
    // At creation time nobody has entered, so names cannot be validated yet.
    expect(checkForbiddenPairings("alice bob")).toBeNull();
    expect(checkForbiddenPairings("alice mallory", PLAYERS)).toMatch(/isn't in this tournament/i);
  });
});

describe("detecting the service's request for pairings", () => {
  it("recognises the refusal that means it cannot pair by itself", () => {
    expect(
      needsManualPairings(
        Object.assign(new Error("manualPairings is required, no pairing engine"), {
          code: "BAD_REQUEST",
        })
      )
    ).toBe(true);
  });

  it("does not mistake another bad request for it", () => {
    expect(
      needsManualPairings(Object.assign(new Error("unknown player"), { code: "BAD_REQUEST" }))
    ).toBe(false);
    expect(
      needsManualPairings(Object.assign(new Error("still ongoing"), { code: "CONFLICT" }))
    ).toBe(false);
    expect(needsManualPairings(null)).toBe(false);
  });
});
