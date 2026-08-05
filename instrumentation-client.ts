// Next.js file convention: runs on the client after the HTML loads but
// before React hydrates, which makes it the right place to boot analytics.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md.

import { initAnalytics, trackEvent } from "@/lib/analytics/mixpanel";

initAnalytics();

// Mixpanel doesn't see client-side route changes on its own; this is Next's
// hook for exactly that, fired on every push/replace/back-forward navigation.
export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse"
): void {
  trackEvent("page_view", { url, navigation_type: navigationType });
}
