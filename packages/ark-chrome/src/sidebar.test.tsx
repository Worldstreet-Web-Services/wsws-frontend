import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ArkSidebar } from "./sidebar";
import { ArkTabBar } from "./tab-bar";
import { ArkNavIcons, ArkTabIcons } from "./icons";
import type {
  AccountMenuProps,
  ArkSidebarProps,
  ArkTab,
  ChromeLinkProps,
  ChromeNavItem,
} from "./types";

// Nothing here mounts a provider, a router or a message catalogue: the package
// must render from props alone, because the Square has none of WSWS's.

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} data-host-link="" {...rest}>
      {children}
    </a>
  );
}

function PrefetchLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} data-prefetch-link="" {...rest}>
      {children}
    </a>
  );
}

const ITEMS: ChromeNavItem[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    icon: ArkNavIcons.portfolio,
    target: { kind: "action", href: "/portfolio" },
    dataAttributes: { "data-tour-nav": "portfolio" },
  },
  {
    id: "spot",
    label: "Spot",
    icon: ArkNavIcons.spot,
    target: { kind: "document", href: "/spot" },
  },
  {
    id: "market",
    label: "Market",
    icon: ArkNavIcons.perps,
    target: { kind: "document", href: "/market", prefetch: true },
  },
  {
    id: "square",
    label: "Square",
    icon: ArkNavIcons.square,
    target: { kind: "link", href: "/square" },
  },
];

function renderRail(overrides: Partial<ArkSidebarProps> = {}) {
  const props: ArkSidebarProps = {
    items: ITEMS,
    activeId: "square",
    Link: HostLink,
    DocumentLink: PrefetchLink,
    brand: { target: { kind: "document", href: "/portfolio" }, label: "Ark home" },
    person: { status: "signed-in", name: "Ada", avatar: <span data-testid="avatar" /> },
    drawer: { open: false, onClose: vi.fn() },
    labels: { menu: "Menu", closeMenu: "Close menu" },
    ...overrides,
  };
  return { props, ...render(<ArkSidebar {...props} />) };
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("ArkSidebar", () => {
  it("renders with no providers, as a labelled rail holding a nav landmark", () => {
    renderRail();
    const aside = screen.getByRole("complementary", { name: "Menu" });
    expect(aside).toHaveAttribute("id", "ark-chrome-sidebar");
    expect(within(aside).getByRole("navigation")).toBeInTheDocument();
  });

  it("renders an action as a button that reports to the host, then closes the drawer", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderRail({ onSelect, drawer: { open: true, onClose } });
    const row = screen.getByRole("button", { name: "Portfolio" });
    expect(row).toHaveAttribute("type", "button");
    expect(row).toHaveAttribute("data-tour-nav", "portfolio");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(ITEMS[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a same-app item through the injected link component", () => {
    renderRail();
    const row = screen.getByRole("link", { name: "Square" });
    expect(row).toHaveAttribute("href", "/square");
    expect(row).toHaveAttribute("data-host-link");
  });

  it("renders a cross-app item as a plain anchor, never the host's link", () => {
    renderRail();
    const row = screen.getByRole("link", { name: "Spot" });
    expect(row.tagName).toBe("A");
    expect(row).toHaveAttribute("href", "/spot");
    expect(row).not.toHaveAttribute("data-host-link");
    expect(row).not.toHaveAttribute("data-prefetch-link");
  });

  it("hands a cross-app item that asks for prefetch to the host's document link", () => {
    renderRail();
    const row = screen.getByRole("link", { name: "Market" });
    expect(row).toHaveAttribute("data-prefetch-link");
    expect(row).not.toHaveAttribute("data-host-link");
  });

  it("falls back to a plain anchor for prefetch when the host passed no document link", () => {
    renderRail({ DocumentLink: undefined });
    const row = screen.getByRole("link", { name: "Market" });
    expect(row).toHaveAttribute("href", "/market");
    expect(row).not.toHaveAttribute("data-prefetch-link");
  });

  it("marks only the active item as the current page", () => {
    const { container } = renderRail();
    expect(screen.getByRole("link", { name: "Square" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("marks nothing when no item is active", () => {
    const { container } = renderRail({ activeId: null });
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
    expect(container.querySelector(".ark-chrome-row--active")).toBeNull();
  });

  it("keeps the rows as the nav's direct children, in order", () => {
    renderRail();
    const nav = screen.getByRole("navigation");
    expect([...nav.children].map((el) => el.textContent)).toEqual([
      "Portfolio",
      "Spot",
      "Market",
      "Square",
    ]);
  });

  it("appends the host's marker classes without replacing its own", () => {
    renderRail({
      classNames: { row: "host-row", rowActive: "host-on", rowIdle: "host-off", nav: "host-nav" },
    });
    const active = screen.getByRole("link", { name: "Square" });
    expect(active.className).toContain("ark-chrome-row");
    expect(active.className).toContain("host-row");
    expect(active.className).toContain("host-on");
    expect(screen.getByRole("button", { name: "Portfolio" }).className).toContain("host-off");
    expect(screen.getByRole("navigation").className).toContain("host-nav");
  });

  it("links the brand lockup with its label", () => {
    renderRail();
    const brand = screen.getByRole("link", { name: "Ark home" });
    expect(brand).toHaveAttribute("href", "/portfolio");
  });

  describe("the Go Live slot", () => {
    it("draws a Go Live button that reports presses", () => {
      const onPress = vi.fn();
      renderRail({ goLive: { label: "Go Live", onPress } });
      fireEvent.click(screen.getByRole("button", { name: "Go Live" }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("lets a host control take the slot instead", () => {
      renderRail({
        goLive: { label: "Go Live", onPress: vi.fn() },
        primaryAction: <button type="button">Host live</button>,
      });
      expect(screen.getByRole("button", { name: "Host live" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Go Live" })).toBeNull();
    });
  });

  describe("the person in the footer", () => {
    it("names a signed-in person and opens the host's menu", () => {
      const seen = vi.fn<(props: AccountMenuProps) => void>();
      function AccountMenu(props: AccountMenuProps) {
        seen(props);
        return props.open ? <div role="menu">Account menu</div> : null;
      }
      renderRail({ AccountMenu });
      const button = screen.getByRole("button", { name: /Ada/ });
      expect(screen.getByTestId("avatar")).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("menu")).toHaveTextContent("Account menu");
      const menu = seen.mock.calls.at(-1)?.[0];
      expect(menu?.triggerRef.current).toBe(button);
      act(() => menu?.onClose());
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("reports a press to the host when it draws no menu", () => {
      const onProfilePress = vi.fn();
      renderRail({ onProfilePress });
      const button = screen.getByRole("button", { name: /Ada/ });
      expect(button).not.toHaveAttribute("aria-haspopup");
      fireEvent.click(button);
      expect(onProfilePress).toHaveBeenCalledTimes(1);
    });

    it("offers sign-in to a signed-out reader", () => {
      const onSignIn = vi.fn();
      renderRail({ person: { status: "signed-out", signInLabel: "Sign in", onSignIn } });
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      expect(onSignIn).toHaveBeenCalledTimes(1);
    });

    it("holds the footer's place while the host does not know yet", () => {
      const { container } = renderRail({ person: { status: "loading" } });
      const footer = container.querySelector(".ark-chrome-footer");
      expect(footer).toHaveAttribute("aria-busy", "true");
      expect(within(footer as HTMLElement).queryByRole("button")).toBeNull();
    });
  });

  describe("the drawer", () => {
    it("locks the page and closes on Escape while open", () => {
      const onClose = vi.fn();
      renderRail({ drawer: { open: true, onClose } });
      expect(document.body.style.overflow).toBe("hidden");
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("leaves the page alone while closed", () => {
      const onClose = vi.fn();
      renderRail({ drawer: { open: false, onClose } });
      expect(document.body.style.overflow).toBe("");
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes from the backdrop and the close button", () => {
      const onClose = vi.fn();
      const { container } = renderRail({ drawer: { open: true, onClose } });
      fireEvent.click(container.querySelector(".ark-chrome-backdrop") as Element);
      fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("puts the host's open and closed markers on the aside from its own drawer state", () => {
      const classNames = { asideOpen: "host-open", asideClosed: "host-closed" };
      const { container, rerender, props } = renderRail({
        classNames,
        drawer: { open: false, onClose: vi.fn() },
      });
      const aside = container.querySelector(".ark-chrome-aside") as HTMLElement;
      expect(aside.classList.contains("host-closed")).toBe(true);
      expect(aside.classList.contains("host-open")).toBe(false);
      expect(aside).not.toHaveAttribute("data-open");
      rerender(<ArkSidebar {...props} drawer={{ open: true, onClose: vi.fn() }} />);
      expect(aside.classList.contains("host-open")).toBe(true);
      expect(aside.classList.contains("host-closed")).toBe(false);
      expect(aside).toHaveAttribute("data-open");
    });

    it("stays a drawer at every width when asked", () => {
      const { container } = renderRail({ layout: "drawer" });
      expect(container.querySelector(".ark-chrome-aside")?.className).toContain(
        "ark-chrome-aside--drawer"
      );
      expect(container.querySelector(".ark-chrome-backdrop")?.className).toContain(
        "ark-chrome-backdrop--drawer"
      );
    });

    it("says whether it is open", () => {
      const { container, rerender, props } = renderRail({
        drawer: { open: false, onClose: vi.fn() },
      });
      const aside = container.querySelector(".ark-chrome-aside");
      expect(aside).not.toHaveAttribute("data-open");
      rerender(<ArkSidebar {...props} drawer={{ open: true, onClose: vi.fn() }} />);
      expect(aside).toHaveAttribute("data-open");
    });
  });

  describe("crossing to another app", () => {
    it("lights the destination on a plain click, without claiming it is the current page", () => {
      renderRail();
      const spot = screen.getByRole("link", { name: "Spot" });
      fireEvent.click(spot, { button: 0 });
      expect(spot.className).toContain("ark-chrome-row--active");
      expect(spot).toHaveAttribute("data-ark-pending");
      expect(spot).not.toHaveAttribute("aria-current");
      expect(screen.getByRole("link", { name: "Square" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: "Square" }).className).not.toContain(
        "ark-chrome-row--active"
      );
    });

    it("leaves the rail alone for a click that opens a new tab", () => {
      renderRail();
      const spot = screen.getByRole("link", { name: "Spot" });
      fireEvent.click(spot, { button: 0, metaKey: true });
      fireEvent.click(spot, { button: 0, ctrlKey: true });
      fireEvent.click(spot, { button: 1 });
      expect(spot).not.toHaveAttribute("data-ark-pending");
    });

    it("marks a crossing that is taking a while as busy", () => {
      vi.useFakeTimers();
      try {
        renderRail();
        const spot = screen.getByRole("link", { name: "Spot" });
        fireEvent.click(spot, { button: 0 });
        expect(spot).not.toHaveAttribute("aria-busy");
        act(() => {
          vi.advanceTimersByTime(300);
        });
        expect(spot).toHaveAttribute("aria-busy", "true");
      } finally {
        vi.useRealTimers();
      }
    });

    // A crossing can be cancelled with no event to say so: Stop, "Stay" on a
    // leave prompt, a download or a 204. The old page stays, so after a while
    // the rail must give the highlight back to the page it is on.
    it("gives up on a crossing that never lands", () => {
      vi.useFakeTimers();
      try {
        renderRail();
        const spot = screen.getByRole("link", { name: "Spot" });
        const square = screen.getByRole("link", { name: "Square" });
        fireEvent.click(spot, { button: 0 });
        act(() => {
          vi.advanceTimersByTime(10_000);
        });
        expect(spot).not.toHaveAttribute("data-ark-pending");
        expect(spot).not.toHaveAttribute("aria-busy");
        expect(spot.className).not.toContain("ark-chrome-row--active");
        expect(square.className).toContain("ark-chrome-row--active");
        expect(square).toHaveAttribute("aria-current", "page");
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps a crossing lit while it is still plausibly loading", () => {
      vi.useFakeTimers();
      try {
        renderRail();
        const spot = screen.getByRole("link", { name: "Spot" });
        fireEvent.click(spot, { button: 0 });
        act(() => {
          vi.advanceTimersByTime(5_000);
        });
        expect(spot).toHaveAttribute("data-ark-pending");
        expect(spot).toHaveAttribute("aria-busy", "true");
      } finally {
        vi.useRealTimers();
      }
    });

    it("forgets the destination when the host reports a new active item", () => {
      const { rerender, props } = renderRail();
      fireEvent.click(screen.getByRole("link", { name: "Spot" }), { button: 0 });
      rerender(<ArkSidebar {...props} activeId="portfolio" />);
      expect(screen.getByRole("link", { name: "Spot" })).not.toHaveAttribute("data-ark-pending");
      expect(screen.getByRole("button", { name: "Portfolio" })).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("forgets the destination when the page comes back from the back-forward cache", () => {
      renderRail();
      const spot = screen.getByRole("link", { name: "Spot" });
      fireEvent.click(spot, { button: 0 });
      const restored = new Event("pageshow") as PageTransitionEvent;
      Object.defineProperty(restored, "persisted", { value: true });
      act(() => {
        window.dispatchEvent(restored);
      });
      expect(spot).not.toHaveAttribute("data-ark-pending");
      expect(spot.className).not.toContain("ark-chrome-row--active");
    });
  });
});

describe("both pieces mounted together", () => {
  it("never repeats an element id", () => {
    const tabs: [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab] = [
      { id: "portfolio", label: "Home", icon: ArkTabIcons.home, target: { kind: "action" } },
      { id: "market", label: "Market", icon: ArkTabIcons.market, target: { kind: "action" } },
      {
        id: "square",
        label: "Square",
        icon: ArkTabIcons.square,
        target: { kind: "action" },
        ownColour: true,
      },
      { id: "casino", label: "Arkade", icon: ArkTabIcons.arkade, target: { kind: "action" } },
      { id: "activity", label: "Activity", icon: ArkTabIcons.activity, target: { kind: "action" } },
    ];
    const { container } = render(
      <>
        <ArkSidebar
          items={ITEMS}
          activeId="square"
          Link={HostLink}
          brand={{ target: { kind: "link", href: "/portfolio" } }}
          person={{ status: "signed-in", name: "Ada", avatar: null }}
          drawer={{ open: false, onClose: () => {} }}
          labels={{ menu: "Menu", closeMenu: "Close menu" }}
        />
        <ArkTabBar
          tabs={tabs}
          activeId="square"
          Link={HostLink}
          navLabel="Primary"
          onSelect={() => {}}
        />
      </>
    );
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    // Every url(#id) reference resolves to an element in this document.
    const refs = [...container.querySelectorAll("[fill^='url(#'], [clip-path^='url(#']")].map(
      (el) => (el.getAttribute("fill") ?? el.getAttribute("clip-path") ?? "").slice(5, -1)
    );
    for (const ref of refs) expect(ids).toContain(ref);
  });
});
