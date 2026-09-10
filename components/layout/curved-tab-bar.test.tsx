import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { NavItem } from "@/components/layout/nav-items";
import type { SectionId } from "@/lib/sections";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// The marker slides with motion; the bar under test is the tap zones.
// The marker animates its position; the stub folds the animated values into the
// element's own style so a test can read where it landed.
vi.mock("motion/react", () => ({
  motion: {
    div: ({
      animate,
      style,
      ...props
    }: {
      animate?: React.CSSProperties;
      style?: React.CSSProperties;
      [key: string]: unknown;
    }) => {
      // The rest are motion-only props; on a plain div React would flag them as
      // unknown attributes, so they are dropped rather than forwarded.
      const dom = { ...props };
      delete dom.initial;
      delete dom.exit;
      delete dom.transition;
      return <div {...dom} style={{ ...style, ...animate }} />;
    },
  },
  useReducedMotion: () => true,
}));

vi.mock("@/lib/market-square", () => ({
  marketSquareHref: () => "https://square.example",
}));

const { CurvedTabBar } = await import("./curved-tab-bar");

// Stands in for buildNav's output: the dock reads its labels off these.
const NAV: NavItem[] = [
  { id: "portfolio", label: "Portfolio", icon: () => null },
  { id: "spot", label: "Spot", icon: () => null },
  { id: "casino", label: "Casino", icon: () => null },
  { id: "activity", label: "Activity", icon: () => null },
  { id: "meme", label: "Memecoins", icon: () => null },
];

function renderBar(onNavigate = vi.fn(), activeSection: SectionId = "portfolio") {
  const { container } = render(
    <CurvedTabBar items={NAV} activeSection={activeSection} onNavigate={onNavigate} />
  );
  return { onNavigate, zones: screen.getAllByRole("button"), container };
}

beforeEach(() => {
  router.push.mockClear();
});

describe("CurvedTabBar", () => {
  it("draws five tap zones over the art", () => {
    expect(renderBar().zones).toHaveLength(5);
  });

  it("sends the second zone to the phone Market page", () => {
    const { zones, onNavigate } = renderBar();
    fireEvent.click(zones[1]);
    expect(router.push).toHaveBeenCalledWith("/market");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("opens Market Square beside the app from the centre card", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { zones } = renderBar();
    fireEvent.click(zones[2]);
    expect(open).toHaveBeenCalledWith("https://square.example", "_blank", "noopener,noreferrer");
    open.mockRestore();
  });

  it("sends the last zone to Activity, since the phone has no drawer", () => {
    const { zones } = renderBar();
    fireEvent.click(zones[4]);
    expect(router.push).toHaveBeenCalledWith("/activity");
  });

  it("underlines the clock on the Activity page, as it underlines the home on Portfolio", () => {
    // The arc tracks the active icon's x and hangs a fixed offset below its y
    // (portfolio 72 + 12, activity 77.7 + 12).
    const home = renderBar(vi.fn(), "portfolio").container.querySelector<HTMLElement>(
      '[data-testid="active-arc"]'
    );
    expect(home).not.toBeNull();
    expect(home?.style.left).toBe("15%");
    expect(home?.style.top).toBe("84%");

    const clock = renderBar(vi.fn(), "activity").container.querySelector<HTMLElement>(
      '[data-testid="active-arc"]'
    );
    expect(clock).not.toBeNull();
    expect(clock?.style.left).toBe("86.8%");
    expect(clock?.style.top).toBe("89.7%");
  });

  it("names the active section under the dock", () => {
    renderBar(vi.fn(), "casino");
    expect(screen.getByTestId("active-label").textContent).toBe("Casino");
  });

  it("hides both the arc and the name where no icon owns the page", () => {
    renderBar(vi.fn(), "meme");
    expect(screen.queryByTestId("active-arc")).toBeNull();
    expect(screen.queryByTestId("active-label")).toBeNull();
  });

  it("scroll-spies portfolio and casino, which are sections of the shell", () => {
    const { zones, onNavigate } = renderBar();
    fireEvent.click(zones[0]);
    fireEvent.click(zones[3]);
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(["portfolio", "casino"]);
  });
});
