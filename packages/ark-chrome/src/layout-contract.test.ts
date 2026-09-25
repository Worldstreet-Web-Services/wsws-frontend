import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARK_CHROME_BREAKPOINT_PX, ARK_TABBAR_Z_INDEX, arkTabBarInset } from "./index";

// Hosts lay their own pages out around the tab bar: they reserve its height at
// the bottom of a phone page and stack their sheets and bars against its
// z-index. Both values are part of the 1.x contract, so a change to either is a
// major version. These pins fail when the constants and the stylesheet drift
// apart, or when either moves without that decision.

const CSS = readFileSync(join(import.meta.dirname, "styles.css"), "utf8");

/** The declarations of the first rule whose selector is exactly `selector`. */
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`).exec(CSS);
  if (!match) throw new Error(`styles.css has no rule for ${selector}`);
  return match[1];
}

describe("@ark/chrome stable layout contract", () => {
  it("pins the tab bar's z-index at 90", () => {
    expect(ARK_TABBAR_Z_INDEX).toBe(90);
    expect(ruleBody(".ark-chrome-tabbar")).toContain(
      `z-index: var(--ark-chrome-z-tabbar, ${ARK_TABBAR_Z_INDEX});`
    );
  });

  it("pins the phone tab bar's height at calc(100vw * 90 / 402)", () => {
    expect(arkTabBarInset()).toBe("calc(100vw * 90 / 402)");
    // The height is the frame's: the full viewport width at the art's 402 by
    // 90 ratio.
    const frame = ruleBody(".ark-chrome-tabbar-frame");
    expect(frame).toContain("width: 100vw;");
    expect(frame).toContain("aspect-ratio: 402 / 90;");
  });

  it("pins the breakpoint the tab bar and the rail swap at", () => {
    expect(ARK_CHROME_BREAKPOINT_PX).toBe(768);
    expect(CSS).toContain(`@media (min-width: ${ARK_CHROME_BREAKPOINT_PX}px)`);
  });

  it("says in the stylesheet that both values are part of the 1.x contract", () => {
    const header = CSS.slice(0, CSS.indexOf("*/"));
    expect(header).toMatch(/--ark-chrome-z-tabbar\s+phone tab bar \(default 90\)/);
    expect(header).toContain("calc(100vw * 90 / 402)");
    expect(header).toMatch(/1\.x contract/);
    expect(header).toMatch(/major version/);
  });
});
