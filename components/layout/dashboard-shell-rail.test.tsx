import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { buildNav } from "./nav-items";

// The dashboard shell has no phone drawer: phones get around by the tab bar,
// and the top bar's avatar opens the account sheet, not a menu. So the shell
// draws the rail with @ark/chrome's "rail" layout, which renders no drawer
// below 768px, rather than a drawer nothing on the page can open.

const MESSAGES: Record<string, string> = {
  "topbar.menu": "Menu",
  "topbar.closeMenu": "Close menu",
  "square.navLabel": "Square",
};
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    MESSAGES[`${namespace}.${key}`] ?? `${namespace}.${key}`,
}));
vi.mock("@privy-io/react-auth", () => ({ usePrivy: () => ({ user: null }) }));
vi.mock("@/components/broadcast/go-live-control", () => ({
  GoLiveControl: () => <button type="button">Go Live</button>,
}));
vi.mock("@/components/layout/account-popover", () => ({ AccountPopover: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/market-square", () => ({
  MARKET_SQUARE_HIDDEN: false,
  marketSquareHref: () => "https://square.test",
}));

// The shell's other neighbours are not under test here.
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/layout/topbar", () => ({
  Topbar: () => <header data-testid="topbar" />,
}));
vi.mock("@/components/layout/modals/account-modal", () => ({ AccountModal: () => null }));
vi.mock("@/components/layout/connection-banner", () => ({ ConnectionBanner: () => null }));
vi.mock("@/components/layout/support-button", () => ({ SupportButton: () => null }));
vi.mock("@/components/broadcast/broadcast-dock", () => ({ BroadcastDock: () => null }));
vi.mock("@/components/ui/modal-shell", () => ({
  ModalShell: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? children : null,
}));
vi.mock("@/features/portfolio/components/portfolio-fab", () => ({ PortfolioFab: () => null }));
vi.mock("@/features/referrals", () => ({
  InviteFriendsModal: () => null,
  useClaimReferralFromLink: () => {},
}));
vi.mock("@/hooks/use-catalog-prefetch", () => ({ usePrefetchDepositCatalog: () => {} }));
vi.mock("@/hooks/use-app-navigate", () => ({ useAppNavigate: () => vi.fn() }));
vi.mock("@/lib/known-user", () => ({ markKnownUser: () => {} }));

const { DashboardShell } = await import("./dashboard-shell");

/** A matchMedia answering "(min-width: 768px)" with the given width class. */
function stubViewport(wide: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) =>
      ({
        matches: query === "(min-width: 768px)" ? wide : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  });
}

let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  consoleError.mockRestore();
  vi.useRealTimers();
});

function shell() {
  return (
    <DashboardShell nav={buildNav(null)} activeSection="spot">
      <p>page</p>
    </DashboardShell>
  );
}

describe("the dashboard shell's rail", () => {
  it("is the fixed rail from 768px up, with no drawer backdrop and no close button", () => {
    stubViewport(true);
    const { container } = render(shell());
    const aside = container.querySelector("#app-sidebar");
    expect(aside?.className).toContain("ark-chrome-aside--rail");
    expect(screen.getByRole("button", { name: "Spot" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".ark-chrome-backdrop")).toBeNull();
    expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
  });

  it("renders no drawer on a phone, and so reports no orphaned drawer", () => {
    vi.useFakeTimers();
    stubViewport(false);
    const { container } = render(shell());
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(container.querySelector("#app-sidebar")).toBeNull();
    expect(container.querySelector(".ark-chrome-backdrop")).toBeNull();
    expect(screen.getByTestId("topbar")).toBeInTheDocument();
    expect(
      consoleError.mock.calls.filter((call) => String(call[0]).includes("drawer contract"))
    ).toEqual([]);
  });
});
