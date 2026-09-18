import { ARK_CHROME_BREAKPOINT_PX } from "./layout-contract";

// The same question styles.css asks with @media (min-width: 768px).
const WIDE_QUERY = `(min-width: ${ARK_CHROME_BREAKPOINT_PX}px)`;

/** Whether the viewport is at or above the breakpoint, where the rail is fixed. */
export function isWideViewport(): boolean {
  if (typeof window.matchMedia === "function") return window.matchMedia(WIDE_QUERY).matches;
  // An environment with no matchMedia (jsdom) still has a width.
  return window.innerWidth >= ARK_CHROME_BREAKPOINT_PX;
}

/** Calls `onChange` when the viewport may have crossed the breakpoint. */
export function subscribeViewport(onChange: () => void): () => void {
  if (typeof window.matchMedia === "function") {
    const query = window.matchMedia(WIDE_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
