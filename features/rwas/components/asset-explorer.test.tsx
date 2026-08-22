import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssetExplorer } from "@/features/rwas/components/asset-explorer";
import type { MarketAssetList, MarketAssetSummary } from "@/lib/api/schemas/rwas";

const rwasApi = vi.hoisted(() => ({
  fetchMarketAssets: vi.fn(),
}));

vi.mock("@/features/rwas/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/rwas/lib/api")>();
  return { ...original, fetchMarketAssets: rwasApi.fetchMarketAssets };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function asset(overrides: Partial<MarketAssetSummary> = {}): MarketAssetSummary {
  return {
    source: "ondo",
    symbol: "MRNAon",
    ticker: "MRNA",
    name: "Moderna",
    iconUrl: "https://cdn.example.com/mrna.png",
    tags: [
      {
        categoryLayer: "1",
        categorySlug: "asset-class",
        categoryLabel: "Asset Class",
        tagSlug: "equities",
        tagLabel: "Equities",
      },
    ],
    createdAt: "2026-08-19T17:53:57.655Z",
    tradingPaused: false,
    offHoursTradable: true,
    primaryMarket: {
      priceUsd: "155.91",
      priceChange24hUsd: "92.64",
      priceChange24hPercent: "147.04",
      change24hAvailable: true,
      chartAvailable: true,
      priceHistory24h: [
        { timestamp: "2026-08-19T16:53:57.655Z", priceUsd: "63.27" },
        { timestamp: "2026-08-19T17:53:57.655Z", priceUsd: "155.91" },
      ],
    },
    underlyingMarket: {
      ticker: "MRNA",
      name: "Moderna",
      priceHigh52wUsd: "160",
      priceLow52wUsd: "50",
      volume24hUsd: "199252329",
      averageVolume: "1000000",
      sharesOutstanding: "1000000",
      marketCapUsd: "200000000",
    },
    networks: [],
    marketDataUpdatedAt: "2026-08-19T17:53:57.655Z",
    ...overrides,
  };
}

function list(overrides: Partial<MarketAssetList> = {}): MarketAssetList {
  return {
    items: [asset()],
    total: 1,
    page: 1,
    pageSize: 48,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 48,
    offset: 0,
    lastUpdatedAt: "2026-08-19T17:53:57.655Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rwasApi.fetchMarketAssets.mockResolvedValue(list());
});

describe("asset explorer", () => {
  it("renders the registry response with the extracted discovery controls", async () => {
    render(<AssetExplorer />, { wrapper });

    expect(screen.getByRole("heading", { name: /explore assets/i })).toBeInTheDocument();
    expect(await screen.findByText("MRNAon")).toBeInTheDocument();
    expect(screen.getByText("$155.91")).toBeInTheDocument();
    expect(screen.getByText(/147\.04% 24H/i)).toBeInTheDocument();
    expect(screen.getByText("Registry live")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Moderna" })).toHaveAttribute(
      "href",
      "/rwa/assets/MRNAon"
    );

    expect(rwasApi.fetchMarketAssets).toHaveBeenCalledWith(
      {
        search: "",
        tagFilters: [],
        sort: "most-popular",
        page: 1,
        pageSize: 48,
      },
      { signal: expect.any(AbortSignal) }
    );
  });

  it("maps category, search and sort controls to the list request", async () => {
    render(<AssetExplorer />, { wrapper });
    await screen.findByText("MRNAon");

    fireEvent.click(screen.getByRole("button", { name: "Stocks" }));
    await waitFor(() =>
      expect(rwasApi.fetchMarketAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ tagFilters: ["stock"], page: 1 }),
        expect.any(Object)
      )
    );

    fireEvent.change(screen.getByPlaceholderText("Search asset name or ticker"), {
      target: { value: "intel" },
    });
    await waitFor(() =>
      expect(rwasApi.fetchMarketAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "intel", tagFilters: ["stock"] }),
        expect.any(Object)
      )
    );

    fireEvent.change(screen.getByLabelText("Sort assets"), {
      target: { value: "top-gainer" },
    });
    await waitFor(() =>
      expect(rwasApi.fetchMarketAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "top-gainer", page: 1 }),
        expect.any(Object)
      )
    );
  });

  it("offers matching assets while typing and applies a selected suggestion", async () => {
    render(<AssetExplorer />, { wrapper });
    await screen.findByText("MRNAon");

    const search = screen.getByPlaceholderText("Search asset name or ticker");
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: "mod" } });

    const suggestionList = await screen.findByRole("listbox");
    const suggestion = within(suggestionList).getByRole("option");
    expect(suggestion).toHaveTextContent("MRNAon");
    expect(suggestion).toHaveTextContent("Moderna");
    expect(search).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(suggestion);

    expect(search).toHaveValue("MRNAon");
    expect(search).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(rwasApi.fetchMarketAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "MRNAon", page: 1 }),
        expect.any(Object)
      )
    );
  });

  it("renders a complete undashed sparkline and prioritizes visible logos", async () => {
    const { container } = render(<AssetExplorer />, { wrapper });
    await screen.findByText("MRNAon");

    const chartLine = container.querySelector('[data-testid="asset-sparkline-line"]');
    expect(chartLine).not.toHaveAttribute("stroke-dasharray");
    expect(chartLine).not.toHaveAttribute("stroke-dashoffset");

    const logo = screen.getByAltText("Moderna logo");
    expect(logo).toHaveAttribute("loading", "eager");
    expect(logo).toHaveAttribute("fetchpriority", "high");
  });

  it("does not invent a chart when no traded history is available", async () => {
    rwasApi.fetchMarketAssets.mockResolvedValue(
      list({
        items: [
          asset({
            primaryMarket: {
              ...asset().primaryMarket,
              chartAvailable: false,
              priceHistory24h: [],
            },
          }),
        ],
      })
    );

    const { container } = render(<AssetExplorer />, { wrapper });

    expect(await screen.findByLabelText("Market chart unavailable")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="asset-sparkline-line"]')).not.toBeInTheDocument();
  });

  it("forces paused assets into the neutral metallic state", async () => {
    rwasApi.fetchMarketAssets.mockResolvedValue(list({ items: [asset({ tradingPaused: true })] }));

    const { container } = render(<AssetExplorer />, { wrapper });
    await screen.findByText("MRNAon");

    expect(container.querySelector('[data-symbol="MRNAon"] [data-trend]')).toHaveAttribute(
      "data-trend",
      "neutral"
    );
    expect(screen.getByText(/147\.04% 24H/i)).toHaveAttribute("data-trend", "neutral");
  });

  it("switches to the table without another network request", async () => {
    render(<AssetExplorer />, { wrapper });
    await screen.findByText("MRNAon");
    const callsBeforeViewChange = rwasApi.fetchMarketAssets.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Table view" }));

    expect(screen.getByRole("table", { name: "Assets" })).toBeInTheDocument();
    expect(screen.getByText("24h Volume")).toBeInTheDocument();
    expect(rwasApi.fetchMarketAssets).toHaveBeenCalledTimes(callsBeforeViewChange);
  });

  it("uses backend pagination metadata for the next page", async () => {
    rwasApi.fetchMarketAssets.mockImplementation(async (filters: { page?: number }) =>
      filters.page === 2
        ? list({ page: 2, total: 49, totalPages: 2, hasPreviousPage: true })
        : list({ total: 49, totalPages: 2, hasNextPage: true })
    );

    render(<AssetExplorer />, { wrapper });
    await screen.findByText("MRNAon");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() =>
      expect(rwasApi.fetchMarketAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.any(Object)
      )
    );
    expect(
      await screen.findByRole("button", { name: "Page 2", current: "page" })
    ).toHaveTextContent("2");
  });
});
