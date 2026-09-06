import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Sidebar } from "./sidebar";
import type { NavItem } from "./nav-items";

// The rail's own markup is what is under test, so its neighbours are stubbed:
// labels come from a provider, the profile from Privy, and next/link from a
// router that no test mounts.
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@privy-io/react-auth", () => ({ usePrivy: () => ({ user: null }) }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/market-square", () => ({
  MARKET_SQUARE_HIDDEN: true,
  marketSquareHref: () => "https://square.test",
}));

const PORTFOLIO: NavItem = { id: "portfolio", label: "Portfolio", icon: () => null };
const SPOT: NavItem = { id: "spot", label: "Spot", icon: () => null };
// Earn is the one section the Market design leaves out, so it is the case that
// has to fall back to the section's own icon rather than an exported glyph.
const EARN: NavItem = { id: "earn", label: "Earn", icon: () => <svg data-testid="earn-icon" /> };

function renderSidebar(items: NavItem[] = [PORTFOLIO], activeSection: NavItem["id"] = "portfolio") {
  return render(
    <Sidebar
      items={items}
      activeSection={activeSection}
      onNavigate={() => {}}
      onOpenAccount={() => {}}
      open={false}
      onClose={() => {}}
    />
  );
}

describe("Sidebar", () => {
  /**
   * Market Square is hidden from the product for now. The switch is a
   * constant rather than an environment variable, so a deployment that has
   * the square's URL configured, which every real one does, must still show
   * no way in from the rail.
   */
  it("offers no Market Square entry while the square is hidden", () => {
    renderSidebar();
    expect(screen.queryByRole("link", { name: /market square/i })).toBeNull();
    // The rest of the rail is untouched by the hide.
    expect(screen.getByRole("button", { name: "Portfolio" })).toBeInTheDocument();
  });

  it("puts the entry back above the sections when the square is shown again", async () => {
    vi.resetModules();
    vi.doMock("@/lib/market-square", () => ({
      MARKET_SQUARE_HIDDEN: false,
      marketSquareHref: () => "https://square.test",
    }));
    const { Sidebar: Shown } = await import("./sidebar");
    render(
      <Shown
        items={[PORTFOLIO]}
        activeSection="portfolio"
        onNavigate={() => {}}
        onOpenAccount={() => {}}
        open={false}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole("link", { name: /market square/i })).toHaveAttribute(
      "href",
      "https://square.test"
    );
  });

  /**
   * The rail draws each nav glyph from the SVG the design file exports, not
   * from the section's own icon component, so the two must not drift.
   */
  it("draws each nav row from the design's exported glyph", () => {
    const { container } = renderSidebar([PORTFOLIO, SPOT]);
    const sources = [...container.querySelectorAll("nav img")].map((img) =>
      img.getAttribute("src")
    );
    expect(sources).toEqual([
      "/market/sidebar-icon-portfolio.svg",
      "/market/sidebar-icon-spot.svg",
    ]);
  });

  /**
   * The exported glyphs are state-neutral, so brightness is the rail's job: the
   * selected row's glyph burns full strength and every other one sits at the
   * design's 60% wash. Checked from both ends, because the earlier version of
   * this rail dimmed by filename and left a selected Spot permanently grey.
   */
  it("burns the active row's glyph at full strength and dims the rest", () => {
    const onSpot = renderSidebar([PORTFOLIO, SPOT], "spot");
    const [portfolio, spot] = [...onSpot.container.querySelectorAll("nav img")].map(
      (img) => img.parentElement
    );
    expect(portfolio?.className).toContain("opacity-60");
    expect(spot?.className).not.toContain("opacity-60");

    cleanup();

    const onPortfolio = renderSidebar([PORTFOLIO, SPOT], "portfolio");
    const [activePortfolio, idleSpot] = [...onPortfolio.container.querySelectorAll("nav img")].map(
      (img) => img.parentElement
    );
    expect(activePortfolio?.className).not.toContain("opacity-60");
    expect(idleSpot?.className).toContain("opacity-60");
  });

  it("falls back to the section's own icon where the design has no glyph", () => {
    const { container } = renderSidebar([EARN]);
    expect(container.querySelector("nav img")).toBeNull();
    expect(screen.getByTestId("earn-icon")).toBeInTheDocument();
  });
});
