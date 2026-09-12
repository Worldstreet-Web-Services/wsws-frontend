import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { verifyRequest } = vi.hoisted(() => ({ verifyRequest: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ verifyRequest }));

function makeReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("Alchemy sponsorship proxy", () => {
  beforeEach(() => {
    verifyRequest.mockReset();
    verifyRequest.mockResolvedValue({ userId: "user" });
    vi.stubEnv("ALCHEMY_GAS_MANAGER_API_KEY", "policy-owner-key");
    vi.stubEnv("ALCHEMY_API_KEY", "data-api-key");
    vi.stubEnv("ALCHEMY_API_KEY_FALLBACK", "different-account-key");
    vi.stubEnv("ALCHEMY_GAS_POLICY_ID", "base-policy");
    vi.stubEnv("ALCHEMY_POLYGON_GAS_POLICY_ID", "polygon-policy");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), {
            status: 200,
          })
      )
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses only the policy-owning primary key for Base sponsorship", async () => {
    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [{ sender: "0x1" }, "0xentrypoint"],
      }),
      "base-mainnet"
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("base-mainnet.g.alchemy.com/v2/policy-owner-key");
    expect(String(url)).not.toContain("data-api-key");
    expect(String(url)).not.toContain("different-account-key");
    expect((init?.headers as Record<string, string>)["x-alchemy-policy-id"]).toBe("base-policy");
  });

  it("keeps the existing primary key as a compatibility fallback", async () => {
    vi.stubEnv("ALCHEMY_GAS_MANAGER_API_KEY", "");
    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({ method: "eth_sendUserOperation", params: [] }),
      "base-mainnet"
    );

    expect(response.status).toBe(200);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "base-mainnet.g.alchemy.com/v2/data-api-key"
    );
  });

  it("rejects ordinary node reads so they stay on ZeroDev", async () => {
    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({ method: "eth_call", params: [] }),
      "base-mainnet"
    );

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("injects the Polygon policy into paymaster context", async () => {
    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_getPaymasterData",
        params: [{ sender: "0x1" }, "0xentrypoint", "0x89", {}],
      }),
      "polygon-mainnet"
    );

    expect(response.status).toBe(200);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body)).params[3]).toEqual({ policyId: "polygon-policy" });
    expect((init?.headers as Record<string, string>)["x-alchemy-policy-id"]).toBeUndefined();
  });

  it("fails closed when the Base policy is missing", async () => {
    vi.stubEnv("ALCHEMY_GAS_POLICY_ID", "");
    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({ method: "eth_sendUserOperation", params: [] }),
      "base-mainnet"
    );

    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires authentication before contacting Alchemy", async () => {
    verifyRequest.mockResolvedValue(null);
    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({ method: "eth_sendUserOperation", params: [] }),
      "base-mainnet"
    );

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rotates to the next PAIRED key+policy when the first key is rejected (comma pool)", async () => {
    // Reproduces the live incident: several keys packed into ALCHEMY_API_KEY,
    // the first rejected. The paired policy must advance with the key.
    vi.stubEnv("ALCHEMY_GAS_MANAGER_API_KEY", "");
    vi.stubEnv("ALCHEMY_API_KEY", "dead-key,live-key");
    vi.stubEnv("ALCHEMY_GAS_POLICY_ID", "dead-policy,live-policy");
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      const live = String(url).includes("live-key");
      return new Response(
        JSON.stringify(
          live
            ? { jsonrpc: "2.0", id: 1, result: "0xhash" }
            : { jsonrpc: "2.0", id: 1, error: { message: "Must be authenticated!" } }
        ),
        { status: live ? 200 : 401 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [{ sender: "0x1" }],
      }),
      "base-mainnet"
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url2, init2] = fetchMock.mock.calls[1];
    expect(String(url2)).toContain("/v2/live-key");
    // The SECOND key was sent with the SECOND policy — paired by index.
    expect((init2?.headers as Record<string, string>)["x-alchemy-policy-id"]).toBe("live-policy");
  });

  it("rotates past a key whose paired policy does not grant sponsorship (invalid fields)", async () => {
    // The key authenticates but its paired policy isn't that account's Base
    // Gas Manager policy, so the zero-fee op reads as "invalid fields". That's
    // pre-submission, so the next paired key+policy is tried until one sponsors.
    vi.stubEnv("ALCHEMY_GAS_MANAGER_API_KEY", "");
    vi.stubEnv("ALCHEMY_API_KEY", "mispaired-key,sponsoring-key");
    vi.stubEnv("ALCHEMY_GAS_POLICY_ID", "mismatched-policy,base-bso-policy");
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      const right = String(url).includes("sponsoring-key");
      return new Response(
        JSON.stringify(
          right
            ? { jsonrpc: "2.0", id: 1, result: { preVerificationGas: "0x1" } }
            : {
                jsonrpc: "2.0",
                id: 1,
                error: {
                  message:
                    "Invalid fields set on User Operation. User operation must include a paymaster for sponsorship.",
                },
              }
        ),
        { status: right ? 200 : 400 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_estimateUserOperationGas",
        params: [{ sender: "0x1" }],
      }),
      "base-mainnet"
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url2, init2] = fetchMock.mock.calls[1];
    expect(String(url2)).toContain("/v2/sponsoring-key");
    expect((init2?.headers as Record<string, string>)["x-alchemy-policy-id"]).toBe(
      "base-bso-policy"
    );
  });

  it("rotates past a wrong-TYPE and an OVER-BUDGET policy to the funded BSO pair", async () => {
    // The exact live failure: policy #1 is not a bundler-sponsorship policy,
    // policy #3 is BSO but over budget, only policy #4 sponsors. Each account's
    // key only works with its own policy (index-paired), so all four are in the
    // pool and the walk must reach the last, funded one.
    vi.stubEnv("ALCHEMY_GAS_MANAGER_API_KEY", "");
    vi.stubEnv("ALCHEMY_API_KEY", "key1,key2,key3,key4");
    vi.stubEnv("ALCHEMY_GAS_POLICY_ID", "pol1,pol2,pol3,pol4");
    const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
      const u = String(url);
      const msg = u.includes("/v2/key1")
        ? "Policy with ID 'pol1' does not support bundler sponsorship"
        : u.includes("/v2/key2")
          ? "Monthly capacity limit exceeded"
          : u.includes("/v2/key3")
            ? "This transaction’s USD cost will put your team over your monthly budget"
            : null;
      if (msg) {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: msg } }), {
          status: u.includes("key2") ? 429 : 400,
        });
      }
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0xhash" }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [{ sender: "0x1" }],
      }),
      "base-mainnet"
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const [url4, init4] = fetchMock.mock.calls[3];
    expect(String(url4)).toContain("/v2/key4");
    expect((init4?.headers as Record<string, string>)["x-alchemy-policy-id"]).toBe("pol4");
  });

  it("does NOT rotate on a genuine bundler error — a send that reached execution", async () => {
    vi.stubEnv("ALCHEMY_GAS_MANAGER_API_KEY", "");
    vi.stubEnv("ALCHEMY_API_KEY", "key-a,key-b");
    vi.stubEnv("ALCHEMY_GAS_POLICY_ID", "policy-a,policy-b");
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            error: { code: -32000, message: "replacement underpriced" },
          }),
          { status: 200 }
        )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { forwardAlchemyBundlerRequest } = await import("./alchemy-bundler");
    const response = await forwardAlchemyBundlerRequest(
      makeReq({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [{ sender: "0x1" }],
      }),
      "base-mainnet"
    );

    // The op was processed (a real JSON-RPC error, not a key rejection), so the
    // request must NOT be retried against another key.
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
