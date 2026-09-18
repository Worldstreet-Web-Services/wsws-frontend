"use client";

import { useRegisterDrawerTrigger } from "./drawer-contract";
import { ARK_SIDEBAR_DEFAULT_ID } from "./sidebar-id";
import type { ArkDrawerTriggerProps } from "./types";

/**
 * The button that opens the rail's phone drawer. The tab bar has no menu
 * seat, so a host that renders ArkSidebar as a drawer renders this wherever
 * the drawer opens from: a phone top bar, a screen's own header. The host owns
 * the open state; the button reports presses and says which drawer it opens
 * and whether that drawer is open.
 *
 * Drawn as the perps screen's menu button: a 36px ring, dim at rest, bright on
 * hover. It sets no margin, so the host places it with its own classes.
 */
export function ArkDrawerTrigger({
  open,
  onPress,
  label,
  controls = ARK_SIDEBAR_DEFAULT_ID,
  className,
  ref,
}: ArkDrawerTriggerProps) {
  useRegisterDrawerTrigger(controls);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onPress}
      className={className ? `ark-chrome-drawer-trigger ${className}` : "ark-chrome-drawer-trigger"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
