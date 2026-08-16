// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { markMigrationComplete, shouldOfferMigration } from "@/features/migrate/lib/visibility";

afterEach(() => {
  window.localStorage.clear();
});

describe("shouldOfferMigration", () => {
  it("stays hidden for a browser with no Privy history", () => {
    expect(shouldOfferMigration()).toBe(false);
  });

  it("offers when a Privy session key exists", () => {
    window.localStorage.setItem("privy:token", "jwt");
    expect(shouldOfferMigration()).toBe(true);
  });

  it("offers for a lapsed session that still holds any auth key", () => {
    window.localStorage.setItem("privy:connections", "[]");
    expect(shouldOfferMigration()).toBe(true);
  });

  it("retires after the migration completed", () => {
    window.localStorage.setItem("privy:token", "jwt");
    markMigrationComplete();
    expect(shouldOfferMigration()).toBe(false);
  });
});
