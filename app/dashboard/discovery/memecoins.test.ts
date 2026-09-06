import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMemeSpots } from "@/app/dashboard/discovery/memecoins";
import type { MemeToken } from "@/lib/meme/api";

// The adapter's job is the mapping, the ranking and the exclusions, so the
// trade slice's trending hook is replaced by a value the test sets directly.
// What react-query does with the request is that hook's own test's business.
const trending = vi.hoisted(() => ({ tokens: [] as MemeToken[] }));
vi.mock("@/features/trade/hooks/use-meme-tokens", () => ({
  useTrendingMemes: () => ({
    tokens: trending.tokens,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

let nextAddress = 1;

function token(over: Partial<MemeToken> = {}): MemeToken {
  const address = `0x${String(nextAddress++).padStart(40, "0")}`;
  return {
    chainId: 8453,
    address,
    name: "Dogwifhat",
    symbol: "WIF",
    decimals: 18,
    logoUrl: "https://cdn.example/wif.png",
    priceUsd: "1.23",
    liquidityUsd: "480000",
    volume24hUsd: "92000",
    priceChange24hPercent: "12.5",
    marketCapUsd: "1200000",
    fdvUsd: "1200000",
    pairAddress: null,
    dexName: "aerodrome",
    riskLevel: "LOW",
    buyEnabled: true,
    sellEnabled: true,
    warnings: [],
    ...over,
  };
}

function spotsFor(tokens: MemeToken[], limit?: number) {
  trending.tokens = tokens;
  return renderHook(() => useMemeSpots(limit)).result.current;
}

beforeEach(() => {
  nextAddress = 1;
  trending.tokens = [];
});

describe("useMemeSpots", () => {
  it("maps a coin to everything the card renders and nothing it has to parse", () => {
    expect(
      spotsFor([
        token({
          symbol: "PONKE",
          name: "Ponke",
          logoUrl: "https://cdn.example/ponke.png",
          priceChange24hPercent: "42.317",
        }),
      ])
    ).toEqual([
      {
        symbol: "PONKE",
        name: "Ponke",
        change: "+42.32%",
        up: true,
        image: "https://cdn.example/ponke.png",
        href: "/meme",
      },
    ]);
  });

  it("sends every coin to the meme desk, the only place one can be bought", () => {
    const spots = spotsFor([token({ symbol: "A" }), token({ symbol: "B" })]);
    expect(spots.map((s) => s.href)).toEqual(["/meme", "/meme"]);
  });

  it("drops the decimals on a four figure move and keeps them on a small one", () => {
    const spots = spotsFor([
      token({ symbol: "MOON", priceChange24hPercent: "1000" }),
      token({ symbol: "CREEP", priceChange24hPercent: "3.1" }),
    ]);
    expect(spots.map((s) => s.change)).toEqual(["+1000%", "+3.10%"]);
  });

  it("signs a loss and flags it as down for the card to colour", () => {
    const [spot] = spotsFor([token({ symbol: "RUG", priceChange24hPercent: "-18.4" })]);
    expect(spot.change).toBe("-18.40%");
    expect(spot.up).toBe(false);
  });

  it("reads flat as up, so a move that rounds to zero is never shown as a loss", () => {
    const spots = spotsFor([
      token({ symbol: "FLAT", priceChange24hPercent: "0" }),
      token({ symbol: "DUST", priceChange24hPercent: "-0.001" }),
    ]);
    expect(spots.map((s) => [s.change, s.up])).toEqual([
      ["+0.00%", true],
      ["+0.00%", true],
    ]);
  });

  it("keeps the coin's own logo, and passes null through when it has none", () => {
    const spots = spotsFor([
      token({ symbol: "WIF", logoUrl: "https://cdn.example/wif.png" }),
      token({ symbol: "NOART", logoUrl: null, priceChange24hPercent: "1" }),
    ]);
    expect(spots.map((s) => s.image)).toEqual(["https://cdn.example/wif.png", null]);
  });

  it("falls back to the ticker when the catalogue has no name", () => {
    const [spot] = spotsFor([token({ symbol: "BRETT", name: null })]);
    expect(spot.name).toBe("BRETT");
  });

  it("ranks by the 24h move rather than keeping upstream order", () => {
    const spots = spotsFor([
      token({ symbol: "SLOW", priceChange24hPercent: "4" }),
      token({ symbol: "LOSER", priceChange24hPercent: "-30" }),
      token({ symbol: "BEST", priceChange24hPercent: "820" }),
      token({ symbol: "GOOD", priceChange24hPercent: "77.5" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["BEST", "GOOD", "SLOW", "LOSER"]);
  });

  it("shows the best of a red day rather than going blank", () => {
    const spots = spotsFor([
      token({ symbol: "WORSE", priceChange24hPercent: "-60" }),
      token({ symbol: "BAD", priceChange24hPercent: "-12" }),
    ]);
    expect(spots.map((s) => [s.symbol, s.up])).toEqual([
      ["BAD", false],
      ["WORSE", false],
    ]);
  });

  it("holds upstream order between coins on the same move", () => {
    const spots = spotsFor([
      token({ symbol: "FIRST", priceChange24hPercent: "50" }),
      token({ symbol: "SECOND", priceChange24hPercent: "50" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["FIRST", "SECOND"]);
  });

  it("never promotes a coin the service will not sell", () => {
    const spots = spotsFor([
      token({ symbol: "LOCKED", buyEnabled: false, priceChange24hPercent: "900" }),
      token({ symbol: "OPEN", priceChange24hPercent: "5" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["OPEN"]);
  });

  it("never promotes a coin the risk engine has flagged high or critical", () => {
    const spots = spotsFor([
      token({ symbol: "HONEYPOT", riskLevel: "CRITICAL", priceChange24hPercent: "5000" }),
      token({ symbol: "RISKY", riskLevel: "HIGH", priceChange24hPercent: "3000" }),
      token({ symbol: "MID", riskLevel: "MEDIUM", priceChange24hPercent: "20" }),
      token({ symbol: "SAFE", riskLevel: "LOW", priceChange24hPercent: "10" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["MID", "SAFE"]);
  });

  it("still promotes an unrated coin, which is all the trending feed ever returns", () => {
    // /tokens/trending omits the risk block and withRiskDefaults fills it in as
    // UNKNOWN. Excluding it would empty this card on the normal path.
    const spots = spotsFor([token({ symbol: "NEW", riskLevel: "UNKNOWN" })]);
    expect(spots.map((s) => s.symbol)).toEqual(["NEW"]);
  });

  it("never promotes a coin carrying a warning the card has no room to show", () => {
    const spots = spotsFor([
      token({
        symbol: "TAXED",
        priceChange24hPercent: "700",
        warnings: [{ code: "HIGH_TAX", message: "Buy tax is 8%." }],
      }),
      token({ symbol: "CLEAN", priceChange24hPercent: "6" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["CLEAN"]);
  });

  it("does not treat the upgradeable-proxy flag as a warning", () => {
    // visibleWarnings drops it because nearly every serious token carries it.
    // Counting it would exclude almost the whole catalogue.
    const spots = spotsFor([
      token({
        symbol: "PROXY",
        warnings: [{ code: "CONTRACT_UPGRADEABLE", message: "The token contract is upgradeable." }],
      }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["PROXY"]);
  });

  it("drops a coin with no ticker, which is the whole identity of a card this size", () => {
    const spots = spotsFor([
      token({ symbol: null, priceChange24hPercent: "800" }),
      token({ symbol: "  ", priceChange24hPercent: "700" }),
      token({ symbol: "REAL", priceChange24hPercent: "9" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["REAL"]);
  });

  it("drops a coin with no 24h figure rather than showing a dash", () => {
    // The figure is the entire content of the card, and a coin without one has
    // no place in the ranking either.
    const spots = spotsFor([
      token({ symbol: "NULL", priceChange24hPercent: null }),
      token({ symbol: "BLANK", priceChange24hPercent: "  " }),
      token({ symbol: "JUNK", priceChange24hPercent: "n/a" }),
      token({ symbol: "REAL", priceChange24hPercent: "2" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["REAL"]);
  });

  // Five clean coins on descending moves, none of them a ticker the card has
  // artwork for, so a featured coin added beside them is always the one that
  // has to be held a slot.
  function movers(): MemeToken[] {
    return Array.from({ length: 5 }, (_, i) =>
      token({ symbol: `C${i}`, priceChange24hPercent: String(100 - i) })
    );
  }

  it("holds a slot for a coin the card has artwork for that the ranking would cut", () => {
    // SHIB is nowhere near the top five on the move, which is the whole reason
    // the slot exists: ranked honestly the drawing never gets on screen.
    const spots = spotsFor([...movers(), token({ symbol: "SHIB", priceChange24hPercent: "1" })]);
    expect(spots.map((s) => s.symbol)).toEqual(["C0", "C1", "C2", "C3", "SHIB"]);
  });

  it("sorts a held coin in on its own move rather than pinning it to the front", () => {
    const spots = spotsFor([...movers(), token({ symbol: "SHIB", priceChange24hPercent: "97.5" })]);
    expect(spots.map((s) => s.symbol)).toEqual(["C0", "C1", "C2", "SHIB", "C3"]);
  });

  it("shows a held coin's real figure, including a loss", () => {
    const spots = spotsFor([...movers(), token({ symbol: "SHIB", priceChange24hPercent: "-12" })]);
    const shib = spots.find((s) => s.symbol === "SHIB");
    expect(shib?.change).toBe("-12.00%");
    expect(shib?.up).toBe(false);
  });

  it("holds a slot for both featured tickers when both are in the feed", () => {
    const spots = spotsFor([
      ...movers(),
      token({ symbol: "SHIB", priceChange24hPercent: "1" }),
      token({ symbol: "PEPE", priceChange24hPercent: "2" }),
    ]);
    expect(spots.map((s) => s.symbol)).toEqual(["C0", "C1", "C2", "PEPE", "SHIB"]);
  });

  it("matches the featured ticker whatever case the catalogue returns it in", () => {
    // The catalogue returns both "PEPE" and "Pepe" for the same coin.
    const spots = spotsFor([...movers(), token({ symbol: "Pepe", priceChange24hPercent: "1" })]);
    expect(spots.map((s) => s.symbol)).toEqual(["C0", "C1", "C2", "C3", "Pepe"]);
  });

  it("changes nothing when the feed carries neither featured ticker", () => {
    // The live trending feed is new listings and on most days holds no SHIB and
    // no PEPE at all. A held slot cannot invent a coin, so the row is exactly
    // the top movers and the card still needs something to show without one.
    const spots = spotsFor([...movers(), token({ symbol: "WIF", priceChange24hPercent: "1" })]);
    expect(spots.map((s) => s.symbol)).toEqual(["C0", "C1", "C2", "C3", "C4"]);
  });

  it("does not hold a second slot for a featured coin already in the row", () => {
    const spots = spotsFor([token({ symbol: "SHIB", priceChange24hPercent: "500" }), ...movers()]);
    expect(spots.map((s) => s.symbol)).toEqual(["SHIB", "C0", "C1", "C2", "C3"]);
  });

  it("never holds more than half the row, so the row stays the movers it claims", () => {
    const feed = [
      ...movers(),
      token({ symbol: "SHIB", priceChange24hPercent: "1" }),
      token({ symbol: "PEPE", priceChange24hPercent: "2" }),
    ];
    expect(spotsFor(feed, 2).map((s) => s.symbol)).toEqual(["C0", "PEPE"]);
    // On a one card row the top mover is everything the card says, so nothing
    // is held at all.
    expect(spotsFor(feed, 1).map((s) => s.symbol)).toEqual(["C0"]);
  });

  it("holds no slot for a featured coin that fails an exclusion", () => {
    // Artwork is a reason to show a coin, not a reason to trust one. Each of
    // these SHIBs would have been held a slot had it been promotable.
    const unsellable = spotsFor([
      ...movers(),
      token({ symbol: "SHIB", priceChange24hPercent: "1", buyEnabled: false }),
    ]);
    const flagged = spotsFor([
      ...movers(),
      token({ symbol: "SHIB", priceChange24hPercent: "1", riskLevel: "HIGH" }),
    ]);
    const warned = spotsFor([
      ...movers(),
      token({
        symbol: "SHIB",
        priceChange24hPercent: "1",
        warnings: [{ code: "LOW_LIQUIDITY", message: "Liquidity is below the warning threshold." }],
      }),
    ]);
    for (const spots of [unsellable, flagged, warned]) {
      expect(spots.map((s) => s.symbol)).toEqual(["C0", "C1", "C2", "C3", "C4"]);
    }
  });

  it("deals a ticker once, keeping the better mover of two contracts on it", () => {
    // A catalogue page lists a ticker once per contract, so two PEPEs on two
    // addresses is normal. Two cards on one ticker with two figures is the row
    // arguing with itself, and it would draw the featured artwork twice.
    const spots = spotsFor([
      token({ symbol: "PEPE", name: "Pepe Army", priceChange24hPercent: "5" }),
      token({ symbol: "PEPE", name: "Pepe", priceChange24hPercent: "50" }),
      token({ symbol: "SOL", priceChange24hPercent: "4" }),
      token({ symbol: "SOL", priceChange24hPercent: "9" }),
    ]);
    expect(spots.map((s) => [s.symbol, s.change])).toEqual([
      ["PEPE", "+50.00%"],
      ["SOL", "+9.00%"],
    ]);
  });

  it("drops a logo the card could not draw, so its ticker disc takes over", () => {
    // The card falls back to a ticker disc on null and on nothing else, so a
    // string that is not a usable image would put a broken icon on the card.
    const spots = spotsFor([
      token({ symbol: "A", logoUrl: "", priceChange24hPercent: "5" }),
      token({ symbol: "B", logoUrl: "   ", priceChange24hPercent: "4" }),
      token({ symbol: "C", logoUrl: "/market/token-coin.svg", priceChange24hPercent: "3" }),
      token({ symbol: "D", logoUrl: " https://cdn.example/d.png ", priceChange24hPercent: "2" }),
    ]);
    expect(spots.map((s) => s.image)).toEqual([null, null, null, "https://cdn.example/d.png"]);
  });

  it("features five coins unless asked for another number", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      token({ symbol: `C${i}`, priceChange24hPercent: String(100 - i) })
    );
    expect(spotsFor(many)).toHaveLength(5);
    expect(spotsFor(many, 2).map((s) => s.symbol)).toEqual(["C0", "C1"]);
    expect(spotsFor(many, 20)).toHaveLength(9);
    expect(spotsFor(many, 0)).toEqual([]);
  });

  it("is empty when the feed failed, and empty when nothing in it can be promoted", () => {
    expect(spotsFor([])).toEqual([]);
    expect(spotsFor([token({ buyEnabled: false })])).toEqual([]);
  });

  it("keeps one array identity across re-renders so the rotation does not restart", () => {
    trending.tokens = [token({ symbol: "WIF" }), token({ symbol: "BRETT" })];
    const { result, rerender } = renderHook(() => useMemeSpots());
    const first = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(first);
  });

  it("keeps that identity when a poll returns the same coins in new objects", () => {
    trending.tokens = [token({ symbol: "WIF", priceChange24hPercent: "12.5" })];
    const { result, rerender } = renderHook(() => useMemeSpots());
    const first = result.current;

    nextAddress = 1;
    trending.tokens = [token({ symbol: "WIF", priceChange24hPercent: "12.5" })];
    rerender();
    expect(result.current).toBe(first);
  });

  it("hands back a new array once the coins actually change", () => {
    trending.tokens = [token({ symbol: "WIF", priceChange24hPercent: "12.5" })];
    const { result, rerender } = renderHook(() => useMemeSpots());
    const first = result.current;

    trending.tokens = [token({ symbol: "WIF", priceChange24hPercent: "31.9" })];
    rerender();
    expect(result.current).not.toBe(first);
    expect(result.current[0].change).toBe("+31.90%");
  });

  it("keeps one empty identity while the feed has nothing", () => {
    const { result, rerender } = renderHook(() => useMemeSpots());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(first).toEqual([]);
  });
});
