import { z } from "zod";

// The user-management service's notification contract, one schema per route
// the proxy relays (app/api/user-management/[...path]/route.ts). They judge
// the successful envelope at the boundary and do not transform it, so a shape
// drift is a 502 with a request id rather than a component rendering
// `undefined` under a bell.
//
// Objects are not strict: a field the service adds later is not a failure.
// Nullable fields are nullable in the service, not guesses: a campaign may
// carry no image, an unread row has no `readAt`, and the last page has no
// cursor.

import type { ProxyMethod } from "@/lib/api/user-management-proxy-paths";

export const inboxNotificationSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  title: z.string(),
  body: z.string(),
  // Either an app-relative path or an absolute HTTPS URL. Which of the two it
  // is decides where a click sends the reader, so it is judged where that
  // decision is made (lib/notifications/destination.ts), not here.
  url: z.string(),
  imageUrl: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const inboxPageSchema = z.object({
  items: z.array(inboxNotificationSchema),
  // The badge is this number, not a count of loaded rows, so a string here
  // would put NaN in the UI. It is the one field worth being strict about.
  // Whole numbers: these are counts, and the client parser insists on the same
  // thing, so a fractional one must fail here rather than in the hook.
  unreadCount: z.number().int(),
  // An opaque ISO timestamp, sent back as received. Null on the last page.
  nextCursor: z.string().nullable(),
});

export const readResultSchema = z.object({ updated: z.number().int() });

// Null when the deployment has no VAPID keys. That is a valid answer, and the
// UI says push is off server-side rather than offering a button that cannot
// work.
export const vapidKeySchema = z.object({ publicKey: z.string().nullable() });

// True from the POST, false from the DELETE, so one schema covers both.
export const subscribeResultSchema = z.object({ subscribed: z.boolean() });

/**
 * The schema for a relayed path, or null when nothing models it.
 *
 * Keyed on the upstream path with the did collapsed, the same way the market
 * square proxy does it. The method matters on `push/subscriptions`, which
 * subscribes on POST and unsubscribes on DELETE; both answer the same shape.
 */
export function userManagementSchemaFor(path: string, method: ProxyMethod): z.ZodType | null {
  if (/^users\/[^/]+\/notifications$/u.test(path) && method === "GET") return inboxPageSchema;
  if (/^users\/[^/]+\/notifications\/read$/u.test(path) && method === "POST") {
    return readResultSchema;
  }
  if (/^users\/[^/]+\/push\/vapid-public-key$/u.test(path) && method === "GET") {
    return vapidKeySchema;
  }
  if (/^users\/[^/]+\/push\/subscriptions$/u.test(path) && method !== "GET") {
    return subscribeResultSchema;
  }
  return null;
}
