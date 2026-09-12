import { describe, expect, it } from "vitest";
import { HOME_DECK_NODE, deckExtent, deckLayout, swipeDecision } from "@/lib/square/deck";

// The deck is the Square's; these pin the two facts the page leans on: the
// whole fan, arrows included, fits the column it is given, and a drag only
// commits once it is far or fast enough, and only sideways.
describe("deckLayout", () => {
  it("scales the fan so the arrows' outer edges land on the column's edges", () => {
    const layout = deckLayout({ room: 1000, arrows: true, node: HOME_DECK_NODE });
    const { left, right } = deckExtent(true, HOME_DECK_NODE);
    // On Home the left disc reaches past the fan, and so does the right one.
    expect(left).toBe(HOME_DECK_NODE.arrow.leftDx - HOME_DECK_NODE.arrow.size / 2);
    expect(right).toBe(HOME_DECK_NODE.arrow.rightDx + HOME_DECK_NODE.arrow.size / 2);
    expect(layout.k).toBeCloseTo(1000 / (right - left), 6);
    expect(layout.frontX).toBeCloseTo(-left * layout.k, 6);
    expect(layout.height).toBeCloseTo((229.7 + 211.12) * layout.k, 6);
  });
});

describe("swipeDecision", () => {
  it("goes back on a far drag right and on on a far drag left", () => {
    expect(swipeDecision({ dx: 120, dy: 4, width: 300 })).toBe("follow");
    expect(swipeDecision({ dx: -120, dy: 4, width: 300 })).toBe("pass");
  });

  it("commits a short flick in its own direction, and nothing vertical", () => {
    expect(swipeDecision({ dx: 30, dy: 2, width: 300, velocity: 0.6 })).toBe("follow");
    expect(swipeDecision({ dx: 30, dy: 2, width: 300, velocity: -0.6 })).toBeNull();
    expect(swipeDecision({ dx: 30, dy: 200, width: 300 })).toBeNull();
    expect(swipeDecision({ dx: 30, dy: 2, width: 300 })).toBeNull();
  });
});
