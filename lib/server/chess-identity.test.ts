import { describe, it, expect } from "vitest";
import {
  chessReadNeedsSession,
  withChessReadIdentity,
  withChessIdentity,
} from "@/lib/server/chess-identity";

describe("chess identity helper", () => {
  it("marks per-caller chess reads as session-bound", () => {
    expect(chessReadNeedsSession("cashier/players/0xabc/balance")).toBe(true);
    expect(chessReadNeedsSession("cashier/config")).toBe(false);
    expect(chessReadNeedsSession("betting/markets/match-1/bets")).toBe(true);
    expect(chessReadNeedsSession("betting/swiss/swiss-1/bets")).toBe(true);
    expect(chessReadNeedsSession("players/0xabc/product-access")).toBe(true);
    expect(chessReadNeedsSession("matches/123/note")).toBe(true);
    expect(chessReadNeedsSession("lottery/tickets/ticket-1")).toBe(true);
    expect(chessReadNeedsSession("lottery/players/0xabc/tickets")).toBe(true);
    expect(chessReadNeedsSession("lottery/players/0xabc/eligibility")).toBe(true);
    expect(chessReadNeedsSession("matches/123/chat", new URLSearchParams("room=player"))).toBe(
      true
    );
    expect(chessReadNeedsSession("matches/123/chat", new URLSearchParams("room=spectator"))).toBe(
      false
    );
    expect(chessReadNeedsSession("matches/123")).toBe(false);
  });

  it("rewrites the wallet-bearing body fields to the verified wallet", () => {
    const oldWallet = "0x1111111111111111111111111111111111111111";
    expect(
      withChessIdentity(
        "matches/123/chat",
        JSON.stringify({
          author: oldWallet,
          creator: oldWallet,
          player: oldWallet,
          bettor: oldWallet,
          walletAddress: oldWallet,
          amountUsdc: "5",
        }),
        "0xabc"
      )
    ).toBe(
      JSON.stringify({
        author: "0xabc",
        creator: "0xabc",
        player: "0xabc",
        bettor: "0xabc",
        walletAddress: "0xabc",
        amountUsdc: "5",
      })
    );
  });

  it("binds lottery purchases and ticket reads to the verified wallet", () => {
    expect(
      withChessIdentity(
        "lottery/draws/draw-1/tickets",
        JSON.stringify({
          player: "0xspoofed",
          whiteNumbers: [1, 2, 3, 4, 5],
          powerNumber: 6,
          idempotencyKey: "request-1",
        }),
        "0xabc"
      )
    ).toBe(
      JSON.stringify({
        player: "0xabc",
        whiteNumbers: [1, 2, 3, 4, 5],
        powerNumber: 6,
        idempotencyKey: "request-1",
      })
    );
    expect(
      withChessReadIdentity(
        "lottery/tickets/ticket-1",
        new URLSearchParams("player=0xspoofed"),
        "0xabc"
      ).toString()
    ).toBe("player=0xabc");
  });

  it("adds missing private write identities from the verified wallet", () => {
    expect(
      withChessIdentity("matches/123/chat", JSON.stringify({ room: "player", text: "hi" }), "0xabc")
    ).toBe(JSON.stringify({ room: "player", text: "hi", author: "0xabc" }));
    expect(
      withChessIdentity("matches/123/note", JSON.stringify({ text: "prep line" }), "0xabc")
    ).toBe(JSON.stringify({ text: "prep line", player: "0xabc" }));
    expect(
      withChessIdentity("matches/123/comments", JSON.stringify({ ply: 4, text: "sharp" }), "0xabc")
    ).toBe(JSON.stringify({ ply: 4, text: "sharp", player: "0xabc" }));
  });

  it("binds Swiss organizer authority to the verified wallet's tournament name", () => {
    const wallet = "0xDD07370000000000000000000000000000006C2E";
    expect(
      withChessIdentity(
        "swiss",
        JSON.stringify({ organizer: "spoofed", name: "Friday Swiss" }),
        wallet
      )
    ).toBe(JSON.stringify({ organizer: "0xDD0737-6C2E", name: "Friday Swiss" }));
    expect(
      withChessIdentity(
        "swiss/123/rounds/next",
        JSON.stringify({ organizer: "another-player" }),
        wallet
      )
    ).toBe(JSON.stringify({ organizer: "0xDD0737-6C2E" }));
  });

  it("keeps a Swiss seat name across the seat-gated endpoints, forcing wallet-shaped ids", () => {
    const proven = "0xDD07370000000000000000000000000000006C2E";
    // A managed-tournament seat is a short display name, not a wallet: it must
    // reach the service untouched so the seat check on moves, comments, notes and
    // player chat recognises the caller.
    expect(
      withChessIdentity(
        "matches/123/moves",
        JSON.stringify({ player: "0xDD0737-6C2E", uci: "e2e4" }),
        proven
      )
    ).toBe(JSON.stringify({ player: "0xDD0737-6C2E", uci: "e2e4" }));
    expect(
      withChessIdentity(
        "matches/123/comments",
        JSON.stringify({ player: "0xDD0737-6C2E", ply: 1, text: "x" }),
        proven
      )
    ).toBe(JSON.stringify({ player: "0xDD0737-6C2E", ply: 1, text: "x" }));
    expect(
      withChessIdentity(
        "matches/123/note",
        JSON.stringify({ player: "0xDD0737-6C2E", text: "x" }),
        proven
      )
    ).toBe(JSON.stringify({ player: "0xDD0737-6C2E", text: "x" }));
    expect(
      withChessIdentity(
        "matches/123/chat",
        JSON.stringify({ author: "0xDD0737-6C2E", room: "player", text: "x" }),
        proven
      )
    ).toBe(JSON.stringify({ author: "0xDD0737-6C2E", room: "player", text: "x" }));
    // An ordinary wallet game sends a wallet-shaped id, which is still forced.
    expect(
      withChessIdentity(
        "matches/123/moves",
        JSON.stringify({ player: "0x1111111111111111111111111111111111111111", uci: "e2e4" }),
        "0xabc"
      )
    ).toBe(JSON.stringify({ player: "0xabc", uci: "e2e4" }));
  });

  it("injects the verified wallet into private chess read query params", () => {
    expect(
      withChessReadIdentity("matches/123/note", new URLSearchParams(), "0xabc").toString()
    ).toBe("player=0xabc");
    expect(
      withChessReadIdentity(
        "matches/123/chat",
        new URLSearchParams("room=player&limit=100"),
        "0xabc"
      ).toString()
    ).toBe("room=player&limit=100&player=0xabc");
    expect(
      withChessReadIdentity(
        "matches/123/chat",
        new URLSearchParams("room=spectator&limit=100"),
        "0xabc"
      ).toString()
    ).toBe("room=spectator&limit=100");
    expect(
      withChessReadIdentity(
        "betting/swiss/swiss-1/bets",
        new URLSearchParams("bettor=0xspoof"),
        "0xabc"
      ).toString()
    ).toBe("bettor=0xabc");
  });
});
