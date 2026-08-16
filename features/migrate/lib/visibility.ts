"use client";

import { useSyncExternalStore } from "react";

// Whether to offer the one-click Update Balance migration. Two facts decide
// it, both device-local because the dashboard no longer mounts Privy and
// there is no server-side mapping between a Decane account and its old Privy
// account:
//
// 1. This browser holds Privy session state (the `privy:` auth keys), which
//    only a past Privy sign-in leaves behind. A Decane-native signup never
//    sees the button. The known gap: an old user on a brand-new device has no
//    such state and sees nothing; support can walk them through signing in on
//    the device they used before.
// 2. The migration has not already completed here. The button marks
//    completion when every asset landed, or when the old account turned out
//    to hold nothing to move.

// Keys Privy only writes around a real session, not on a bare provider mount
// (which would false-positive as soon as the button itself mounts Privy).
const PRIVY_SESSION_KEYS = [
  "privy:token",
  "privy:refresh_token",
  "privy:id_token",
  "privy:connections",
];

const MIGRATION_COMPLETE_KEY = "ws.migrationComplete";

// The storage event only fires in OTHER tabs, so same-tab completion notifies
// subscribers directly.
const listeners = new Set<() => void>();

export function markMigrationComplete(): void {
  try {
    window.localStorage.setItem(MIGRATION_COMPLETE_KEY, "1");
  } catch {
    // Storage unavailable: the banner keeps showing, the sweep still worked.
  }
  listeners.forEach((listener) => listener());
}

export function shouldOfferMigration(): boolean {
  try {
    if (window.localStorage.getItem(MIGRATION_COMPLETE_KEY) === "1") return false;
    return PRIVY_SESSION_KEYS.some((key) => window.localStorage.getItem(key) !== null);
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// SSR renders no banner; the store corrects it on hydration.
export function useOfferMigration(): boolean {
  return useSyncExternalStore(subscribe, shouldOfferMigration, () => false);
}
