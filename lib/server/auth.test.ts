import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const privy = vi.hoisted(() => ({
  getByToken: vi.fn(),
  getById: vi.fn(),
  verifyToken: vi.fn(),
}));

const decane = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  safeVerifyToken: vi.fn(),
  getAddresses: vi.fn(),
}));

vi.mock("@/lib/server/privy", () => ({
  getPrivyClient: () => ({
    users: () => ({
      get: privy.getByToken,
      _get: privy.getById,
    }),
    utils: () => ({
      auth: () => ({ verifyAccessToken: privy.verifyToken }),
    }),
  }),
}));

vi.mock("@/lib/server/decane", () => ({
  getDecaneClient: () => ({
    verifyAccessToken: decane.verifyToken,
    safeVerifyAccessToken: decane.safeVerifyToken,
    getAddresses: decane.getAddresses,
  }),
  decaneConfigured: () => true,
}));

import { getRequestIdentity, getRequestUser, verifyRequest } from "@/lib/server/auth";

function makeReq(headers?: Record<string, string>): NextRequest {
  return {
    headers: new Headers(headers),
    cookies: { get: vi.fn(() => undefined) },
  } as unknown as NextRequest;
}

describe("verifyRequest", () => {
  beforeEach(() => {
    privy.verifyToken.mockReset();
    decane.verifyToken.mockReset();
  });

  it("returns null when the request carries no token", async () => {
    const claims = await verifyRequest(makeReq());

    expect(claims).toBeNull();
    expect(privy.verifyToken).not.toHaveBeenCalled();
    expect(decane.verifyToken).not.toHaveBeenCalled();
  });

  it("accepts a Privy token after Decane declines it", async () => {
    privy.verifyToken.mockResolvedValue({
      user_id: "privy_user",
      session_id: "privy_session",
      issued_at: 1,
      expiration: 2,
    });

    decane.verifyToken.mockRejectedValue(new Error("not a decane token"));

    const claims = await verifyRequest(makeReq({ authorization: "Bearer privy-token" }));

    expect(claims).toEqual({
      userId: "privy_user",
      sessionId: "privy_session",
      issuedAt: 1,
      expiration: 2,
    });
    expect(decane.verifyToken).toHaveBeenCalledTimes(1);
  });

  it("accepts a Decane token without consulting Privy", async () => {
    decane.verifyToken.mockResolvedValue({
      userId: "decane_user",
      subject: "subject_1",
      tokenId: "jti_1",
      issuedAt: 10,
      expiresAt: 20,
      raw: {},
    });

    const claims = await verifyRequest(makeReq({ authorization: "Bearer decane-token" }));

    expect(claims).toEqual({
      userId: "decane_user",
      sessionId: "jti_1",
      issuedAt: 10,
      expiration: 20,
    });
    expect(privy.verifyToken).not.toHaveBeenCalled();
  });

  it("keys Decane claims on the subject when the token has no token id", async () => {
    decane.verifyToken.mockResolvedValue({
      userId: "decane_user",
      subject: "subject_1",
      raw: {},
    });

    const claims = await verifyRequest(makeReq({ authorization: "Bearer decane-token" }));

    expect(claims).toEqual({
      userId: "decane_user",
      sessionId: "subject_1",
      issuedAt: 0,
      expiration: 0,
    });
  });

  it("returns null when neither issuer verifies the token", async () => {
    privy.verifyToken.mockRejectedValue(new Error("not a privy token"));
    decane.verifyToken.mockRejectedValue(new Error("not a decane token"));

    const claims = await verifyRequest(makeReq({ authorization: "Bearer junk" }));

    expect(claims).toBeNull();
  });
});

describe("getRequestIdentity", () => {
  beforeEach(() => {
    privy.getByToken.mockReset();
    privy.getById.mockReset();
    decane.safeVerifyToken.mockReset();
    decane.getAddresses.mockReset();
  });

  it("resolves a Decane session through Decane's address endpoint", async () => {
    decane.safeVerifyToken.mockResolvedValue({ userId: "decane_user", subject: "s", raw: {} });
    decane.getAddresses.mockResolvedValue({ evm: "0xNew", solana: "SoNew" });

    const identity = await getRequestIdentity(makeReq({ authorization: "Bearer decane-token" }), {
      userId: "decane_user",
      sessionId: "jti_id_1",
      issuedAt: 1,
      expiration: 2,
    });

    expect(identity).toEqual({
      userId: "decane_user",
      evmAddress: "0xNew",
      solanaAddress: "SoNew",
    });
    expect(privy.getByToken).not.toHaveBeenCalled();
    expect(privy.getById).not.toHaveBeenCalled();
  });

  it("falls back to the Privy user for a Privy session, preferring the embedded wallet", async () => {
    decane.safeVerifyToken.mockResolvedValue(null);
    privy.getById.mockResolvedValue({
      id: "privy_user",
      linked_accounts: [
        {
          type: "wallet",
          chain_type: "ethereum",
          wallet_client_type: "metamask",
          address: "0xExternal",
        },
        {
          type: "wallet",
          chain_type: "ethereum",
          wallet_client_type: "privy",
          address: "0xEmbedded",
        },
        {
          type: "wallet",
          chain_type: "solana",
          wallet_client_type: "privy",
          address: "SoEmbedded",
        },
      ],
    });

    const identity = await getRequestIdentity(makeReq({ authorization: "Bearer privy-token" }), {
      userId: "privy_user",
      sessionId: "session_id_1",
      issuedAt: 1,
      expiration: 2,
    });

    expect(identity).toEqual({
      userId: "privy_user",
      evmAddress: "0xEmbedded",
      solanaAddress: "SoEmbedded",
    });
  });

  it("returns null when no issuer can identify the caller", async () => {
    decane.safeVerifyToken.mockResolvedValue(null);
    privy.getById.mockRejectedValue(new Error("unknown user"));

    const identity = await getRequestIdentity(makeReq({ authorization: "Bearer junk" }), {
      userId: "nobody",
      sessionId: "session_id_2",
      issuedAt: 1,
      expiration: 2,
    });

    expect(identity).toBeNull();
  });

  it("caches the identity per verified session", async () => {
    decane.safeVerifyToken.mockResolvedValue({ userId: "decane_cached", subject: "s", raw: {} });
    decane.getAddresses.mockResolvedValue({ evm: "0xC", solana: null });
    const claims = { userId: "decane_cached", sessionId: "jti_cached", issuedAt: 1, expiration: 2 };

    const first = await getRequestIdentity(makeReq({ authorization: "Bearer t" }), claims);
    const second = await getRequestIdentity(makeReq({ authorization: "Bearer t" }), claims);

    expect(first).toEqual(second);
    expect(decane.getAddresses).toHaveBeenCalledTimes(1);
  });
});

describe("server auth helpers", () => {
  beforeEach(() => {
    privy.getByToken.mockReset();
    privy.getById.mockReset();
    decane.safeVerifyToken.mockReset();
    decane.safeVerifyToken.mockResolvedValue(null);
  });

  it("prefers the identity token when one is present", async () => {
    privy.getByToken.mockResolvedValue({ id: "user_token" });

    const user = await getRequestUser(makeReq({ "privy-id-token": "id-token" }), {
      userId: "user_claim",
      sessionId: "session_1",
      issuedAt: 1,
      expiration: 2,
    });

    expect(privy.getByToken).toHaveBeenCalledWith({ id_token: "id-token" });
    expect(privy.getById).not.toHaveBeenCalled();
    expect(user).toEqual({ id: "user_token" });
  });

  it("falls back to the verified user id when the identity token is missing", async () => {
    privy.getById.mockResolvedValue({ id: "user_claim" });

    const user = await getRequestUser(makeReq(), {
      userId: "user_claim",
      sessionId: "session_2",
      issuedAt: 1,
      expiration: 2,
    });

    expect(privy.getByToken).not.toHaveBeenCalled();
    expect(privy.getById).toHaveBeenCalledWith("user_claim");
    expect(user).toEqual({ id: "user_claim" });
  });

  it("reuses the resolved user for repeated requests in one verified session", async () => {
    privy.getByToken.mockResolvedValue({ id: "user_cached" });
    const claims = {
      userId: "user_cached",
      sessionId: "session_cached",
      issuedAt: 1,
      expiration: 2,
    };

    const first = await getRequestUser(makeReq({ "privy-id-token": "id-token" }), claims);
    const second = await getRequestUser(makeReq({ "privy-id-token": "id-token" }), claims);

    expect(first).toEqual({ id: "user_cached" });
    expect(second).toEqual({ id: "user_cached" });
    expect(privy.getByToken).toHaveBeenCalledTimes(1);
  });
});
