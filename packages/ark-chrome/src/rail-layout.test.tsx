import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ArkNavIcons, ArkSidebar } from "./index";
import type { ArkSidebarProps, ChromeLinkProps } from "./types";

// layout="rail": a fixed rail from 768px up and no phone drawer at all. For a
// shell whose phones get around by the tab bar and have no control to open a
// drawer, so a drawer below 768px would be dead weight nobody can reach.

const STYLES = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

const PROPS: ArkSidebarProps = {
  items: [{ id: "spot", label: "Spot", icon: ArkNavIcons.spot, target: { kind: "action" } }],
  activeId: "spot",
  Link: HostLink,
  brand: { target: { kind: "link", href: "/" } },
  person: { status: "loading" },
  layout: "rail",
  labels: { menu: "Menu", closeMenu: "Close menu" },
};

/**
 * A matchMedia whose "(min-width: 768px)" answer the test sets and changes.
 *
 * Any other query answers "does not match" rather than throwing: the logo's
 * motion library asks for (prefers-reduced-motion) once per test process, so a
 * throwing stub failed the whole suite depending on which file rendered the
 * logo first, while every test here still passed.
 */
function stubViewport(wide: boolean) {
  const listeners = new Set<() => void>();
  const state = { wide };
  const matchMedia = (query: string) => {
    if (query !== "(min-width: 768px)") {
      return {
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
      } as unknown as MediaQueryList;
    }
    return {
      get matches() {
        return state.wide;
      },
      media: query,
      addEventListener: (_: "change", listener: () => void) => listeners.add(listener),
      removeEventListener: (_: "change", listener: () => void) => listeners.delete(listener),
    } as unknown as MediaQueryList;
  };
  Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });
  return {
    set(next: boolean) {
      state.wide = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  document.body.style.overflow = "";
});

describe('ArkSidebar layout="rail"', () => {
  it("draws the fixed rail from 768px up, with no backdrop and no close button", () => {
    stubViewport(true);
    const { container } = render(<ArkSidebar {...PROPS} />);
    const aside = screen.getByRole("complementary", { name: "Menu" });
    expect(aside.className).toContain("ark-chrome-aside--rail");
    expect(screen.getByRole("button", { name: "Spot" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".ark-chrome-backdrop")).toBeNull();
    expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
  });

  it("renders no drawer below 768px: no aside, no backdrop, no rows in the document", () => {
    stubViewport(false);
    const { container } = render(<ArkSidebar {...PROPS} />);
    expect(container.innerHTML).toBe("");
    expect(document.getElementById("ark-chrome-sidebar")).toBeNull();
    expect(document.querySelector("[data-ark-nav]")).toBeNull();
  });

  it("follows the viewport across 768px", () => {
    const viewport = stubViewport(true);
    const { container } = render(<ArkSidebar {...PROPS} />);
    expect(container.querySelector("aside")).not.toBeNull();
    viewport.set(false);
    expect(container.querySelector("aside")).toBeNull();
    viewport.set(true);
    expect(container.querySelector("aside")).not.toBeNull();
  });

  it("never locks the page or listens for Escape, since there is no drawer to close", () => {
    stubViewport(true);
    render(<ArkSidebar {...PROPS} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("renders the rail in server HTML, so a desktop page does not wait for hydration to show it", () => {
    const html = renderToString(<ArkSidebar {...PROPS} />);
    expect(html).toContain("ark-chrome-aside--rail");
    expect(html).not.toContain("ark-chrome-backdrop");
  });

  it("keeps that server HTML off a phone's screen until it hydrates and drops it", () => {
    const phone = /@media \(max-width: 767\.98px\)\s*\{([\s\S]*?)\n\}/.exec(STYLES)?.[1] ?? "";
    expect(phone).toMatch(/\.ark-chrome-aside--rail\s*\{\s*display:\s*none;\s*\}/);
  });
});
