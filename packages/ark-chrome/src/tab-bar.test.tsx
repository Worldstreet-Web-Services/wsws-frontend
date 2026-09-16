import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ArkTabBar } from "./tab-bar";
import { ArkTabIcons } from "./icons";
import type { ArkTab, ArkTabBarProps, ChromeLinkProps } from "./types";

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} data-host-link="" {...rest}>
      {children}
    </a>
  );
}

// The Square's view of the bar: its own seat is a same-app link, every other
// seat is a page of another app.
const TABS: [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab] = [
  {
    id: "portfolio",
    label: "Home",
    icon: ArkTabIcons.home,
    target: { kind: "document", href: "/portfolio" },
  },
  { id: "market", label: "Market", icon: ArkTabIcons.market, target: { kind: "action" } },
  {
    id: "square",
    label: "Square",
    icon: ArkTabIcons.square,
    target: { kind: "link", href: "/square" },
    ownColour: true,
  },
  {
    id: "casino",
    label: "Arkade",
    icon: ArkTabIcons.arkade,
    target: { kind: "document", href: "/casino" },
  },
  {
    id: "activity",
    label: "Activity",
    icon: ArkTabIcons.activity,
    target: { kind: "document", href: "/activity" },
  },
];

function renderBar(overrides: Partial<ArkTabBarProps> = {}) {
  const props: ArkTabBarProps = {
    tabs: TABS,
    activeId: "square",
    activeLabel: "Square",
    Link: HostLink,
    navLabel: "Primary",
    onSelect: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ArkTabBar {...props} />) };
}

function seatOrder() {
  const nav = screen.getByRole("navigation", { name: "Primary" });
  return [...nav.querySelectorAll("button, a")].map((el) => el.getAttribute("aria-label"));
}

describe("ArkTabBar", () => {
  it("renders five seats in a named nav landmark, with no providers", () => {
    renderBar();
    expect(seatOrder()).toHaveLength(5);
  });

  it("draws each kind of seat as the right element", () => {
    renderBar();
    expect(screen.getByRole("button", { name: "Market" })).toHaveAttribute("type", "button");
    const square = screen.getByRole("link", { name: "Square" });
    expect(square).toHaveAttribute("data-host-link");
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/portfolio");
    expect(home).not.toHaveAttribute("data-host-link");
  });

  it("reports an action seat to the host", () => {
    const onSelect = vi.fn();
    renderBar({ onSelect });
    fireEvent.click(screen.getByRole("button", { name: "Market" }));
    expect(onSelect).toHaveBeenCalledWith(TABS[1]);
  });

  it("rides the active tab into the centre seat and names it under the dome", () => {
    renderBar({ activeId: "casino", activeLabel: "Arkade games" });
    expect(seatOrder()).toEqual(["Home", "Market", "Arkade", "Square", "Activity"]);
    expect(screen.getByRole("link", { name: "Arkade" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Arkade games")).toBeInTheDocument();
  });

  it("falls back to the tab's own label under the dome", () => {
    renderBar({ activeId: "casino", activeLabel: undefined });
    expect(screen.getByText("Arkade")).toBeInTheDocument();
  });

  it("rests in order with no name and no current seat when nothing is active", () => {
    const { container } = renderBar({ activeId: null, activeLabel: null });
    expect(seatOrder()).toEqual(["Home", "Market", "Square", "Arkade", "Activity"]);
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
    expect(container.querySelector(".ark-chrome-tabbar-label")).toBeNull();
    expect(container.querySelector(".ark-chrome-tabbar-glow")).toBeNull();
  });

  // The comp draws the centre seat's glyph larger whether or not a tab is lit
  // there; only its colour depends on being active.
  it("draws the centre seat's icon larger even at rest", () => {
    renderBar({ activeId: null, activeLabel: null });
    const sizes = seatOrder().map((name) =>
      screen
        .getByRole(name === "Market" ? "button" : "link", { name: name ?? "" })
        .querySelector("svg")
        ?.getAttribute("width")
    );
    expect(sizes).toEqual(["23", "23", "26", "23", "23"]);
    const centre = screen.getByRole("link", { name: "Square" }).parentElement;
    expect(centre?.className).not.toContain("ark-chrome-seat--lit");
  });

  it("hides when the host asks", () => {
    const { container } = renderBar({ hidden: true });
    expect(container.querySelector(".ark-chrome-tabbar")).toHaveAttribute("hidden");
  });

  it("moves the tapped cross-app seat to the centre before the page leaves", async () => {
    renderBar();
    fireEvent.click(screen.getByRole("link", { name: "Activity" }), { button: 0 });
    expect(seatOrder()).toEqual(["Home", "Market", "Activity", "Square", "Arkade"]);
    // The old name fades out before the new one fades in.
    expect(await screen.findByText("Activity")).toBeInTheDocument();
    // The page has not changed yet, so the Square is still the current page.
    expect(screen.getByRole("link", { name: "Activity" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Square" })).toHaveAttribute("aria-current", "page");
  });

  it("puts the seats back when the page comes back from the back-forward cache", () => {
    renderBar();
    fireEvent.click(screen.getByRole("link", { name: "Activity" }), { button: 0 });
    const restored = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(restored, "persisted", { value: true });
    act(() => {
      window.dispatchEvent(restored);
    });
    expect(seatOrder()).toEqual(["Home", "Market", "Square", "Arkade", "Activity"]);
  });
});
