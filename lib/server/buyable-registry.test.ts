import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The holdings allowlist admits a memecoin only if the trade catalog names it.
// The catalog holds ~700 rows over seven pages; reading page one alone hid
// every holding past it ("I had three assets, two disappeared" on
// 2026-09-07), and dropping the Solana rows hid every Solana memecoin.

const upstream = vi.hoisted(() => ({
  dextopusRequest: vi.fn(
    async () => new Response(JSON.stringify({ destinations: [] }), { status: 200 })
  ),
}));
vi.mock("@/lib/server/dextopus", () => ({ dextopusRequest: upstream.dextopusRequest }));

const BASE_P1 = "0xaaaa000000000000000000000000000000000001";
const BASE_P3 = "0xcccc000000000000000000000000000000000003";
const SOL_P2 = "BonkMintAddressCaseSensitive1111111111111";

function page(items: unknown[], pageNo: number, total: number): Response {
  return new Response(
    JSON.stringify({ success: true, data: { items, meta: { page: pageNo, limit: 100, total } } }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

describe("fetchBuyableRegistry: the trade catalog", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_TRADE_API_URL", "https://trade.test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("walks every page, so a holding on page three is still a recognised holding", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === "string" ? input : ((input as URL).href ?? (input as Request).url);
        seen.push(url);
        const p = Number(new URL(url).searchParams.get("page"));
        if (p === 1)
          return page(
            [{ chainId: 8453, address: BASE_P1, priceUsd: "1.5", logoUrl: "l1" }],
            1,
            250
          );
        if (p === 2)
          return page(
            [{ chainId: 101, address: SOL_P2, priceUsd: "0.00002", logoUrl: null }],
            2,
            250
          );
        if (p === 3)
          return page(
            [{ chainId: 8453, address: BASE_P3.toUpperCase().replace("0X", "0x"), priceUsd: null }],
            3,
            250
          );
        return page([], p, 250);
      })
    );
    const { fetchBuyableRegistry } = await import("./buyable-registry");

    const { buyable, meme } = await fetchBuyableRegistry();

    expect(seen.filter((u) => u.includes("/tokens?")).length).toBe(3);
    expect(buyable["base-mainnet"]?.has(BASE_P1)).toBe(true);
    expect(buyable["base-mainnet"]?.has(BASE_P3)).toBe(true);
    expect(meme["base-mainnet"]?.get(BASE_P1)).toEqual({ logo: "l1", priceUsd: 1.5 });
  });

  it("keeps the Solana rows under solana-mainnet, lowercased like every other registry key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        page([{ chainId: 101, address: SOL_P2, priceUsd: "0.00002", logoUrl: "sl" }], 1, 1)
      )
    );
    const { fetchBuyableRegistry } = await import("./buyable-registry");
    const { buyable, meme } = await fetchBuyableRegistry();
    expect(buyable["solana-mainnet"]?.has(SOL_P2.toLowerCase())).toBe(true);
    expect(meme["solana-mainnet"]?.get(SOL_P2.toLowerCase())).toEqual({
      logo: "sl",
      priceUsd: 0.00002,
    });
  });

  it("keeps what it has and says so when a later page fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === "string" ? input : ((input as URL).href ?? (input as Request).url);
        const p = Number(new URL(url).searchParams.get("page"));
        if (p === 1) return page([{ chainId: 8453, address: BASE_P1 }], 1, 150);
        return new Response("upstream down", { status: 502 });
      })
    );
    const { fetchBuyableRegistry } = await import("./buyable-registry");
    const { buyable } = await fetchBuyableRegistry();
    expect(buyable["base-mainnet"]?.has(BASE_P1)).toBe(true);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toMatch(/trade catalog/);
  });

  it("stops at the page cap even if the catalog claims more", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return page(
          [{ chainId: 8453, address: `0x${String(calls).padStart(40, "0")}` }],
          calls,
          100_000
        );
      })
    );
    const { fetchBuyableRegistry, CATALOG_MAX_PAGES } = await import("./buyable-registry");
    await fetchBuyableRegistry();
    expect(calls).toBe(CATALOG_MAX_PAGES);
  });
});
