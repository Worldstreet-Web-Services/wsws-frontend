import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { PerpsSection } from "@/features/trade/components/perps-section";

// The desk itself is stubbed. This suite is about the section's chrome and its
// wiring, which is all PerpsSection owns: the heading, the gutters, the page
// rhythm around the desk, and (embedded only) which of the list or the ticket
// is on screen. Mounting the real PerpsView/HyperliquidProPerps would drag in
// the Hyperliquid client, the portfolio poller and a TradingView embed, and
// none of them can say anything about what this file itself draws.
vi.mock("@/features/trade/components/perps-view", () => ({
  PerpsView: () => <div data-testid="perps-desk" />,
}));

vi.mock("@/features/trade/components/perp-market-list", () => ({
  PerpMarketList: ({ onSelect }: { onSelect: (symbol: string) => void }) => (
    <div data-testid="perp-market-list">
      <button type="button" onClick={() => onSelect("ETH")}>
        ETH row
      </button>
    </div>
  ),
}));

vi.mock("@/features/trade/components/hyperliquid-pro-perps", () => ({
  HyperliquidProPerps: ({ initialSymbol }: { initialSymbol?: string }) => (
    <div data-testid="perp-ticket">{initialSymbol}</div>
  ),
}));

function renderSection(props: Parameters<typeof PerpsSection>[0] = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PerpsSection {...props} />
    </NextIntlClientProvider>
  );
}

// The outermost element the section draws, which is the one carrying the
// gutters and the width cap.
function sectionRoot(container: HTMLElement): HTMLElement {
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error("PerpsSection rendered nothing");
  return root;
}

describe("PerpsSection", () => {
  describe("standalone, the /perps route", () => {
    it("draws its own heading, gutters and width cap", () => {
      const { container } = renderSection();
      const root = sectionRoot(container);

      expect(screen.getByText(en.sections.perps)).toBeInTheDocument();
      expect(root.className).toContain("p-4");
      expect(root.className).toContain("max-w-[1920px]");
      expect(screen.getByTestId("perps-desk")).toBeInTheDocument();
    });

    // The one hard boundary in the list-first change: this route must not
    // pick up the list, at any width, ever. It still renders straight to
    // PerpsView, exactly as it did before perp-market-list.tsx existed.
    it("never renders the market list or a back control", () => {
      renderSection();

      expect(screen.queryByTestId("perp-market-list")).not.toBeInTheDocument();
      expect(screen.queryByTestId("perp-ticket")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: en.common.back })).not.toBeInTheDocument();
    });
  });

  // The phone Leverage Trading screen (Figma 1:7580 / 1:7701). The market page
  // already draws the MARKET head, the search field and the category tabs, and
  // its own 20px gutters; the comp goes straight from the tab rule to the pair
  // pill with nothing in between. Two things had to go for that to be true.
  describe("embedded in a host that already draws the page chrome", () => {
    it("draws no heading of its own", () => {
      renderSection({ embedded: true });

      // The comp has no eyebrow: the active tab above it already reads
      // "Leverage Trading", and a second label under it says the same thing
      // twice.
      expect(screen.queryByText(en.sections.perps)).not.toBeInTheDocument();
      expect(document.querySelector("[data-eyebrow]")).toBeNull();
    });

    it("adds no horizontal padding of its own", () => {
      const { container } = renderSection({ embedded: true });
      const root = sectionRoot(container);

      // The defect this replaces: `p-4` on top of the market page's own `px-5`
      // measured 36px of gutter at a 402px viewport against the comp's 20px,
      // which took 32px off the width of every card on the screen.
      expect(root.className).not.toMatch(/(^|\s)p-4(\s|$)/);
      expect(root.className).not.toMatch(/(^|\s)px-/);
      expect(root.className).not.toContain("max-w-[1920px]");
    });

    it("opens on the market list, not the ticket", () => {
      renderSection({ embedded: true });
      expect(screen.getByTestId("perp-market-list")).toBeInTheDocument();
      expect(screen.queryByTestId("perp-ticket")).not.toBeInTheDocument();
    });

    it("opens the tapped row's ticket, with a back control, and hides (not unmounts) the list", () => {
      renderSection({ embedded: true });

      fireEvent.click(screen.getByRole("button", { name: "ETH row" }));

      expect(screen.getByTestId("perp-ticket")).toHaveTextContent("ETH");
      const list = screen.getByTestId("perp-market-list");
      // Hidden, not gone: the same DOM node holds the scroll offset restored
      // on the way back out.
      expect(list.closest("[hidden]")).not.toBeNull();
      expect(screen.getByRole("button", { name: en.common.back })).toBeInTheDocument();
    });

    it("back returns to the list and restores its scroll offset", () => {
      renderSection({ embedded: true });

      const listScrollParent = screen.getByTestId("perp-market-list").parentElement as HTMLElement;
      listScrollParent.scrollTop = 240;

      fireEvent.click(screen.getByRole("button", { name: "ETH row" }));
      fireEvent.click(screen.getByRole("button", { name: en.common.back }));

      expect(screen.queryByTestId("perp-ticket")).not.toBeInTheDocument();
      expect(screen.getByTestId("perp-market-list")).toBeInTheDocument();
      expect(listScrollParent.scrollTop).toBe(240);
    });
  });
});
