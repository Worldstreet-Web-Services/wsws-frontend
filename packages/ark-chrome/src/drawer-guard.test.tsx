import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { act, render } from "@testing-library/react";
import { ArkDrawerTrigger, ArkSidebar, ArkTabBar, ArkTabIcons } from "./index";
import { DRAWER_TRIGGER_GRACE_MS } from "./drawer-contract";
import type { ArkSidebarProps, ArkTab, ChromeLinkProps } from "./types";

// The contract: a host that renders the rail as a phone drawer renders an
// ArkDrawerTrigger for it, or the drawer can never open. In development the
// package says so on the console, and only when it is true: a phone-width
// viewport, a drawer layout, no trigger for that drawer, and a tab bar that is
// not hidden (a hidden tab bar is the host taking the bottom edge on purpose,
// with its top bar gone too). The check waits a moment after mount and after
// every change, so a host bar that mounts a beat later is not reported.

function HostLink({ href, children, ...rest }: ChromeLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

const TABS: [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab] = [
  { id: "home", label: "Home", icon: ArkTabIcons.home, target: { kind: "action" } },
  { id: "market", label: "Market", icon: ArkTabIcons.market, target: { kind: "action" } },
  { id: "square", label: "Square", icon: ArkTabIcons.square, target: { kind: "action" } },
  { id: "casino", label: "Arkade", icon: ArkTabIcons.arkade, target: { kind: "action" } },
  { id: "activity", label: "Activity", icon: ArkTabIcons.activity, target: { kind: "action" } },
];

function Page({
  layout = "responsive",
  trigger = false,
  triggerFor = "ark-chrome-sidebar",
  tabBar = "none",
  drawer = true,
}: {
  layout?: ArkSidebarProps["layout"];
  trigger?: boolean;
  triggerFor?: string;
  tabBar?: "none" | "shown" | "hidden";
  drawer?: boolean;
}) {
  return (
    <>
      {trigger ? (
        <ArkDrawerTrigger open={false} onPress={() => {}} label="Menu" controls={triggerFor} />
      ) : null}
      <ArkSidebar
        items={[]}
        activeId={null}
        Link={HostLink}
        brand={{ target: { kind: "link", href: "/" } }}
        person={{ status: "loading" }}
        drawer={drawer ? { open: false, onClose: () => {} } : undefined}
        layout={layout}
        labels={{ menu: "Menu", closeMenu: "Close menu" }}
      />
      {tabBar === "none" ? null : (
        <ArkTabBar
          tabs={TABS}
          activeId={null}
          Link={HostLink}
          navLabel="Primary"
          hidden={tabBar === "hidden"}
        />
      )}
    </>
  );
}

let consoleError: MockInstance<typeof console.error>;
const initialWidth = window.innerWidth;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
}

function waitOutGrace() {
  act(() => {
    vi.advanceTimersByTime(DRAWER_TRIGGER_GRACE_MS + 10);
  });
}

function contractReports() {
  return consoleError.mock.calls.filter((call) => String(call[0]).includes("drawer contract"));
}

beforeEach(() => {
  vi.useFakeTimers();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  setViewportWidth(390);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  consoleError.mockRestore();
  setViewportWidth(initialWidth);
});

describe("the drawer trigger contract, in development", () => {
  it("reports a phone drawer with no trigger and a visible tab bar, naming the rule", () => {
    render(<Page tabBar="shown" />);
    waitOutGrace();
    const reports = contractReports();
    expect(reports).toHaveLength(1);
    expect(String(reports[0][0])).toMatch(/must render ArkDrawerTrigger/);
    expect(String(reports[0][0])).toContain('controls="ark-chrome-sidebar"');
  });

  it("reports a phone drawer with no trigger and no tab bar at all", () => {
    render(<Page />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(1);
  });

  it("reports the drawer layout at phone width too", () => {
    render(<Page layout="drawer" tabBar="shown" />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(1);
  });

  it("says it once while nothing changes", () => {
    render(<Page tabBar="shown" />);
    waitOutGrace();
    act(() => {
      setViewportWidth(380);
    });
    waitOutGrace();
    expect(contractReports()).toHaveLength(1);
  });

  it("is silent with a trigger for the drawer", () => {
    render(<Page trigger tabBar="shown" />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(0);
  });

  it("does not count a trigger for another drawer", () => {
    render(<Page trigger triggerFor="some-other-drawer" tabBar="shown" />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(1);
  });

  it("is silent while the tab bar is hidden, and reports once it is shown again", () => {
    const { rerender } = render(<Page tabBar="hidden" />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(0);

    rerender(<Page tabBar="shown" />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(1);
  });

  it("is silent during the grace period, while the host's bar has not mounted yet", () => {
    const { rerender } = render(<Page tabBar="shown" />);
    act(() => {
      vi.advanceTimersByTime(DRAWER_TRIGGER_GRACE_MS - 50);
    });
    expect(contractReports()).toHaveLength(0);

    rerender(<Page trigger tabBar="shown" />);
    waitOutGrace();
    waitOutGrace();
    expect(contractReports()).toHaveLength(0);
  });

  it("is silent from 768px up, where the responsive rail is fixed", () => {
    setViewportWidth(1440);
    render(<Page tabBar="shown" />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(0);
  });

  it("does not apply to the rail layout, which has no phone drawer", () => {
    render(<Page layout="rail" drawer={false} tabBar="shown" />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(0);
  });

  it("reports a drawer layout given no drawer state, which could never open", () => {
    render(<Page drawer={false} trigger tabBar="shown" />);
    const reports = contractReports();
    expect(reports).toHaveLength(1);
    expect(String(reports[0][0])).toMatch(/no drawer prop/);
  });

  it("is silent in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<Page tabBar="shown" />);
    render(<Page drawer={false} />);
    waitOutGrace();
    expect(contractReports()).toHaveLength(0);
  });
});
