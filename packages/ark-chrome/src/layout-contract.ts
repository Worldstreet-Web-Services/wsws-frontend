// The layout values a host builds its own pages around. They are part of the
// 1.x contract: changing any of them is a major version of @ark/chrome, since a
// host that reserved room or stacked a sheet against the old value breaks
// without a type error to warn it. styles.css states the same values, and
// layout-contract.test.ts fails when the two drift apart.

/** The width from which the rail is fixed and the tab bar is hidden. */
export const ARK_CHROME_BREAKPOINT_PX = 768;

/**
 * The phone tab bar's default z-index, the fallback of `--ark-chrome-z-tabbar`.
 * A host's sheet that must cover the bar sits above it; a floating control that
 * must stay under it sits below.
 */
export const ARK_TABBAR_Z_INDEX = 90;

/**
 * The phone tab bar's height, as a CSS length: the full viewport width at the
 * dome art's 402 by 90 ratio. A host reserves it at the bottom of a page below
 * the breakpoint, for example `padding-bottom: ${arkTabBarInset()}`.
 */
export function arkTabBarInset(): string {
  return "calc(100vw * 90 / 402)";
}
