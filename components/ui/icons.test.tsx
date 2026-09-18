import { describe, expect, it } from "vitest";
import * as ArkIcons from "@ark/chrome/icons";
import * as icons from "./icons";

// The section icons moved into @ark/chrome and are re-exported from here.
// INTEREST_ICONS is built from them when this module loads, so a name that
// is re-exported but not imported leaves an entry undefined and throws a
// ReferenceError for every page that imports an icon.
describe("components/ui/icons", () => {
  it("re-exports the chrome's section icons as the same components", () => {
    for (const name of [
      "BriefcaseIcon",
      "BulbIcon",
      "ChartBarsIcon",
      "ClockIcon",
      "DiceIcon",
      "FlameIcon",
      "GridIcon",
      "HouseIcon",
      "TrendIcon",
    ] as const) {
      expect(icons[name], name).toBe(ArkIcons[name]);
    }
  });

  it("builds every interest icon", () => {
    for (const [key, Icon] of Object.entries(icons.INTEREST_ICONS)) {
      expect(typeof Icon, key).toBe("function");
    }
  });
});
