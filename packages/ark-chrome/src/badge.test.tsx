import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ArkSidebar } from "./sidebar";
import { ArkTabBar } from "./tab-bar";
import { ArkNavIcons, ArkTabIcons } from "./icons";
import type { ArkTab, ChromeLinkProps, ChromeNavItem } from "./types";

// A badge is a count the host knows (unread chats, notifications). A count the
// host does not know is null, and nothing may be drawn for it: a fabricated 0
// reads as "nothing new" when the truth is "not loaded".

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

function renderRail(badge: number | null | undefined) {
  const items: ChromeNavItem[] = [
    {
      id: "spot",
      label: "Spot",
      icon: ArkNavIcons.spot,
      target: { kind: "document", href: "/spot" },
    },
    {
      id: "chat",
      label: "Chat",
      icon: ArkNavIcons.square,
      target: { kind: "link", href: "/chat" },
      badge,
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: ArkNavIcons.activity,
      target: { kind: "action" },
      badge,
    },
  ];
  return render(
    <ArkSidebar
      items={items}
      activeId="spot"
      Link={HostLink}
      brand={{ target: { kind: "link", href: "/" } }}
      person={{ status: "loading" }}
      drawer={{ open: false, onClose: vi.fn() }}
      labels={{ menu: "Menu", closeMenu: "Close menu" }}
    />
  );
}

function tabs(badge: number | null | undefined): [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab] {
  return [
    { id: "home", label: "Home", icon: ArkTabIcons.home, target: { kind: "document", href: "/" } },
    { id: "market", label: "Market", icon: ArkTabIcons.market, target: { kind: "action" }, badge },
    {
      id: "square",
      label: "Square",
      icon: ArkTabIcons.square,
      target: { kind: "link", href: "/square" },
      badge,
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
}

function renderBar(badge: number | null | undefined, activeId: string | null = "square") {
  return render(
    <ArkTabBar tabs={tabs(badge)} activeId={activeId} Link={HostLink} navLabel="Primary" />
  );
}

describe("badges on rail rows", () => {
  it.each([
    ["absent", undefined],
    ["null", null],
    ["0", 0],
  ])("draws nothing for a badge that is %s", (_, badge) => {
    const { container } = renderRail(badge);
    expect(container.querySelector(".ark-chrome-badge")).toBeNull();
    // The name is the plain label, as it was before badges existed.
    expect(screen.getByRole("link", { name: "Chat" })).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("button", { name: "Alerts" })).not.toHaveAttribute("aria-label");
  });

  it.each([
    [1, "1"],
    [99, "99"],
    [100, "99+"],
  ])("draws %i as %s, and puts the count in the row's accessible name", (badge, shown) => {
    renderRail(badge);
    const chat = screen.getByRole("link", { name: `Chat, ${shown}` });
    const alerts = screen.getByRole("button", { name: `Alerts, ${shown}` });
    for (const row of [chat, alerts]) {
      const drawn = row.querySelector(".ark-chrome-badge");
      expect(drawn).toHaveTextContent(shown);
      // The row's name already carries the count, so the drawn digits are not
      // read a second time.
      expect(drawn).toHaveAttribute("aria-hidden", "true");
    }
    // A row with no badge is untouched.
    expect(
      screen.getByRole("link", { name: "Spot" }).querySelector(".ark-chrome-badge")
    ).toBeNull();
  });
});

describe("badges on dome seats", () => {
  it.each([
    ["absent", undefined],
    ["null", null],
    ["0", 0],
  ])("draws nothing for a badge that is %s", (_, badge) => {
    const { container } = renderBar(badge);
    expect(container.querySelector(".ark-chrome-seat-badge")).toBeNull();
    expect(screen.getByRole("button", { name: "Market" })).toHaveAttribute("aria-label", "Market");
    expect(screen.getByRole("link", { name: "Square" })).toHaveAttribute("aria-label", "Square");
  });

  it.each([
    [1, "1"],
    [99, "99"],
    [100, "99+"],
  ])("draws %i as %s on action and link seats, named with the count", (badge, shown) => {
    renderBar(badge);
    const market = screen.getByRole("button", { name: `Market, ${shown}` });
    const square = screen.getByRole("link", { name: `Square, ${shown}` });
    for (const seat of [market, square]) {
      const drawn = seat.querySelector(".ark-chrome-seat-badge");
      expect(drawn).toHaveTextContent(shown);
      expect(drawn).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("keeps the name under the dome as the plain label", () => {
    const { container } = renderBar(5);
    expect(container.querySelector(".ark-chrome-tabbar-label")).toHaveTextContent(/^Square$/);
  });

  it("does not move the seats: the seat order, the icon sizes and the seat boxes are unchanged", () => {
    const shape = (badge: number | null) => {
      const { container, unmount } = renderBar(badge, "market");
      const nav = within(container).getByRole("navigation", { name: "Primary" });
      const seats = [...nav.children].map((seat) => ({
        className: seat.className,
        style: (seat as HTMLElement).getAttribute("style"),
        icon: seat.querySelector("svg")?.getAttribute("width"),
      }));
      unmount();
      return seats;
    };
    expect(shape(12)).toEqual(shape(null));
  });

  it("is laid out out of flow, so the seat's icon stays centred", () => {
    const css = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");
    const rule = /\n\.ark-chrome-seat-badge \{([^}]*)\}/.exec(css);
    expect(rule?.[1]).toContain("position: absolute;");
    expect(rule?.[1]).toContain("pointer-events: none;");
  });
});
