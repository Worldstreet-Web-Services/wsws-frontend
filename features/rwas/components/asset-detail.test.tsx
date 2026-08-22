import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PurchasePanel } from "@/features/rwas/components/asset-detail";
import type { MarketAssetDetails } from "@/lib/api/schemas/rwas";

const mocks = vi.hoisted(() => ({
  clearPendingBuy: vi.fn(),
  execute: vi.fn(),
  fetchMarketAssetQuote: vi.fn(),
  useRwasTrade: vi.fn(),
}));

vi.mock("@/features/rwas/hooks/use-rwas-trade", () => ({
  useRwasTrade: mocks.useRwasTrade,
}));

function tradeState(overrides: Record<string, unknown> = {}) {
  return {
    clearPendingBuy: mocks.clearPendingBuy,
    execute: mocks.execute,
    busy: false,
    locked: false,
    hasPendingBuy: false,
    pendingBuyNeedsEthereumClaim: false,
    pendingBuyClaimingEthereumUsdc: false,
    pendingBuyHasEthereumUsdc: false,
    pendingBuyAmount: null,
    error: null,
    firmQuote: null,
    transactionHash: null,
    statusMessage: null,
    authenticated: true,
    blockedTrade: null,
    baseUsdcBalance: 125_000_000n,
    assetBalance: 2_000_000_000_000_000_000n,
    balancesLoading: false,
    balancesError: false,
    ...overrides,
  };
}

vi.mock("@/features/rwas/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/rwas/lib/api")>();
  return { ...original, fetchMarketAssetQuote: mocks.fetchMarketAssetQuote };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function pausedAsset(): MarketAssetDetails {
  return {
    asset: {
      source: "ondo",
      symbol: "MRNAon",
      ticker: "MRNA",
      name: "Moderna",
      iconUrl: "https://cdn.example.com/mrna.png",
      tags: [],
      createdAt: "2026-08-19T17:53:57.655Z",
      tradingPaused: false,
      offHoursTradable: false,
      primaryMarket: {
        priceUsd: "130.201695",
        priceChange24hUsd: "-33.14",
        priceChange24hPercent: "-20.29",
        change24hAvailable: true,
        chartAvailable: false,
        priceHistory24h: [],
      },
      underlyingMarket: null,
      networks: [
        {
          network: "ethereum",
          chainId: 1,
          address: "0xa2c1c0b4683a871187d4565eb63abf9aef5947ee",
          decimals: 18,
          supportsAtomicSwaps: true,
          stablecoins: [],
        },
      ],
      marketDataUpdatedAt: "2026-08-20T18:16:08.000Z",
    },
    detailsAvailable: true,
    providerAssetId: null,
    isin: null,
    underlyingIsin: null,
    tradingHoursMode: null,
    tokenName: "Moderna (Ondo Tokenized)",
    underlyingName: "Moderna Inc",
    description: null,
    networks: [
      {
        network: "ethereum",
        chainId: 1,
        address: "0xa2c1c0b4683a871187d4565eb63abf9aef5947ee",
        decimals: 18,
        supportsAtomicSwaps: true,
        stablecoins: [],
      },
    ],
    tradingStatus: {
      tradeable: false,
      pauseReason: null,
      marketOpen: true,
      currentSession: "OVERNIGHT",
      nextMarketOpen: "2026-08-21T13:00:00.000Z",
      offHoursTradable: false,
    },
    documents: [],
    primaryMarket: {
      priceUsd: "130.201695",
      openUsd: null,
      highUsd: null,
      lowUsd: null,
      closeUsd: null,
      priceChange24hUsd: null,
      priceChange24hPercent: null,
      apyPercent: null,
      fullyDilutedValueUsd: null,
      marketCapUsd: null,
      totalSupply: null,
      circulatingSupply: null,
      tvlUsd: null,
      volume24hUsd: null,
      averageVolume: null,
      sharesMultiplier: "1",
    },
    underlyingMarket: null,
    supportedPaymentMethods: ["USDC"],
    minimumAmountUsd: "1",
    venues: [],
    topHoldings: [],
    dividend: null,
    relatedAssets: [],
    legalNoticeUrl: null,
    sessionLimits: null,
    detailRefreshedAt: "2026-08-20T18:16:08.000Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useRwasTrade.mockReturnValue(tradeState());
  mocks.fetchMarketAssetQuote.mockRejectedValue(new Error("paused"));
});

describe("paused asset purchase panel", () => {
  it("shows available funding and uses the held token for sell percentages", () => {
    render(<PurchasePanel detail={pausedAsset()} />, { wrapper });

    const buyBalance = screen.getByRole("button", { name: "Balance $125.00" });
    expect(buyBalance).toBeInTheDocument();
    fireEvent.click(buyBalance);
    expect(screen.getByRole("textbox", { name: "Amount in USDC" })).toHaveValue("125");

    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    expect(screen.getByRole("button", { name: "Balance 2.00 MRNAon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sell 25% of available MRNAon" })).toHaveTextContent(
      "25%"
    );
    expect(screen.getByRole("button", { name: "Sell 50% of available MRNAon" })).toHaveTextContent(
      "50%"
    );
    expect(screen.getByRole("button", { name: "Sell 100% of available MRNAon" })).toHaveTextContent(
      "Max"
    );

    fireEvent.click(screen.getByRole("button", { name: "Sell 50% of available MRNAon" }));
    expect(screen.getByRole("textbox", { name: "Amount in MRNAon" })).toHaveValue("1");
  });

  it("keeps the indicative quote visible and allows Ethereum secondary execution", async () => {
    render(<PurchasePanel detail={pausedAsset()} />, { wrapper });

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "1" } });

    expect(await screen.findByText("0.00768039 MRNAon")).toBeInTheDocument();
    const buy = screen.getByRole("button", { name: "Buy MRNAon" });
    await waitFor(() => expect(buy).toBeEnabled());
    fireEvent.click(buy);

    expect(mocks.execute).toHaveBeenCalledWith("buy", "1");
    expect(screen.queryByRole("dialog", { name: "Asset Paused" })).not.toBeInTheDocument();
  });

  it("shows the funded buy amount while keeping Sell available", () => {
    mocks.useRwasTrade.mockReturnValue(
      tradeState({
        hasPendingBuy: true,
        pendingBuyAmount: "10",
        baseUsdcBalance: 4_358_084n,
        statusMessage:
          "10 Base USDC has been sent. Waiting for Across to deliver Ethereum USDC before buying IBITon.",
      })
    );

    render(
      <PurchasePanel
        detail={{ ...pausedAsset(), asset: { ...pausedAsset().asset, symbol: "IBITon" } }}
      />,
      {
        wrapper,
      }
    );

    expect(screen.getByRole("textbox", { name: "Amount in USDC" })).toHaveValue("10");
    expect(screen.getByText(/No IBITon has been bought/iu)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Amount in USDC" }), {
      target: { value: "2.5" },
    });
    expect(screen.getByRole("textbox", { name: "Amount in USDC" })).toHaveValue("2.5");
    expect(screen.getByRole("button", { name: "Purchase pending" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Clear pending purchase" }));
    expect(mocks.clearPendingBuy).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    expect(screen.getByRole("heading", { name: "Sell IBITon" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Amount in IBITon" })).toBeEnabled();
  });

  it("exposes the recoverable Circle claim as the primary action", () => {
    mocks.useRwasTrade.mockReturnValue(
      tradeState({
        hasPendingBuy: true,
        pendingBuyNeedsEthereumClaim: true,
        pendingBuyAmount: "1.01",
        baseUsdcBalance: 2_912_517n,
        statusMessage: "Circle confirmed the transfer. Claim the Ethereum USDC to continue.",
      })
    );

    render(
      <PurchasePanel
        detail={{ ...pausedAsset(), asset: { ...pausedAsset().asset, symbol: "IBITon" } }}
      />,
      { wrapper }
    );

    const claim = screen.getByRole("button", { name: "Claim Ethereum USDC" });
    expect(claim).toBeEnabled();
    fireEvent.click(claim);
    expect(mocks.execute).toHaveBeenCalledWith("buy", "1.01");
  });
});
