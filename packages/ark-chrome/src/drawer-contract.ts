"use client";

import { useEffect } from "react";
import type { ArkSidebarLayout } from "./types";
import { isWideViewport, subscribeViewport } from "./viewport";

// Bundlers replace process.env.NODE_ENV with a string literal, so every check
// below folds to a constant in a production build and the guard, its registry
// calls and its message are dropped. Declared here because the package is
// type-checked without Node's types.
declare const process: { env: { NODE_ENV?: string } };

/**
 * How long the guard waits after a mount or a change before it checks. Long
 * enough for a host's top bar, often a sibling that mounts a beat later or a
 * lazily loaded chunk in development, to render its trigger.
 */
export const DRAWER_TRIGGER_GRACE_MS = 2_000;

// What the chrome on the page has mounted, shared between its components
// without a provider: the drawers a trigger controls, and the tab bars with
// whether each is hidden. Development only.
const triggers = new Map<string, number>();
const tabBars = new Map<symbol, boolean>();
const listeners = new Set<() => void>();

function changed() {
  for (const listener of listeners) listener();
}

/** Called by ArkDrawerTrigger while it is mounted. */
export function useRegisterDrawerTrigger(controls: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    triggers.set(controls, (triggers.get(controls) ?? 0) + 1);
    changed();
    return () => {
      const count = (triggers.get(controls) ?? 1) - 1;
      if (count === 0) triggers.delete(controls);
      else triggers.set(controls, count);
      changed();
    };
  }, [controls]);
}

/** Called by ArkTabBar while it is mounted. */
export function useRegisterTabBar(hidden: boolean) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const key = Symbol("ark-chrome-tabbar");
    tabBars.set(key, hidden);
    changed();
    return () => {
      tabBars.delete(key);
      changed();
    };
  }, [hidden]);
}

// A hidden tab bar is the host taking the bottom edge on purpose (an open
// thread, a live room, the composer), and its top bar is gone with it. With
// no tab bar mounted at all, nothing on the page is standing in for the menu.
function tabBarsAllHidden(): boolean {
  if (tabBars.size === 0) return false;
  for (const hidden of tabBars.values()) if (!hidden) return false;
  return true;
}

/**
 * Reports, in development, a sidebar that is a drawer at this width with no
 * way to open it. Every host that renders ArkSidebar as a phone drawer must
 * render an ArkDrawerTrigger for it: the tab bar has no menu seat.
 */
export function useDrawerTriggerGuard(id: string, layout: ArkSidebarLayout, hasDrawer: boolean) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (layout === "rail") return;

    if (!hasDrawer) {
      console.error(
        `[@ark/chrome] drawer contract: ArkSidebar #${id} has layout "${layout}" but no drawer prop, so its drawer can never open. Pass drawer={{ open, onClose }} with an ArkDrawerTrigger that opens it, or use layout="rail" for a page with no phone drawer.`
      );
      return;
    }

    let reported = false;
    let timer: number | undefined;
    const check = () => {
      const orphaned = !isWideViewport() && !triggers.has(id) && !tabBarsAllHidden();
      if (orphaned && !reported) {
        console.error(
          `[@ark/chrome] drawer contract: every host that renders ArkSidebar as a phone drawer must render ArkDrawerTrigger for it. #${id} is a drawer at this width (layout "${layout}"), no ArkDrawerTrigger controls it, and the ArkTabBar is not hidden, so nothing on the page can open it. Render <ArkDrawerTrigger controls="${id}" /> where the drawer opens, such as a phone top bar, or use layout="rail" for a page with no phone drawer.`
        );
      }
      reported = orphaned;
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, DRAWER_TRIGGER_GRACE_MS);
    };

    schedule();
    listeners.add(schedule);
    const stopViewport = subscribeViewport(schedule);
    return () => {
      window.clearTimeout(timer);
      listeners.delete(schedule);
      stopViewport();
    };
  }, [id, layout, hasDrawer]);
}
