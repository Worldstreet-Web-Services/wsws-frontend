import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestRwasDexQuote } from "@/lib/server/rwas-dex";

const WALLET = "0x1111111111111111111111111111111111111111";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const ASSET = "0x122940c4c5f9ccfae7fa86455a42d3ec140855ce";
const SPENDER = "0x0000000000001fF3684f28c67538d4D072C22734";

const mocks = vi.hoisted(() => ({ requestRwas: vi.fn() }));

vi.mock("@/lib/server/rwas", () => ({ requestRwas: mocks.requestRwas }));
vi.mock("@/lib/api/schemas/rwas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/schemas/rwas")>();
  const { z } = await import("zod");
  return { ...actual, marketAssetDetailsSchema: z.any() };
});

function socketPayload(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    result: {
      input: {
        token: { chainId: 1, address: USDC, symbol: "USDC", decimals: 6 },
        amount: "1200000",
        valueInUsd: 1.2,
      },
      routes: [
        {
          userOp: "tx",
          quoteId: `0x${"1".repeat(64)}`,
          expiresAt: Math.floor(Date.now() / 1_000) + 60,
          output: {
            token: { chainId: 1, address: ASSET, symbol: "IBITon", decimals: 18 },
            amount: "27000000000000000",
            minAmountOut: "26865000000000000",
            valueInUsd: 1.19,
            isSimulated: true,
          },
          estimatedTime: 1,
          routeDetails: {
            dexDetails: {
              protocol: { name: "bitget", displayName: "Bitget" },
              inputTokenAddress: USDC,
              outputTokenAddress: ASSET,
              amountIn: "1200000",
            },
          },
          approval: {
            spenderAddress: SPENDER,
            amount: "1200000",
            tokenAddress: USDC,
            userAddress: WALLET,
          },
          txData: {
            kind: "evm_tx",
            object: { chainId: 1, to: SPENDER, data: "0x1234", value: "0" },
          },
          gasFee: { feeInUsd: 0.02 },
          isDepositTx: false,
          ...overrides,
        },
      ],
    },
  };
}

beforeEach(() => {
  mocks.requestRwas.mockResolvedValue(
    Response.json({
      success: true,
      data: {
        asset: { symbol: "IBITon" },
        networks: [{ chainId: 1, address: ASSET, decimals: 18 }],
      },
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RWA Ethereum venue adapter", () => {
  it("returns only a live simulated secondary quote for the exact wallet and amount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(socketPayload()));
    vi.stubGlobal("fetch", fetchMock);

    const quote = await requestRwasDexQuote(
      { symbol: "IBITon", side: "buy", amount: "1.2", walletAddress: WALLET },
      "request-1"
    );

    expect(quote).toMatchObject({
      provider: "bitget",
      simulated: true,
      input: { address: USDC, amount: "1200000" },
      output: { address: ASSET, minimumAmount: "26865000000000000" },
    });
    const [url] = fetchMock.mock.calls[0] as [string];
    const query = new URL(url).searchParams;
    expect(query.get("originChainId")).toBe("1");
    expect(query.get("destinationChainId")).toBe("1");
    expect(query.get("includeProvider")).toBe("bitget");
    expect(query.get("simulatedQuotesRequired")).toBe("true");
    expect(query.get("userAddress")).toBe(WALLET);
  });

  it.each([
    ["unsimulated", {}],
    ["deposit", { isDepositTx: true }],
    [
      "over-approval",
      {
        approval: {
          spenderAddress: SPENDER,
          amount: "999999999999",
          tokenAddress: USDC,
          userAddress: WALLET,
        },
      },
    ],
  ])("rejects a %s provider route", async (_name, override) => {
    const payload = socketPayload(override);
    if (_name === "unsimulated") {
      const route = payload.result.routes[0];
      route.output = { ...route.output, isSimulated: false };
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));

    await expect(
      requestRwasDexQuote(
        { symbol: "IBITon", side: "buy", amount: "1.2", walletAddress: WALLET },
        "request-2"
      )
    ).rejects.toMatchObject({ code: "DEX_ROUTE_UNAVAILABLE", status: 409 });
  });

  it("does not ask a venue for an asset without an Ethereum deployment", async () => {
    mocks.requestRwas.mockResolvedValue(
      Response.json({
        success: true,
        data: {
          asset: { symbol: "SOLon" },
          networks: [
            { chainId: 101, address: "So11111111111111111111111111111111111111112", decimals: 9 },
          ],
        },
      })
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestRwasDexQuote(
        { symbol: "SOLon", side: "buy", amount: "1.2", walletAddress: WALLET },
        "request-3"
      )
    ).rejects.toMatchObject({ code: "ETHEREUM_UNAVAILABLE", status: 409 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
