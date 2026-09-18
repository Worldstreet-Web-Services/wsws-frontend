import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PerpsMenuDrawer } from "./perps-menu-drawer";

// The perps menu button is the package's ArkDrawerTrigger, the control every
// host renders to open the rail's drawer, drawn exactly as the button perps
// had. perps-menu-drawer.test.tsx covers what it does; this covers that it is
// the package's control, so the guard knows the drawer can be opened.

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    namespace === "topbar" && key === "menu"
      ? "Menu"
      : namespace === "topbar" && key === "closeMenu"
        ? "Close menu"
        : `${namespace}.${key}`,
}));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: null }),
  useLogout: () => ({ logout: vi.fn() }),
  useLinkWithPasskey: () => ({ linkWithPasskey: vi.fn() }),
  getAccessToken: vi.fn(),
  getIdentityToken: vi.fn(),
}));
vi.mock("@/components/broadcast/go-live-control", () => ({
  GoLiveControl: () => <button type="button">Go Live</button>,
}));
vi.mock("@/components/layout/account-popover", () => ({ AccountPopover: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/market-square", () => ({
  MARKET_SQUARE_HIDDEN: true,
  marketSquareHref: () => "https://square.test",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/perps",
}));

function PerpsScreen() {
  const [open, setOpen] = useState(false);
  return <PerpsMenuDrawer open={open} onOpenChange={setOpen} />;
}

let consoleError: MockInstance<typeof console.error>;
const initialWidth = window.innerWidth;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
  consoleError.mockRestore();
  vi.useRealTimers();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: initialWidth });
});

describe("the perps menu button", () => {
  it("is @ark/chrome's drawer trigger for the rail, placed by the perps header", () => {
    render(<PerpsScreen />);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button.className.split(" ")).toEqual(["ark-chrome-drawer-trigger", "mb-4"]);
    expect(button).toHaveAttribute("aria-controls", "app-sidebar");
    expect(document.getElementById("app-sidebar")?.className).toContain("ark-chrome-aside--drawer");
  });

  it("satisfies the drawer contract on a phone, so development reports nothing", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    render(<PerpsScreen />);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(
      consoleError.mock.calls.filter((call) => String(call[0]).includes("drawer contract"))
    ).toEqual([]);
  });
});
