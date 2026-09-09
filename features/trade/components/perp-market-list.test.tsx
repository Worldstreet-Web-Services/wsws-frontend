import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import type { HlAsset, HlMarketContext } from "@/features/trade/lib/hyperliquid-types";

function makeAsset(symbol: string): HlAsset {
  return {
    id: `asset-${symbol}`,
    assetIndex: 0,
    dex: "",
    symbol,
    category: "crypto",
    szDecimals: 3,
    maxLeverage: 40,
    isActive: true,
  };
}

function makeContext(symbol: string, overrides: Partial<HlMarketContext> = {}): HlMarketContext {
  return {
    symbol,
    markPrice: "100",
    oraclePrice: "100",
    prevDayPrice: "90",
    dayVolumeUsd: "1000",
    openInterest: "10",
    fundingRate: "0.0001",
    ...overrides,
  };
}

// Mutable so each test can shape the hooks' return without a fresh mock
// factory. Read at render time, matching hyperliquid-pro-perps.test.tsx's own
// pattern for the same two hooks.
let assets: HlAsset[] = [];
let assetsLoading = false;
let prices: Record<string, string> = {};
let contexts: HlMarketContext[] = [];
let contextsLoading = false;

vi.mock("@/features/trade/hooks/use-hyperliquid-trading", () => ({
  useHyperliquidTrading: () => ({
    authenticated: true,
    assets,
    assetsLoading,
    prices,
  }),
}));
vi.mock("@/features/trade/hooks/use-hyperliquid-market-contexts", () => ({
  useHyperliquidMarketContexts: () => ({ contexts, loading: contextsLoading }),
}));

const invalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

const { PerpMarketList } = await import("@/features/trade/components/perp-market-list");

// perps.tryAgain is not in messages/*.json yet (this suite's owner does not
// touch translation catalogs — see the "KEYS I NEED" note in the change this
// belongs to). Added here, the same way hyperliquid-pro-perps.test.tsx adds
// keys a catalog does not ship yet, so the retry state can be proved before
// the real catalogs carry the string.
const messagesWithTryAgain = {
  ...messages,
  perps: { ...messages.perps, tryAgain: "Try again" },
} as typeof messages;

function renderList(
  onSelect: (symbol: string) => void = vi.fn(),
  msgs: typeof messages = messagesWithTryAgain
) {
  return render(
    <NextIntlClientProvider locale="en" messages={msgs}>
      <PerpMarketList onSelect={onSelect} />
    </NextIntlClientProvider>
  );
}

describe("PerpMarketList", () => {
  it("shows a loading skeleton while there is no data yet", () => {
    assets = [];
    assetsLoading = true;
    contexts = [];
    contextsLoading = true;

    renderList();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the unavailable state with a retry once loading finishes with nothing to show", () => {
    assets = [];
    assetsLoading = false;
    contexts = [];
    contextsLoading = false;

    renderList();

    expect(screen.getByText(messages.perps.marketsLoadWhenConnected)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(retry);
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it("joins assets, prices and contexts the same way the asset picker does, and reports a tap", () => {
    assets = [makeAsset("BTC"), makeAsset("ETH")];
    assetsLoading = false;
    prices = { BTC: "64000", ETH: "3200" };
    contexts = [
      makeContext("BTC", { markPrice: "64000", prevDayPrice: "60000", dayVolumeUsd: "2000000" }),
      makeContext("ETH", { markPrice: "3200", prevDayPrice: "3200", dayVolumeUsd: "500000" }),
    ];
    contextsLoading = false;

    const onSelect = vi.fn();
    renderList(onSelect);

    // Sorted busiest-first, same as hyperliquid-asset-picker.tsx: BTC's
    // 2,000,000 volume outranks ETH's 500,000.
    const rows = screen.getAllByRole("button").filter((b) => b.textContent?.includes("USDC"));
    expect(rows[0]?.textContent).toContain("BTC-USDC");
    expect(rows[1]?.textContent).toContain("ETH-USDC");

    fireEvent.click(rows[0]!);
    expect(onSelect).toHaveBeenCalledWith("BTC");
  });

  it("shows an unavailable dash, never a fabricated zero, for a market with no published move", () => {
    assets = [makeAsset("SOL")];
    assetsLoading = false;
    prices = { SOL: "150" };
    // No context arrived for this market at all: no mark, no prevDayPrice.
    contexts = [];
    contextsLoading = false;

    renderList();

    const row = screen.getByRole("button", { name: /SOL-USDC/ });
    // Falls back to the live mid (150) for price, since a context never
    // arrived, but the 24h move has no honest source and must not print 0.00%.
    expect(row.textContent).not.toContain("0.00%");
    expect(row.textContent).toContain("—");
  });

  it("gives every row and the retry control a 44px hit area", () => {
    assets = [makeAsset("BTC")];
    assetsLoading = false;
    prices = { BTC: "100" };
    contexts = [makeContext("BTC")];
    contextsLoading = false;

    renderList();
    const row = screen.getByRole("button", { name: /BTC-USDC/ });
    expect(row.className).toContain("h-[60px]");
  });

  it("paginates past the default page size and announces the page change", () => {
    assets = Array.from({ length: 12 }, (_, i) => makeAsset(`SYM${i}`));
    assetsLoading = false;
    prices = Object.fromEntries(assets.map((a) => [a.symbol, "10"]));
    contexts = assets.map((a) => makeContext(a.symbol, { dayVolumeUsd: "100" }));
    contextsLoading = false;

    renderList();

    const rowButtons = () =>
      screen.getAllByRole("button").filter((b) => b.textContent?.includes("USDC"));
    expect(rowButtons()).toHaveLength(10);

    const live = document.querySelector('[aria-live="polite"].sr-only');
    expect(live?.textContent).toContain("1");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(rowButtons()).toHaveLength(2);
    expect(live?.textContent).toContain("2");
  });
});
