import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { buildNav } from "./nav-items";

// The rail and the tab bar are drawn by @ark/chrome, the package the Square
// installs, so the two apps cannot drift. These adapters only feed it WSWS's
// data. What is asserted here is that the package really draws them, and that
// the WSWS-only hooks survive the move: the rail keeps the id the perps drawer
// points at, and the product tour's data attributes.

const MESSAGES: Record<string, string> = {
  "topbar.menu": "Menu",
  "topbar.closeMenu": "Close menu",
  "square.navLabel": "Square",
};
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    MESSAGES[`${namespace}.${key}`] ?? `${namespace}.${key}`,
}));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: null }),
}));
vi.mock("@/components/broadcast/go-live-control", () => ({
  GoLiveControl: () => <button type="button">Go Live</button>,
}));
vi.mock("@/components/layout/account-popover", () => ({
  AccountPopover: ({ open }: { open: boolean }) => (open ? <div role="menu">Account</div> : null),
}));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/market-square", () => ({
  MARKET_SQUARE_HIDDEN: false,
  marketSquareHref: () => "https://square.test",
}));

const { Sidebar } = await import("./sidebar");
const { CurvedTabBar } = await import("./curved-tab-bar");

describe("WSWS chrome through @ark/chrome", () => {
  it("draws the rail with the package, under the id the perps drawer controls", () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <Sidebar
        items={buildNav(null)}
        activeSection="spot"
        onNavigate={onNavigate}
        open={false}
        onClose={() => {}}
      />
    );
    const aside = container.querySelector("#app-sidebar");
    expect(aside?.className).toContain("ark-chrome-aside");
    const spot = screen.getByRole("button", { name: "Spot" });
    expect(spot).toHaveAttribute("aria-current", "page");
    expect(spot).toHaveAttribute("data-tour-nav", "spot");
    fireEvent.click(spot);
    expect(onNavigate).toHaveBeenCalledWith("spot");
    expect(screen.getByRole("link", { name: "Square" })).toHaveAttribute("data-tour-nav", "square");
  });

  it("keeps the account popover and the tour's profile hook on the footer", () => {
    render(
      <Sidebar
        items={buildNav(null)}
        activeSection="spot"
        onNavigate={() => {}}
        open={false}
        onClose={() => {}}
      />
    );
    const profile = document.querySelector('[data-tour="profile"]');
    expect(profile).not.toBeNull();
    fireEvent.click(profile as Element);
    expect(screen.getByRole("menu")).toHaveTextContent("Account");
  });

  it("stays a drawer at every width on the perps screen", () => {
    const { container } = render(
      <Sidebar
        items={buildNav(null)}
        activeSection="perps"
        onNavigate={() => {}}
        open={false}
        onClose={() => {}}
        drawerAtEveryWidth
      />
    );
    expect(container.querySelector("#app-sidebar")?.className).toContain(
      "ark-chrome-aside--drawer"
    );
  });

  it("draws the tab bar with the package", () => {
    const { container } = render(
      <CurvedTabBar items={buildNav(null)} activeSection="portfolio" onNavigate={() => {}} />
    );
    expect(container.querySelector(".ark-chrome-tabbar")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });
});
