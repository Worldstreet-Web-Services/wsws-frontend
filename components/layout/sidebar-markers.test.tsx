import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ArkSidebarProps } from "@ark/chrome";
import { buildNav } from "./nav-items";

// The rail's older suites (sidebar.test.tsx, perps-menu-drawer.test.tsx) read
// Tailwind class names off the rail: -translate-x-full and translate-x-0 on the
// aside, bg-accent/14 on the lit row, fixed inset-0 on the backdrop, min-h-0
// and overflow-y-auto on the nav, mt-auto on the footer. @ark/chrome draws none
// of those: it slides the drawer on [data-open], lights a row with
// .ark-chrome-row--active, and lays out with its own unlayered stylesheet. The
// names survive as markers, and a marker only guards the rail if it sits
// exactly where the package's real state and styles are. This suite holds
// that, with the package's stylesheet loaded, so the older suites keep failing
// when the drawing itself breaks.

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
  AccountPopover: () => null,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/market-square", () => ({
  MARKET_SQUARE_HIDDEN: false,
  marketSquareHref: () => "https://square.test",
}));

// The props the adapter hands the package, render by render.
const seen = vi.hoisted(() => ({ props: [] as ArkSidebarProps[] }));
vi.mock("@ark/chrome", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ark/chrome")>();
  return {
    ...actual,
    ArkSidebar: (props: ArkSidebarProps) => {
      seen.props.push(props);
      return <actual.ArkSidebar {...props} />;
    },
  };
});

const { Sidebar } = await import("./sidebar");

const STYLES = readFileSync(
  join(import.meta.dirname, "../../packages/ark-chrome/src/styles.css"),
  "utf8"
);

let sheet: HTMLStyleElement;

beforeEach(() => {
  seen.props = [];
  // jsdom applies the sheet's plain rules and skips its @media blocks, so what
  // it computes is the phone layout, where the rail is a drawer.
  sheet = document.createElement("style");
  sheet.textContent = STYLES;
  document.head.appendChild(sheet);
});

afterEach(() => {
  sheet.remove();
  document.body.style.overflow = "";
});

function rail(open: boolean) {
  return (
    <Sidebar
      items={buildNav(null)}
      activeSection="spot"
      onNavigate={() => {}}
      open={open}
      onClose={() => {}}
    />
  );
}

describe("the rail's test markers", () => {
  it("leaves the drawer's open state to the package rather than deciding it here", () => {
    const { rerender } = render(rail(false));
    rerender(rail(true));
    const [closed, open] = [seen.props[0], seen.props.at(-1)];
    // The same marker names in both states: which one lands on the aside is
    // decided by the package, from the state it slides the drawer with.
    expect(open?.classNames).toEqual(closed?.classNames);
  });

  it("puts the open and closed markers where the package opens and parks the drawer", () => {
    const { container, rerender } = render(rail(false));
    const aside = container.querySelector("#app-sidebar") as HTMLElement;
    const backdrop = aside.previousElementSibling as HTMLElement;

    expect(aside.classList.contains("-translate-x-full")).toBe(true);
    expect(aside.classList.contains("translate-x-0")).toBe(false);
    expect(aside).not.toHaveAttribute("data-open");
    expect(getComputedStyle(aside).visibility).toBe("hidden");
    expect(getComputedStyle(backdrop).pointerEvents).toBe("none");

    rerender(rail(true));
    expect(aside.classList.contains("translate-x-0")).toBe(true);
    expect(aside.classList.contains("-translate-x-full")).toBe(false);
    expect(aside).toHaveAttribute("data-open");
    expect(getComputedStyle(aside).visibility).toBe("visible");
    expect(getComputedStyle(backdrop).pointerEvents).toBe("auto");
  });

  it("puts the lit-row marker only on the row the package lights", () => {
    const { container } = render(rail(true));
    const marked = [...container.querySelectorAll("nav > *")].filter((el) =>
      el.classList.contains("bg-accent/14")
    );
    const lit = [...container.querySelectorAll(".ark-chrome-row--active")];
    expect(marked).toEqual(lit);
    expect(lit).toEqual([screen.getByRole("button", { name: "Spot" })]);
    expect(lit[0]).toHaveAttribute("aria-current", "page");
  });

  it("puts the layout markers on elements the package styles that way", () => {
    const { container } = render(rail(true));
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    expect(backdrop.className).toContain("ark-chrome-backdrop");
    expect(getComputedStyle(backdrop).position).toBe("fixed");

    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.className).toContain("min-h-0");
    expect(nav.className).toContain("overflow-y-auto");
    expect(getComputedStyle(nav).minHeight).toBe("0px");
    expect(getComputedStyle(nav).overflowY).toBe("auto");
    expect(getComputedStyle(nav).overflowX).toBe("hidden");

    const footer = container.querySelector(".mt-auto") as HTMLElement;
    expect(footer.className).toContain("ark-chrome-footer");
    expect(getComputedStyle(footer).marginTop).toBe("auto");
  });
});
