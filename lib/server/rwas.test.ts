import { afterEach, describe, expect, it, vi } from "vitest";

import {
  invalidRwasQuery,
  isAllowedRwasPath,
  requestRwas,
  rwasCacheControl,
} from "@/lib/server/rwas";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RWAS proxy boundaries", () => {
  it("allows only list, single-symbol detail, and history reads", () => {
    expect(isAllowedRwasPath("market-assets")).toBe(true);
    expect(isAllowedRwasPath("market-assets/MRNAon")).toBe(true);
    expect(isAllowedRwasPath("market-assets/MRNAon/history")).toBe(true);
    expect(isAllowedRwasPath("health")).toBe(false);
    expect(isAllowedRwasPath("market-assets/a/b")).toBe(false);
    expect(isAllowedRwasPath("market-assets/MRNAon/history/more")).toBe(false);
    expect(isAllowedRwasPath("market-assets/../ready")).toBe(false);
    expect(isAllowedRwasPath("market-assets/%2e%2e%2fready")).toBe(false);
  });

  it("allows one bounded history range and rejects arbitrary query expansion", () => {
    expect(
      invalidRwasQuery("market-assets/IBITon/history", new URLSearchParams("range=1month"))
    ).toBeNull();
    expect(
      invalidRwasQuery("market-assets/IBITon/history", new URLSearchParams("range=1day&range=all"))
    ).toContain("one supported range");
    expect(
      invalidRwasQuery("market-assets/IBITon/history", new URLSearchParams("range=1week"))
    ).toBeNull();
    expect(
      invalidRwasQuery("market-assets/IBITon/history", new URLSearchParams("range=2week"))
    ).toContain("one supported range");
  });

  it("accepts repeated documented filters and rejects accidental proxy expansion", () => {
    const valid = new URLSearchParams([
      ["tagFilters", "technology"],
      ["tagFilters", "large-cap"],
      ["pricedOnly", "true"],
      ["page", "2"],
    ]);
    expect(invalidRwasQuery("market-assets", valid)).toBeNull();
    expect(invalidRwasQuery("market-assets", new URLSearchParams("admin=true"))).toContain(
      "Unsupported"
    );
    expect(invalidRwasQuery("market-assets/NVDAon", new URLSearchParams("page=2"))).toContain(
      "do not accept"
    );
  });

  it("uses shorter catalogue caching and longer immutable detail caching", () => {
    expect(rwasCacheControl("market-assets")).toContain("s-maxage=30");
    expect(rwasCacheControl("market-assets/NVDAon")).toContain("s-maxage=300");
    expect(rwasCacheControl("market-assets/NVDAon/history")).toContain("s-maxage=30");
  });

  it("forwards a public quote method and body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await requestRwas("market-assets/SOXLon/quote", new URLSearchParams(), "request-1", {
      method: "POST",
      body: JSON.stringify({ side: "buy", amount: "10" }),
    });

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ side: "buy", amount: "10" }));
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-request-id")).toBe("request-1");
  });
});
