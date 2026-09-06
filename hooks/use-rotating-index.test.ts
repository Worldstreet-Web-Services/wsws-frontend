import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRotatingIndex } from "@/hooks/use-rotating-index";

const TICK = 10_000;

// jsdom keeps `hidden` and `visibilityState` as read-only accessors backed by
// its own page state, so a test has to redefine both to move the tab.
function setTabVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  Object.defineProperty(document, "hidden", { value: state === "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useRotatingIndex", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setTabVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at zero and advances one step per interval", () => {
    const { result } = renderHook(() => useRotatingIndex(5));

    expect(result.current).toBe(0);
    advance(TICK - 1);
    expect(result.current).toBe(0);
    advance(1);
    expect(result.current).toBe(1);
    advance(TICK);
    expect(result.current).toBe(2);
  });

  it("defaults to a ten second interval and honours an override", () => {
    const { result } = renderHook(() => useRotatingIndex(5, { intervalMs: 250 }));

    advance(250);
    expect(result.current).toBe(1);
    advance(750);
    expect(result.current).toBe(4);
  });

  it("wraps back to the first item after the last", () => {
    const { result } = renderHook(() => useRotatingIndex(5, { intervalMs: 100 }));

    advance(400);
    expect(result.current).toBe(4);
    advance(100);
    expect(result.current).toBe(0);
    advance(100);
    expect(result.current).toBe(1);
  });

  it("stays at zero and starts no timer for an empty or single-item set", () => {
    const empty = renderHook(() => useRotatingIndex(0));
    expect(empty.result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    advance(TICK * 5);
    expect(empty.result.current).toBe(0);
    empty.unmount();

    const single = renderHook(() => useRotatingIndex(1));
    expect(single.result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    advance(TICK * 5);
    expect(single.result.current).toBe(0);
  });

  it("holds the index while paused and runs no timer", () => {
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) => useRotatingIndex(5, { paused }),
      { initialProps: { paused: false } }
    );

    advance(TICK * 2);
    expect(result.current).toBe(2);

    rerender({ paused: true });
    expect(vi.getTimerCount()).toBe(0);
    advance(TICK * 10);
    expect(result.current).toBe(2);
  });

  it("resumes from where it stopped rather than jumping", () => {
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) => useRotatingIndex(5, { paused }),
      { initialProps: { paused: false } }
    );

    advance(TICK * 3);
    expect(result.current).toBe(3);

    rerender({ paused: true });
    advance(TICK * 10);
    rerender({ paused: false });

    // Still on the item the reader stopped on, and a full interval away from
    // the next one. No catch-up burst for the time spent paused.
    expect(result.current).toBe(3);
    advance(TICK - 1);
    expect(result.current).toBe(3);
    advance(1);
    expect(result.current).toBe(4);
  });

  it("pauses while the tab is hidden and resumes when it comes back", () => {
    const { result } = renderHook(() => useRotatingIndex(5));

    advance(TICK);
    expect(result.current).toBe(1);

    act(() => setTabVisibility("hidden"));
    expect(vi.getTimerCount()).toBe(0);
    advance(TICK * 10);
    expect(result.current).toBe(1);

    act(() => setTabVisibility("visible"));
    expect(result.current).toBe(1);
    advance(TICK);
    expect(result.current).toBe(2);
  });

  it("starts no timer when it mounts into an already hidden tab", () => {
    setTabVisibility("hidden");
    const { result } = renderHook(() => useRotatingIndex(5));

    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    advance(TICK * 5);
    expect(result.current).toBe(0);
  });

  it("clamps to the last item when the count shrinks under it", () => {
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useRotatingIndex(count),
      { initialProps: { count: 5 } }
    );

    advance(TICK * 4);
    expect(result.current).toBe(4);

    // Live data dropped three items while parked on the last one.
    rerender({ count: 2 });
    expect(result.current).toBe(1);

    // And the next advance steps from the clamped position, not the stale one.
    advance(TICK);
    expect(result.current).toBe(0);
  });

  it("keeps returning zero when the count collapses to nothing", () => {
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useRotatingIndex(count),
      { initialProps: { count: 3 } }
    );

    advance(TICK * 2);
    expect(result.current).toBe(2);

    rerender({ count: 0 });
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops its timer on unmount", () => {
    const { unmount } = renderHook(() => useRotatingIndex(5));

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
