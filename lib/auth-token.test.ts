import { describe, expect, it, vi } from "vitest";
import { createAuthTokenResolver } from "@/lib/auth-token";

describe("createAuthTokenResolver", () => {
  it("returns the Privy tokens when a Privy session is live", async () => {
    const resolve = createAuthTokenResolver({
      resolvePrivyTokens: async () => ({ accessToken: "privy-access", idToken: "privy-id" }),
      getDecaneToken: () => "decane-access",
    });

    await expect(resolve()).resolves.toEqual({
      accessToken: "privy-access",
      idToken: "privy-id",
    });
  });

  it("falls back to the Decane token when there is no Privy session", async () => {
    const resolve = createAuthTokenResolver({
      resolvePrivyTokens: async () => ({ accessToken: null, idToken: null }),
      getDecaneToken: () => "decane-access",
    });

    await expect(resolve()).resolves.toEqual({ accessToken: "decane-access", idToken: null });
  });

  it("returns nulls when neither session is live", async () => {
    const resolve = createAuthTokenResolver({
      resolvePrivyTokens: async () => ({ accessToken: null, idToken: null }),
      getDecaneToken: () => null,
    });

    await expect(resolve()).resolves.toEqual({ accessToken: null, idToken: null });
  });

  it("does not consult Decane while the Privy session holds", async () => {
    const getDecaneToken = vi.fn(() => "decane-access");
    const resolve = createAuthTokenResolver({
      resolvePrivyTokens: async () => ({ accessToken: "privy-access", idToken: null }),
      getDecaneToken,
    });

    await resolve();
    expect(getDecaneToken).not.toHaveBeenCalled();
  });
});
