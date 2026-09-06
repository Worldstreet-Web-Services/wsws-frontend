import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTokenSpots } from "@/app/dashboard/discovery/tokens";
import type { SpotMarket } from "@/features/trade/hooks/use-spot-markets";

// The adapter's only input. Held in a box so a test can swap what trade's hook
// returns between renders, which is what proves the rotation is not restarted.
const spot = vi.hoisted(() => ({
  value: { markets: [] as SpotMarket[], loading: false, error: false },
}));

vi.mock("@/features/trade/hooks/use-spot-markets", () => ({
  useSpotMarkets: () => spot.value,
}));

function market(over: Partial<SpotMarket> = {}): SpotMarket {
  return {
    symbol: "BTC",
    name: "Bitcoin",
    priceUsd: 1_876_617,
    change24h: 12.8,
    logo: "https://cdn.example/btc.png",
    coingeckoId: "bitcoin",
    marketCap: 1_000_000_000,
    ...over,
  };
}

function setMarkets(markets: SpotMarket[], error = false): void {
  spot.value = { markets, loading: false, error };
}

beforeEach(() => {
  setMarkets([]);
});

describe("mapping a market into a TokenSpot", () => {
  it("formats every string the card shows, so the card formats nothing", () => {
    setMarkets([market()]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current).toEqual([
      {
        symbol: "BTC",
        name: "Bitcoin",
        price: "$1,876,617.00",
        change: "+12.80%",
        up: true,
        movePercent: "12.80%",
        logo: "https://cdn.example/btc.png",
        href: "/spot",
      },
    ]);
  });

  it("keeps sub-dollar prices readable instead of rounding them to $0.00", () => {
    setMarkets([market({ symbol: "SHIB", priceUsd: 0.000012345 })]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current[0].price).toBe("$0.000012");
  });

  it("signs a loss and flags it down, with an unsigned move for the tip copy", () => {
    setMarkets([market({ symbol: "SOL", change24h: -3.2 })]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current[0].change).toBe("-3.20%");
    expect(result.current[0].movePercent).toBe("3.20%");
    expect(result.current[0].up).toBe(false);
  });

  it("flags a gain up", () => {
    setMarkets([market({ change24h: 0.05 })]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current[0].up).toBe(true);
    expect(result.current[0].change).toBe("+0.05%");
  });

  it("passes a missing logo through as null rather than inventing one", () => {
    setMarkets([market({ logo: null })]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current[0].logo).toBeNull();
  });
});

describe("choosing which tokens to feature", () => {
  it("takes the biggest movers by size of the swing, losses included", () => {
    setMarkets([
      market({ symbol: "AAA", change24h: 1 }),
      market({ symbol: "BBB", change24h: -40 }),
      market({ symbol: "CCC", change24h: 12 }),
    ]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current.map((s) => s.symbol)).toEqual(["BBB", "CCC", "AAA"]);
  });

  it("features five by default", () => {
    setMarkets(
      ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"].map((symbol, i) =>
        market({ symbol, change24h: 10 + i })
      )
    );

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current.map((s) => s.symbol)).toEqual(["GGG", "FFF", "EEE", "DDD", "CCC"]);
  });

  it("honours an explicit limit", () => {
    setMarkets([
      market({ symbol: "AAA", change24h: 5 }),
      market({ symbol: "BBB", change24h: 9 }),
      market({ symbol: "CCC", change24h: 7 }),
    ]);

    const { result } = renderHook(() => useTokenSpots(2));

    expect(result.current.map((s) => s.symbol)).toEqual(["BBB", "CCC"]);
  });

  it("features nothing for a limit of zero", () => {
    setMarkets([market()]);

    const { result } = renderHook(() => useTokenSpots(0));

    expect(result.current).toEqual([]);
  });

  it("breaks a tied swing with market cap, then symbol", () => {
    setMarkets([
      market({ symbol: "CCC", change24h: 5, marketCap: 10 }),
      market({ symbol: "AAA", change24h: -5, marketCap: 10 }),
      market({ symbol: "BBB", change24h: 5, marketCap: 900 }),
    ]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current.map((s) => s.symbol)).toEqual(["BBB", "AAA", "CCC"]);
  });

  it("drops a token with no price rather than featuring it at $0.00", () => {
    setMarkets([
      market({ symbol: "DEAD", priceUsd: 0, change24h: 99 }),
      market({ symbol: "LIVE", change24h: 4 }),
    ]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current.map((s) => s.symbol)).toEqual(["LIVE"]);
  });

  it("drops a token the feed reports no move for, which is also how it reports no data", () => {
    setMarkets([
      market({ symbol: "FLAT", change24h: 0 }),
      market({ symbol: "DUST", change24h: 0.004 }),
      market({ symbol: "MOVER", change24h: 4 }),
    ]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current.map((s) => s.symbol)).toEqual(["MOVER"]);
  });
});

describe("loading and failure", () => {
  it("features nothing while the market list is loading", () => {
    setMarkets([]);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current).toEqual([]);
  });

  it("features nothing when the market list fails, so the card keeps its editorial content", () => {
    setMarkets([market()], true);

    const { result } = renderHook(() => useTokenSpots());

    expect(result.current).toEqual([]);
  });

  it("hands back the same empty array every render, so an empty rotation does not churn", () => {
    setMarkets([]);

    const { result, rerender } = renderHook(() => useTokenSpots());
    const first = result.current;
    setMarkets([]);
    rerender();

    expect(result.current).toBe(first);
  });
});

describe("referential stability", () => {
  it("holds the previous array when a poll returns the same numbers in a new array", () => {
    setMarkets([market({ symbol: "ETH", priceUsd: 3200, change24h: 6.5 })]);

    const { result, rerender } = renderHook(() => useTokenSpots());
    const first = result.current;

    // What the price poll does: same reading, brand new objects.
    setMarkets([market({ symbol: "ETH", priceUsd: 3200, change24h: 6.5 })]);
    rerender();

    expect(result.current).toBe(first);
  });

  it("hands back a new array once a price actually moves", () => {
    setMarkets([market({ symbol: "ETH", priceUsd: 3200, change24h: 6.5 })]);

    const { result, rerender } = renderHook(() => useTokenSpots());
    const first = result.current;

    setMarkets([market({ symbol: "ETH", priceUsd: 3400, change24h: 6.9 })]);
    rerender();

    expect(result.current).not.toBe(first);
    expect(result.current[0].price).toBe("$3,400.00");
  });

  it("holds the previous array when the change is below what the label can show", () => {
    setMarkets([market({ symbol: "ETH", priceUsd: 3200.001, change24h: 6.5 })]);

    const { result, rerender } = renderHook(() => useTokenSpots());
    const first = result.current;

    setMarkets([market({ symbol: "ETH", priceUsd: 3200.002, change24h: 6.5 })]);
    rerender();

    expect(result.current).toBe(first);
  });
});
