import { describe, expect, it } from "vitest";
import { comboSportsForNavigation } from "./sport-navigation";

describe("prediction sport navigation", () => {
  it("maps Polymarket sports to their provider categories", () => {
    expect(comboSportsForNavigation("cricket")).toEqual([{ sport: "cricket", label: "Cricket" }]);
    expect(comboSportsForNavigation("mlb")).toEqual([{ sport: "mlb", label: "MLB" }]);
  });

  it("groups the remaining real sports under More Sports", () => {
    expect(comboSportsForNavigation("more").map(({ sport }) => sport)).toEqual(["nfl", "ufc"]);
  });
});
