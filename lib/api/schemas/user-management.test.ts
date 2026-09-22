import { describe, expect, it } from "vitest";
import {
  inboxPageSchema,
  readResultSchema,
  subscribeResultSchema,
  userManagementSchemaFor,
  vapidKeySchema,
} from "./user-management";

const ENCODED_DID = encodeURIComponent("did:privy:cm1abcdef0000000000000000");

const NOTIFICATION = {
  id: "n-1",
  campaignId: "c-1",
  title: "Markets are open",
  body: "Trading starts in ten minutes.",
  url: "/perps",
  imageUrl: null,
  readAt: null,
  createdAt: "2026-09-21T09:00:00.000Z",
};

describe("inboxPageSchema", () => {
  it("accepts a page whose rows carry no image and have not been read", () => {
    const parsed = inboxPageSchema.parse({
      items: [NOTIFICATION],
      unreadCount: 1,
      nextCursor: null,
    });
    expect(parsed.items[0].imageUrl).toBeNull();
    expect(parsed.nextCursor).toBeNull();
  });

  it("accepts a read row, an image and a cursor", () => {
    const parsed = inboxPageSchema.parse({
      items: [
        {
          ...NOTIFICATION,
          imageUrl: "https://cdn.test/a.png",
          readAt: "2026-09-21T10:00:00.000Z",
        },
      ],
      unreadCount: 0,
      nextCursor: "2026-09-21T09:00:00.000Z",
    });
    expect(parsed.nextCursor).toBe("2026-09-21T09:00:00.000Z");
    expect(parsed.items[0].readAt).toBe("2026-09-21T10:00:00.000Z");
  });

  it("rejects a drifted page, so the badge can never be NaN", () => {
    expect(
      inboxPageSchema.safeParse({ items: [], unreadCount: "3", nextCursor: null }).success
    ).toBe(false);
    expect(inboxPageSchema.safeParse({ items: {}, unreadCount: 0, nextCursor: null }).success).toBe(
      false
    );
    expect(inboxPageSchema.safeParse({ items: [], unreadCount: 0 }).success).toBe(false);
  });

  it("rejects a row missing a field the bell renders", () => {
    for (const field of ["id", "title", "body", "url", "createdAt", "campaignId"]) {
      const row: Record<string, unknown> = { ...NOTIFICATION };
      delete row[field];
      expect(
        inboxPageSchema.safeParse({ items: [row], unreadCount: 0, nextCursor: null }).success,
        `a row without ${field} must be refused`
      ).toBe(false);
    }
  });

  it("refuses a row whose nullable fields arrive as the wrong type", () => {
    const row = { ...NOTIFICATION, imageUrl: 7 };
    expect(
      inboxPageSchema.safeParse({ items: [row], unreadCount: 0, nextCursor: null }).success
    ).toBe(false);
  });
});

describe("the small result schemas", () => {
  it("reads a mark-read count", () => {
    expect(readResultSchema.parse({ updated: 3 }).updated).toBe(3);
    expect(readResultSchema.safeParse({ updated: "3" }).success).toBe(false);
  });

  // A null key is the answer from a deployment whose VAPID keys are unset. It
  // is a valid contract, not a failure: the UI says push is off server-side.
  it("accepts a null vapid public key", () => {
    expect(vapidKeySchema.parse({ publicKey: null }).publicKey).toBeNull();
    expect(vapidKeySchema.parse({ publicKey: "BPk..." }).publicKey).toBe("BPk...");
    expect(vapidKeySchema.safeParse({}).success).toBe(false);
  });

  it("reads both sides of the subscription toggle", () => {
    expect(subscribeResultSchema.parse({ subscribed: true }).subscribed).toBe(true);
    expect(subscribeResultSchema.parse({ subscribed: false }).subscribed).toBe(false);
    expect(subscribeResultSchema.safeParse({ subscribed: "true" }).success).toBe(false);
  });
});

describe("userManagementSchemaFor", () => {
  it("judges each route by its own shape", () => {
    expect(userManagementSchemaFor(`users/${ENCODED_DID}/notifications`, "GET")).toBe(
      inboxPageSchema
    );
    expect(userManagementSchemaFor(`users/${ENCODED_DID}/notifications/read`, "POST")).toBe(
      readResultSchema
    );
    expect(userManagementSchemaFor(`users/${ENCODED_DID}/push/vapid-public-key`, "GET")).toBe(
      vapidKeySchema
    );
    expect(userManagementSchemaFor(`users/${ENCODED_DID}/push/subscriptions`, "POST")).toBe(
      subscribeResultSchema
    );
    expect(userManagementSchemaFor(`users/${ENCODED_DID}/push/subscriptions`, "DELETE")).toBe(
      subscribeResultSchema
    );
  });

  // A count is always a whole number. The client parser
  // (lib/notifications/schema.ts) already insists on that, so a fractional
  // count that slipped through here would pass the boundary and then blow up
  // in the hook, which is the wrong place to find out.
  it("refuses a count that is not a whole number", () => {
    expect(
      inboxPageSchema.safeParse({ items: [], unreadCount: 1.5, nextCursor: null }).success
    ).toBe(false);
    expect(readResultSchema.safeParse({ updated: 2.5 }).success).toBe(false);
    expect(readResultSchema.safeParse({ updated: 2 }).success).toBe(true);
  });

  it("models nothing it does not know", () => {
    expect(userManagementSchemaFor("users/x/profile", "GET")).toBeNull();
    expect(userManagementSchemaFor("admin/campaigns", "GET")).toBeNull();
  });
});
