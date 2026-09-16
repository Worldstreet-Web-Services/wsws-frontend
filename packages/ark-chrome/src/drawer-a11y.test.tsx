import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArkSidebar } from "./sidebar";
import { ArkNavIcons } from "./icons";
import type { ArkSidebarProps, ChromeLinkProps } from "./types";

// Below 768px the rail is a drawer parked off-canvas. Parked, it must not be
// reachable: no Tab stop and no landmark a screen reader can land on, while
// nothing of it is on screen. jsdom applies a stylesheet's plain rules but
// skips its @media blocks, so with the package's stylesheet loaded it computes
// the phone layout.

const STYLES = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

function props(open: boolean, overrides: Partial<ArkSidebarProps> = {}): ArkSidebarProps {
  return {
    items: [
      {
        id: "spot",
        label: "Spot",
        icon: ArkNavIcons.spot,
        target: { kind: "document", href: "/spot" },
      },
      { id: "square", label: "Square", icon: ArkNavIcons.square, target: { kind: "action" } },
    ],
    activeId: "square",
    Link: HostLink,
    brand: { target: { kind: "document", href: "/portfolio" }, label: "Ark home" },
    person: { status: "signed-in", name: "Ada", avatar: null },
    drawer: { open, onClose: vi.fn() },
    labels: { menu: "Menu", closeMenu: "Close menu" },
    ...overrides,
  };
}

let sheet: HTMLStyleElement;

beforeEach(() => {
  sheet = document.createElement("style");
  sheet.textContent = STYLES;
  document.head.appendChild(sheet);
});

afterEach(() => {
  sheet.remove();
  document.body.style.overflow = "";
});

describe("the phone drawer, for keyboard and screen reader", () => {
  it("is out of the accessibility tree while closed, and back in when opened", () => {
    const { rerender } = render(<ArkSidebar {...props(false)} />);
    const aside = document.getElementById("ark-chrome-sidebar") as HTMLElement;
    expect(getComputedStyle(aside).visibility).toBe("hidden");
    expect(screen.queryByRole("complementary", { name: "Menu" })).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("link", { name: "Spot" })).toBeNull();

    rerender(<ArkSidebar {...props(true)} />);
    expect(getComputedStyle(aside).visibility).toBe("visible");
    expect(screen.getByRole("complementary", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spot" })).toBeInTheDocument();
  });

  it("stays hidden only until the slide out has played", () => {
    // `visibility` in the transition list keeps a closing drawer visible for
    // the slide's duration, then hides it; an opening drawer shows at once.
    const rule = /\.ark-chrome-aside\s*\{([^}]*)\}/.exec(STYLES)?.[1] ?? "";
    expect(rule).toMatch(/transition-property:[^;]*\bvisibility\b/);
  });

  it("keeps the fixed desktop rail visible from 768px up", () => {
    const desktop = /@media \(min-width: 768px\)\s*\{([\s\S]*?)\n\}/.exec(STYLES)?.[1] ?? "";
    const rail = /\.ark-chrome-aside:not\(\.ark-chrome-aside--drawer\)\s*\{([^}]*)\}/.exec(
      desktop
    )?.[1];
    expect(rail).toMatch(/visibility:\s*visible/);
  });

  it("moves focus into the drawer when it opens, and back to the opener when it closes", () => {
    const opener = document.createElement("button");
    opener.textContent = "Open menu";
    document.body.appendChild(opener);
    try {
      opener.focus();
      const { rerender } = render(<ArkSidebar {...props(false)} />);
      expect(document.activeElement).toBe(opener);

      rerender(<ArkSidebar {...props(true)} />);
      const aside = document.getElementById("ark-chrome-sidebar") as HTMLElement;
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close menu" }));

      screen.getByRole("link", { name: "Spot" }).focus();
      rerender(<ArkSidebar {...props(false)} />);
      expect(aside.contains(document.activeElement)).toBe(false);
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });

  it("does not pull focus into a drawer that is not opening", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    try {
      opener.focus();
      const { rerender } = render(<ArkSidebar {...props(false)} />);
      rerender(<ArkSidebar {...props(false)} activeId="spot" />);
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });
});
