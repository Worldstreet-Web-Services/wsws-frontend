import { describe, expect, it } from "vitest";
import { emailsMismatch } from "@/features/migrate/hooks/use-legacy-email-match";

describe("emailsMismatch", () => {
  it("blocks a different old account", () => {
    expect(emailsMismatch("korode@gmail.com", "demitchy@gmail.com")).toBe(true);
  });

  it("allows the same address whatever the casing or spacing", () => {
    expect(emailsMismatch("Korode@Gmail.com", "korode@gmail.com ")).toBe(false);
  });

  // An X-only old account has no email; the rule must not strand it. And
  // before the old sign-in there is nothing to compare yet.
  it("cannot judge when either side has no email", () => {
    expect(emailsMismatch("korode@gmail.com", "")).toBe(false);
    expect(emailsMismatch("", "demitchy@gmail.com")).toBe(false);
    expect(emailsMismatch("", "")).toBe(false);
  });
});
