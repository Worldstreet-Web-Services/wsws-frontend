import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscoveryMarketEvent, DiscoveryMarketSummary } from "../markets/api";
import { CategoryEventDetail } from "./category-event-detail";

const mocks = vi.hoisted(() => ({ detail: vi.fn(), refetch: vi.fn() }));

vi.mock("../markets/hooks/use-discovery-markets", () => ({
  useDiscoveryEvent: mocks.detail,
}));
vi.mock("../hooks/use-polymarket-access", () => ({
  usePolymarketAccess: () => ({ allowed: true }),
}));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ authenticated: false, login: vi.fn() }),
}));
vi.mock("./category-bet-sidebar", () => ({
  CategoryBetSidebar: ({
    desktopOpen,
    mobileOpen,
  }: {
    desktopOpen: boolean;
    mobileOpen: boolean;
  }) => (
    <div
      data-testid="bet-sidebar"
      data-desktop={String(desktopOpen)}
      data-mobile={String(mobileOpen)}
    />
  ),
}));

// A phone reports false for the 1280px query the screen uses to pick between
// the desktop sidebar and the bottom sheet. jsdom has no layout, so the query
// is stubbed rather than inferred from a width.
function setDesktopViewport(isDesktop: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("1280") ? isDesktop : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

function market(id: string, question: string): DiscoveryMarketSummary {
  return {
    id,
    conditionId: `condition-${id}`,
    slug: `market-${id}`,
    question,
    groupItemTitle: question,
    description: null,
    category: "politics",
    imageUrl: null,
    iconUrl: null,
    startDate: null,
    endDate: null,
    active: true,
    closed: false,
    acceptingOrders: true,
    restricted: false,
    enableOrderBook: true,
    liquidity: 100,
    volume: 200,
    volume24h: 20,
    bestBid: null,
    bestAsk: null,
    lastTradePrice: null,
    spread: null,
    oneDayPriceChange: null,
    negRisk: false,
    rfqEnabled: false,
    outcomes: [
      { name: "Yes", tokenId: `yes-${id}`, referencePrice: 0.05, decimalOdds: 20 },
      { name: "No", tokenId: `no-${id}`, referencePrice: 0.95, decimalOdds: 1.05 },
    ],
  };
}

const event: DiscoveryMarketEvent = {
  id: "101",
  slug: "presidential-election",
  title: "Presidential election",
  description: "Election rules",
  imageUrl: null,
  iconUrl: null,
  startDate: null,
  endDate: null,
  active: true,
  closed: false,
  restricted: false,
  liquidity: 500,
  volume: 1000,
  volume24h: 100,
  oneDayPriceChange: null,
  marketCount: 3,
  markets: [
    market("1", "Will Alice win?"),
    market("2", "Will Bob win?"),
    market("3", "Will Carol win?"),
  ],
  tags: [{ id: "1", label: "Elections", slug: "elections" }],
};

// 44 CSS pixels is the smallest comfortable touch target. Tailwind spells that
// `h-11` / `min-h-11`, and jsdom has no layout, so the phone-only variant is
// what a test can check.
function hasPhoneTouchTarget(element: Element) {
  return /max-md:(min-)?h-11\b/.test(element.className);
}

beforeEach(() => {
  window.localStorage.clear();
  setDesktopViewport(false);
  mocks.refetch.mockReset();
  mocks.detail.mockReturnValue({
    event,
    loading: false,
    error: false,
    refetch: mocks.refetch,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("category event detail on a phone", () => {
  it("gives the back link and the market search a 44px touch target", () => {
    render(<CategoryEventDetail category="politics" eventId="101" />);
    const back = screen.getByRole("link", { name: /back to politics markets/i });
    expect(hasPhoneTouchTarget(back)).toBe(true);
    const search = screen.getByRole("textbox", { name: /search event markets/i });
    expect(hasPhoneTouchTarget(search.closest("label") as Element)).toBe(true);
  });

  it("keeps the search input at 16px on a phone so iOS does not zoom the page", () => {
    render(<CategoryEventDetail category="politics" eventId="101" />);
    const search = screen.getByRole("textbox", { name: /search event markets/i });
    expect(search.className).toMatch(/max-md:text-base\b/);
  });

  it("leaves room below the last market for the fixed betslip button", () => {
    render(<CategoryEventDetail category="politics" eventId="101" />);
    const back = screen.getByRole("link", { name: /back to politics markets/i });
    expect(back.parentElement?.className).toMatch(/max-xl:pb-\d+/);
  });

  it("opens the bottom sheet rather than the desktop sidebar", () => {
    render(<CategoryEventDetail category="politics" eventId="101" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Yes 20.00" })[0]);
    const sidebar = screen.getByTestId("bet-sidebar");
    expect(sidebar.dataset.mobile).toBe("true");
    expect(sidebar.dataset.desktop).toBe("false");
  });

  it("opens the desktop sidebar above 1280px", () => {
    setDesktopViewport(true);
    render(<CategoryEventDetail category="politics" eventId="101" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Yes 20.00" })[0]);
    const sidebar = screen.getByTestId("bet-sidebar");
    expect(sidebar.dataset.desktop).toBe("true");
    expect(sidebar.dataset.mobile).toBe("false");
  });

  it("sizes the loading skeleton rows like the phone rows they stand in for", () => {
    mocks.detail.mockReturnValue({
      event: null,
      loading: true,
      error: false,
      refetch: mocks.refetch,
    });
    render(<CategoryEventDetail category="politics" eventId="101" />);
    const status = screen.getByRole("status", { name: /loading event markets/i });
    const rows = [...status.querySelectorAll("div")].filter((node) =>
      node.className.includes("animate-pulse")
    );
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.at(-1)?.className).toMatch(/max-md:h-\[\d+px\]/);
  });

  it("retries from an error state through a 44px button", () => {
    mocks.detail.mockReturnValue({
      event: null,
      loading: false,
      error: true,
      refetch: mocks.refetch,
    });
    render(<CategoryEventDetail category="politics" eventId="101" />);
    const retry = screen.getByRole("button", { name: /try again/i });
    expect(hasPhoneTouchTarget(retry)).toBe(true);
    fireEvent.click(retry);
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("filters markets from the in-page search and shows an empty state", () => {
    render(<CategoryEventDetail category="politics" eventId="101" />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    const search = screen.getByRole("textbox", { name: /search event markets/i });
    fireEvent.change(search, { target: { value: "Alice" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "nobody" } });
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText(/no markets match your search/i)).toBeInTheDocument();
  });

  it("sends sports back to the desk and every other category to its listing", () => {
    const { unmount } = render(<CategoryEventDetail category="sports" eventId="101" />);
    expect(screen.getByRole("link", { name: /back to sports markets/i })).toHaveAttribute(
      "href",
      "/prediction"
    );
    unmount();
    render(<CategoryEventDetail category="crypto" eventId="101" />);
    expect(screen.getByRole("link", { name: /back to crypto markets/i })).toHaveAttribute(
      "href",
      "/prediction/markets?category=crypto"
    );
  });

  it("keeps every Yes and No pill at least 48px tall", () => {
    render(<CategoryEventDetail category="politics" eventId="101" />);
    const row = screen.getAllByRole("article")[0];
    for (const pill of within(row).getAllByRole("button")) {
      expect(pill.className).toMatch(/\bh-12\b/);
    }
  });
});
