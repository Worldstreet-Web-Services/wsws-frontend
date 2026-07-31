import { describe, it, expect } from "vitest";
import {
  swissNameFor,
  toSwissSummary,
  toSwissTournament,
  type SwissSummaryWire,
  type SwissWire,
} from "@/lib/casino/api/swiss-wire";

// The swiss module names several things differently from the rest of the app
// (`nbRounds`, `participantCount`, `status`), so this mapping is the only place
// those names appear.

const summaryWire = (over: Partial<SwissSummaryWire> = {}): SwissSummaryWire => ({
  id: "7c4f9d9a-0000-4000-8000-000000000000",
  name: "World Cup Qualifier",
  organizer: "organizer",
  status: "started",
  round: 1,
  nbRounds: 5,
  participantCount: 4,
  ongoingCount: 1,
  timeControl: { initialSeconds: 600, incrementSeconds: 3 },
  winner: null,
  createdAt: "2026-07-30T12:00:00Z",
  startedAt: "2026-07-30T12:05:00Z",
  finishedAt: null,
  ...over,
});

describe("swiss summary", () => {
  it("renames the service's fields onto ours", () => {
    const summary = toSwissSummary(summaryWire());
    expect(summary.state).toBe("started");
    expect(summary.totalRounds).toBe(5);
    expect(summary.playerCount).toBe(4);
    expect(summary.ongoingCount).toBe(1);
    expect(summary.timeControl).toBe("10+3");
  });
});

describe("swiss tournament", () => {
  const full = (over: Partial<SwissWire> = {}): SwissWire => ({
    ...summaryWire(),
    standings: [
      {
        rank: 1,
        name: "Alpha",
        points: 1,
        tieBreak: 0,
        performance: null,
        wins: 1,
        draws: 0,
        losses: 0,
        byes: 0,
        absent: false,
      },
    ],
    rounds: [
      {
        round: 1,
        pairings: [
          {
            round: 1,
            board: 1,
            white: "Alpha",
            black: "Beta",
            matchId: "f2a1c0de-0000-4000-8000-000000000000",
            status: "ongoing",
            result: null,
            isForfeit: false,
          },
        ],
      },
      {
        round: 2,
        pairings: [
          {
            round: 2,
            board: 1,
            white: "Alpha",
            black: null,
            matchId: null,
            status: "bye",
            result: null,
            isForfeit: false,
          },
        ],
      },
    ],
    ...over,
  });

  it("carries standings across", () => {
    const [top] = toSwissTournament(full()).standings;
    expect(top).toMatchObject({ rank: 1, name: "Alpha", points: 1, wins: 1, absent: false });
  });

  // Whoever opens the page wants the round being played now, not round one.
  it("puts the newest round first", () => {
    expect(toSwissTournament(full()).rounds.map((r) => r.round)).toEqual([2, 1]);
  });

  it("keeps a bye without a backing match", () => {
    const bye = toSwissTournament(full()).rounds[0].pairings[0];
    expect(bye.state).toBe("bye");
    expect(bye.matchId).toBeNull();
    expect(bye.black).toBeNull();
  });

  it("survives a response with no rounds or standings yet", () => {
    const fresh = toSwissTournament({
      ...summaryWire({ status: "created", round: 0, participantCount: 0 }),
      standings: [],
      rounds: [],
    });
    expect(fresh.standings).toEqual([]);
    expect(fresh.rounds).toEqual([]);
  });
});

describe("swiss identity", () => {
  // Names are capped at 30 characters with no spaces, and a wallet address is
  // 42, so an address has to be shortened or the service rejects the entry.
  it("shortens a wallet address into an accepted name", () => {
    const name = swissNameFor("0x9f6a128a1AdCe9Be54258861B8869A2BCa1f4622");
    expect(name).toBe("0x9f6a4622");
    expect(name.length).toBeLessThanOrEqual(30);
    expect(name).not.toMatch(/\s/);
  });

  it("is stable, so the same wallet is always the same entrant", () => {
    const address = "0x9f6a128a1AdCe9Be54258861B8869A2BCa1f4622";
    expect(swissNameFor(address)).toBe(swissNameFor(address));
  });

  it("leaves a name that already fits alone", () => {
    expect(swissNameFor("Alpha")).toBe("Alpha");
  });
});
