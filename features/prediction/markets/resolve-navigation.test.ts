import { describe, expect, it } from "vitest";
import { resolveMarketNavigation } from "./resolve-navigation";

describe("prediction market navigation", () => {
  it("treats football and basketball as first-class categories", () => {
    expect(resolveMarketNavigation({ category: "football", league: "ucl" })).toEqual({
      activeCategory: "football",
      activeLeague: "ucl",
    });
    expect(resolveMarketNavigation({ category: "basketball", league: "euroleague" })).toEqual({
      activeCategory: "basketball",
      activeLeague: "euroleague",
    });
  });

  it("uses the all-leagues feed by default and rejects unsafe slugs", () => {
    expect(resolveMarketNavigation({ category: "football" })).toEqual({
      activeCategory: "football",
      activeLeague: "",
    });
    expect(
      resolveMarketNavigation({ category: "football", league: "../../sports/events" })
    ).toEqual({
      activeCategory: "football",
      activeLeague: "",
    });
  });
});
