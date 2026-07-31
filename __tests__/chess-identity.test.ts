import { describe, expect, it } from "vitest";
import {
  claimedWallet,
  isCashierPath,
  namesAnActor,
  parseBody,
  requiresProvenWallet,
  stakesMoney,
  withIdentity,
} from "@/lib/casino/chess-identity";

// The chess service trusts whatever identity it is handed, so these rules are
// the only thing standing between a browser and somebody else's balance. Each
// case here is a way that could go wrong in production.

const SESSION = "0x1111111111111111111111111111111111111111";
const ATTACKER = "0x2222222222222222222222222222222222222222";
// What swissNameFor shortens SESSION to: the service caps a name at 30
// characters and an address is 42.
const SESSION_TOKEN = "0x11111111";

function bodyOf(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

describe("which requests need a proven wallet", () => {
  it("treats every cashier path as money", () => {
    expect(isCashierPath("cashier/config")).toBe(true);
    expect(isCashierPath("cashier/withdrawals")).toBe(true);
    expect(isCashierPath("cashier/deposits/confirm")).toBe(true);
    expect(isCashierPath("cashier/players/0xabc/balance")).toBe(true);
  });

  it("does not mistake a game path for a cashier path", () => {
    expect(isCashierPath("matches")).toBe(false);
    expect(isCashierPath("swiss/123/join")).toBe(false);
    // A match id could contain the word, and must not be waved through as one.
    expect(isCashierPath("matches/cashier")).toBe(false);
  });

  it("reads a stake in either casing the service accepts", () => {
    expect(stakesMoney({ stake_usdc: "10" })).toBe(true);
    expect(stakesMoney({ stakeUsdc: "10" })).toBe(true);
    expect(stakesMoney({ entryFeeUsdc: "5" })).toBe(true);
    expect(stakesMoney({ entry_fee_usdc: 5 })).toBe(true);
  });

  it("does not treat a free game as money", () => {
    // A zero or absent stake is the ordinary case and must not be pushed down
    // the strict path, or playing would break whenever the identity token is
    // cold.
    expect(stakesMoney({ creator: SESSION })).toBe(false);
    expect(stakesMoney({ stake_usdc: "0" })).toBe(false);
    expect(stakesMoney({ stake_usdc: "" })).toBe(false);
    expect(stakesMoney({ stake_usdc: "abc" })).toBe(false);
    expect(stakesMoney(null)).toBe(false);
  });

  it("requires proof for a staked create and not for a free one", () => {
    expect(requiresProvenWallet("matches", { creator: SESSION, stake_usdc: "10" })).toBe(true);
    expect(requiresProvenWallet("matches", { creator: SESSION })).toBe(false);
    expect(requiresProvenWallet("cashier/withdrawals", { player: SESSION })).toBe(true);
  });
});

describe("stamping identity", () => {
  it("replaces a forged player with the session wallet", () => {
    // The attack this whole module exists to stop.
    const out = withIdentity(JSON.stringify({ player: ATTACKER, amountUsdc: "9.5" }), SESSION);
    expect(bodyOf(out).player).toBe(SESSION);
  });

  it("replaces a forged creator", () => {
    const out = withIdentity(JSON.stringify({ creator: ATTACKER }), SESSION);
    expect(bodyOf(out).creator).toBe(SESSION);
  });

  it("names the player when the body did not", () => {
    const out = withIdentity(JSON.stringify({ uci: "e2e4" }), SESSION);
    expect(bodyOf(out).player).toBe(SESSION);
  });

  it("leaves the body alone when there is no proven wallet", () => {
    // Free play still works when the identity token is cold, which is the whole
    // reason game paths keep the softer rule.
    const raw = JSON.stringify({ player: ATTACKER });
    expect(withIdentity(raw, null)).toBe(raw);
  });

  it("does not inject a player address into a swiss body", () => {
    // Swiss names people by token. An address here is not a field the service
    // reads, and adding one only muddies the request.
    const out = withIdentity(JSON.stringify({ name: "Alpha" }), SESSION);
    expect("player" in bodyOf(out)).toBe(false);
  });

  it("leaves a free tournament's chosen name alone", () => {
    // Rewriting it would rename entrants out of tournaments they already joined.
    const out = withIdentity(JSON.stringify({ name: "Alpha" }), SESSION);
    expect(bodyOf(out).name).toBe("Alpha");
  });

  it("derives the swiss name from the wallet when money is involved", () => {
    const out = withIdentity(JSON.stringify({ name: "Alpha", entryFeeUsdc: "5" }), SESSION, {
      rewriteSwissNames: true,
    });
    // The shortened token, not the raw address.
    expect(bodyOf(out).name).toBe(SESSION_TOKEN);
  });

  it("replaces a forged organizer on a paid tournament", () => {
    const out = withIdentity(JSON.stringify({ organizer: "someone-else" }), SESSION, {
      rewriteSwissNames: true,
    });
    expect(bodyOf(out).organizer).toBe(SESSION_TOKEN);
  });

  it("sends a swiss refund to the session wallet, not one the browser named", () => {
    const out = withIdentity(JSON.stringify({ name: "Alpha", walletAddress: ATTACKER }), SESSION, {
      rewriteSwissNames: true,
    });
    expect(bodyOf(out).walletAddress).toBe(SESSION);
  });

  it("passes a body it cannot parse through untouched", () => {
    expect(withIdentity("not json", SESSION)).toBe("not json");
    expect(withIdentity("[1,2]", SESSION)).toBe("[1,2]");
  });

  it("keeps the rest of the body intact", () => {
    const out = bodyOf(
      withIdentity(
        JSON.stringify({ player: ATTACKER, amountUsdc: "9.5", toAddress: "0xdead" }),
        SESSION
      )
    );
    expect(out.amountUsdc).toBe("9.5");
    expect(out.toAddress).toBe("0xdead");
  });
});

describe("naming who is acting", () => {
  it("accepts a match body that names a wallet", () => {
    expect(namesAnActor({ player: ATTACKER })).toBe(true);
    expect(namesAnActor({ creator: ATTACKER })).toBe(true);
  });

  it("accepts a swiss body, which names a token and never an address", () => {
    // Checking only for player/creator rejected every swiss write whenever the
    // identity token was cold, telling the user they had no wallet when the
    // real cause was an unwarmed token.
    expect(namesAnActor({ organizer: "alice", name: "Friday swiss", nbRounds: 5 })).toBe(true);
    expect(namesAnActor({ name: "alice" })).toBe(true);
  });

  it("rejects a body that names nobody", () => {
    expect(namesAnActor({ nbRounds: 5 })).toBe(false);
    expect(namesAnActor({ organizer: "" })).toBe(false);
    expect(namesAnActor(null)).toBe(false);
  });
});

describe("reading the claimed wallet", () => {
  it("finds either name the contract uses", () => {
    expect(claimedWallet({ player: ATTACKER })).toBe(ATTACKER);
    expect(claimedWallet({ creator: ATTACKER })).toBe(ATTACKER);
  });

  it("treats a missing or empty claim as none", () => {
    expect(claimedWallet({})).toBeNull();
    expect(claimedWallet({ player: "" })).toBeNull();
    expect(claimedWallet(null)).toBeNull();
  });
});

describe("parsing a body", () => {
  it("rejects anything that is not a JSON object", () => {
    expect(parseBody("not json")).toBeNull();
    expect(parseBody("[1,2]")).toBeNull();
    expect(parseBody("null")).toBeNull();
  });

  it("treats an empty body as an empty object", () => {
    expect(parseBody("")).toEqual({});
  });
});
