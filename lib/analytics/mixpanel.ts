// The one seam the rest of the app is allowed to call through for product
// analytics. Nothing outside this file imports mixpanel-browser directly, so
// swapping providers later (or adding a second one) touches one module, not
// every screen that tracks an event.
//
// Event and property names should stay snake_case (Mixpanel's convention);
// omit properties that don't apply rather than sending null or "".

import mixpanel, { type Dict } from "mixpanel-browser";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let initialized = false;

function ready(): boolean {
  return initialized && typeof window !== "undefined";
}

// Call once, before any other export here. A no-op on the server, and a
// no-op (with a console warning) if no token is configured, so local dev
// without NEXT_PUBLIC_MIXPANEL_TOKEN set never crashes and never phones home.
export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  if (!TOKEN) {
    console.warn("[analytics] NEXT_PUBLIC_MIXPANEL_TOKEN is not set; tracking is disabled.");
    return;
  }
  mixpanel.init(TOKEN, {
    persistence: "localStorage",
    // We send our own named events at the point of the action; Mixpanel's
    // generic DOM-click autocapture would otherwise double up on those.
    autocapture: false,
  });
  initialized = true;
}

// Ties Mixpanel's distinct_id to our own user id (call after the user is
// authenticated, never before), and records the profile properties passed in.
export function identifyUser(id: string, properties?: Dict): void {
  if (!ready()) return;
  mixpanel.identify(id);
  if (properties) mixpanel.people.set(properties);
}

// Call on logout: detaches Mixpanel's local identity so the next session on
// this device starts anonymous again instead of inheriting the last user's.
export function resetAnalytics(): void {
  if (!ready()) return;
  mixpanel.reset();
}

export function trackEvent(name: string, properties?: Dict): void {
  if (!ready()) return;
  mixpanel.track(name, properties);
}
