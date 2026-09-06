import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSpaceSpots } from "@/app/dashboard/discovery/spaces";

// What this proves is a decision, not a mapping: there is no live source for
// the conversation card, so the hook features nothing and says so in a way the
// card can hold on to. See the note at the top of spaces.ts for the sources
// that were read and why each one falls short.
describe("useSpaceSpots", () => {
  it("features no rooms", () => {
    const { result } = renderHook(() => useSpaceSpots());
    expect(result.current).toEqual([]);
  });

  it("features no rooms whatever limit it is given", () => {
    for (const limit of [0, 1, 5, 50]) {
      const { result } = renderHook(() => useSpaceSpots(limit));
      expect(result.current).toEqual([]);
    }
  });

  // The card rotates on a ten second timer keyed to the array it holds. A new
  // empty array per render would restart that timer on every dashboard render.
  it("returns the same array across renders", () => {
    const { result, rerender } = renderHook(() => useSpaceSpots());
    const first = result.current;
    rerender();
    rerender();
    expect(result.current).toBe(first);
  });

  // Two cards asking at different limits must not hand the rotation two
  // different empties either.
  it("returns the same array to every caller", () => {
    const a = renderHook(() => useSpaceSpots(3)).result.current;
    const b = renderHook(() => useSpaceSpots(9)).result.current;
    expect(a).toBe(b);
  });

  // The empty is shared, so a caller must not be able to fill it for everyone.
  it("hands back an array nothing can mutate", () => {
    const { result } = renderHook(() => useSpaceSpots());
    expect(Object.isFrozen(result.current)).toBe(true);
  });
});
