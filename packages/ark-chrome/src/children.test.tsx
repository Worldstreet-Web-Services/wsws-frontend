import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ArkSidebar } from "./sidebar";
import { ArkNavIcons, ArkTabIcons } from "./icons";
import type { ArkSidebarProps, ChromeLinkProps, ChromeNavItem } from "./types";

// A section with pages of its own (the Square: Home, Explore, Pals, Chat,
// Notifications) lists them under its row while the reader is in it. They are
// ordinary items: each has its own target, badge and current state.

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} data-host-link="" {...rest}>
      {children}
    </a>
  );
}

const SQUARE_PAGES: ChromeNavItem[] = [
  {
    id: "sq-home",
    label: "Home",
    icon: ArkTabIcons.home,
    target: { kind: "link", href: "/square" },
  },
  {
    id: "sq-explore",
    label: "Explore",
    icon: ArkTabIcons.market,
    target: { kind: "document", href: "/explore" },
  },
  { id: "sq-chat", label: "Chat", icon: ArkNavIcons.square, target: { kind: "action" }, badge: 4 },
];

const ITEMS: ChromeNavItem[] = [
  {
    id: "spot",
    label: "Spot",
    icon: ArkNavIcons.spot,
    target: { kind: "document", href: "/spot" },
  },
  {
    id: "square",
    label: "Square",
    icon: ArkNavIcons.square,
    target: { kind: "link", href: "/square" },
    children: SQUARE_PAGES,
  },
  {
    id: "casino",
    label: "Arkade",
    icon: ArkNavIcons.casino,
    target: { kind: "document", href: "/casino" },
  },
];

function renderRail(overrides: Partial<ArkSidebarProps> = {}) {
  const props: ArkSidebarProps = {
    items: ITEMS,
    activeId: "square",
    Link: HostLink,
    brand: { target: { kind: "link", href: "/" } },
    person: { status: "loading" },
    drawer: { open: false, onClose: vi.fn() },
    labels: { menu: "Menu", closeMenu: "Close menu" },
    ...overrides,
  };
  return render(<ArkSidebar {...props} />);
}

/** The names of the nav's focusable controls, in document (and so Tab) order. */
function tabOrder(container: HTMLElement): string[] {
  const nav = within(container).getByRole("navigation");
  return [...nav.querySelectorAll<HTMLElement>("a[href], button")]
    .filter((el) => el.tabIndex >= 0)
    .map((el) => el.getAttribute("aria-label") ?? el.textContent ?? "");
}

describe("an item's children in the rail", () => {
  it("are not rendered while their item is not active", () => {
    const { container } = renderRail({ activeId: "spot" });
    expect(screen.queryByRole("list", { name: "Square" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
    expect(container.querySelector("[data-ark-nav='sq-home']")).toBeNull();
  });

  it("are listed under their item's row, and only there, while it is active", () => {
    const { container } = renderRail({ activeId: "square" });
    const list = screen.getByRole("list", { name: "Square" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    // Directly after the Square row and before the next one.
    const squareRow = screen.getByRole("link", { name: "Square" });
    expect(squareRow.nextElementSibling).toBe(list);
    expect(list.nextElementSibling).toBe(screen.getByRole("link", { name: "Arkade" }));
    expect(tabOrder(container)).toEqual(["Spot", "Square", "Home", "Explore", "Chat, 4", "Arkade"]);
    // The section is the current page; none of its children is.
    expect(squareRow).toHaveAttribute("aria-current", "page");
    expect(within(list).queryAllByRole("link", { current: "page" })).toHaveLength(0);
  });

  it("marks a child as the current page, and keeps its item lit and its list open", () => {
    const { container } = renderRail({ activeId: "sq-home" });
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(home.className).toContain("ark-chrome-row--active");
    const squareRow = screen.getByRole("link", { name: "Square" });
    expect(squareRow.className).toContain("ark-chrome-row--active");
    expect(squareRow).not.toHaveAttribute("aria-current");
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Explore" }).className).not.toContain(
      "ark-chrome-row--active"
    );
  });

  it("render each child through its own target", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderRail({ activeId: "square", onSelect, drawer: { open: true, onClose } });

    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/square");
    expect(home).toHaveAttribute("data-host-link");

    const explore = screen.getByRole("link", { name: "Explore" });
    expect(explore).toHaveAttribute("href", "/explore");
    expect(explore).not.toHaveAttribute("data-host-link");

    const chat = screen.getByRole("button", { name: "Chat, 4" });
    expect(chat).toHaveAttribute("type", "button");
    expect(chat).toHaveAttribute("data-ark-nav", "sq-chat");
    fireEvent.click(chat);
    expect(onSelect).toHaveBeenCalledWith(SQUARE_PAGES[2]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("draw a child's badge", () => {
    renderRail({ activeId: "square" });
    const chat = screen.getByRole("button", { name: "Chat, 4" });
    expect(chat.querySelector(".ark-chrome-badge")).toHaveTextContent("4");
  });

  it("light a cross-app child at the click, while the old page waits", () => {
    renderRail({ activeId: "sq-home" });
    fireEvent.click(screen.getByRole("link", { name: "Explore" }), { button: 0 });
    const explore = screen.getByRole("link", { name: "Explore" });
    expect(explore.className).toContain("ark-chrome-row--active");
    expect(explore).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("list", { name: "Square" })).toBeInTheDocument();
  });

  it("are listed in the drawer too", () => {
    renderRail({ activeId: "square", layout: "drawer", drawer: { open: true, onClose: vi.fn() } });
    const aside = screen.getByRole("complementary", { name: "Menu" });
    expect(within(aside).getByRole("list", { name: "Square" })).toBeInTheDocument();
    expect(within(aside).getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("leave a rail with no children exactly as it was: one element per item, no list", () => {
    const flat = ITEMS.map((item) => ({ ...item, children: undefined }));
    const { container } = renderRail({ items: flat, activeId: "square" });
    const nav = within(container).getByRole("navigation");
    expect(nav.children).toHaveLength(flat.length);
    expect(nav.querySelector("ul, li")).toBeNull();
  });
});
