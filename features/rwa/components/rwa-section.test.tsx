import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import type { RwaAssetView } from "@/features/rwa/lib/presenter";
import { RwaSection } from "@/features/rwa/components/rwa-section";

const ASSETS = [
  {
    id: "solana:gldx",
    chain: "solana",
    address: "GLDx111",
    symbol: "GLDx",
    name: "Gold ETF xStock",
    issuer: "Backed (xStocks)",
    category: "commodity",
    decimals: 8,
    priceUsd: "403.83",
    market: { priceUsd: 403.83, change24h: 0.26 },
  },
] as unknown as RwaAssetView[];

vi.mock("@/hooks/use-token-logos", () => ({
  useTokenLogos: () => ({}),
  tokenLogoKey: (chain: string, address: string) => `${chain}:${address}`,
}));

vi.mock("@/features/rwa/hooks/use-rwa-assets", () => ({
  useListedRwaAssets: () => ({ assets: ASSETS, loading: false, error: false }),
}));

vi.mock("@/features/rwa/hooks/use-rwa-prices", () => ({
  useRwaEnrichedAssets: (assets: RwaAssetView[]) => assets,
}));

// The voice prefill hook polls window.location on an interval; nothing here
// exercises a spoken trade, so it stays quiet.
vi.mock("@/hooks/use-trade-prefill", () => ({
  useTradePrefill: () => null,
}));

function renderSection(phone: boolean) {
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <RwaSection onOpenDetail={vi.fn()} onOpenConfirm={vi.fn()} phone={phone} />
    </NextIntlClientProvider>
  );
}

describe("RwaSection", () => {
  it("gives the phone list exactly one search field of its own", () => {
    renderSection(true);
    expect(
      screen.getAllByRole("searchbox", { name: enMessages.rwa.searchPlaceholder })
    ).toHaveLength(1);
  });

  it("leaves the desktop table's own search alone, adding no second field", () => {
    renderSection(false);
    // The desktop branch draws RwaAssetList, which already carries its own
    // search input. The phone list's SearchField must not appear alongside it.
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getAllByPlaceholderText(enMessages.rwa.searchPlaceholder)).toHaveLength(1);
  });
});
