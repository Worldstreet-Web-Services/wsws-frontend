import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";

import {
  prepareRwasOneInchOrder,
  requestRwasOneInchQuote,
  submitRwasOneInchOrder,
} from "@/lib/server/rwas-oneinch";

const WALLET = "0x1111111111111111111111111111111111111111";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const ASSET = "0x122940c4c5f9ccfae7fa86455a42d3ec140855ce";

const mocks = vi.hoisted(() => ({ requestRwas: vi.fn() }));

vi.mock("@/lib/server/rwas", () => ({ requestRwas: mocks.requestRwas }));
vi.mock("@/lib/api/schemas/rwas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/schemas/rwas")>();
  const { z } = await import("zod");
  return { ...actual, marketAssetDetailsSchema: z.any() };
});

function fusionPayload(overrides: Record<string, unknown> = {}) {
  const preset = {
    auctionDuration: 180,
    startAuctionIn: 60,
    bankFee: "0",
    initialRateBump: 0,
    auctionStartAmount: "226636609052320877",
    auctionEndAmount: "201981513435189671",
    tokenFee: "12348728209594601",
    exclusiveResolver: null,
    estP: 100,
    allowPartialFills: true,
    allowMultipleFills: true,
    gasCost: { gasBumpEstimate: 0, gasPriceEstimate: "1000000000" },
    points: [],
    startAmount: "213612336576793740",
  };
  return {
    quoteId: "324ac5bf-735b-4803-a7be-991755752b06",
    fromTokenAmount: "10000000",
    toTokenAmount: "226636609542967402",
    feeToken: ASSET,
    presets: {
      fast: preset,
      medium: preset,
      slow: preset,
    },
    fee: {
      receiver: "0x2222222222222222222222222222222222222222",
      bps: 0,
      whitelistDiscountPercent: 0,
    },
    integratorFee: 0,
    integratorFeeShare: 0,
    settlementAddress: "0x1111111254eeb25477b68fb85ed929f73a960582",
    whitelist: ["0x3333333333333333333333333333333333333333"],
    recommended_preset: "fast",
    prices: { usd: { fromToken: "0.9964", toToken: "43.82" } },
    volume: { usd: { fromToken: "9.964", toToken: "9.932" } },
    priceImpactPercent: 0.32,
    autoK: 1,
    marketAmount: "226636609542967402",
    quoteGeneratedAt: 1_787_346_342_731,
    source: "ark-rwas",
    ...overrides,
  };
}

function viableFusionPayload() {
  const preset = {
    auctionDuration: 60,
    startAuctionIn: 1,
    bankFee: "0",
    initialRateBump: 0,
    auctionStartAmount: "995000000000000000",
    auctionEndAmount: "985000000000000000",
    tokenFee: "1000000000000000",
    exclusiveResolver: null,
    estP: 100,
    allowPartialFills: true,
    allowMultipleFills: true,
    gasCost: { gasBumpEstimate: 0, gasPriceEstimate: "1000000000" },
    points: [],
    startAmount: "994000000000000000",
  };
  return fusionPayload({
    fromTokenAmount: "50000000",
    toTokenAmount: "1000000000000000000",
    presets: { fast: preset, medium: preset, slow: preset },
    prices: { usd: { fromToken: "1", toToken: "50" } },
    volume: { usd: { fromToken: "50", toToken: "50" } },
    priceImpactPercent: 0,
    marketAmount: "1000000000000000000",
  });
}

beforeEach(() => {
  process.env.ONEINCH_API_KEY = "test-server-key";
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
  delete process.env.ONEINCH_API_KEY;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RWA 1inch Fusion coverage adapter", () => {
  it("normalizes the post-resolver buy output and keeps the API key server-side", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(fusionPayload()));
    vi.stubGlobal("fetch", fetchMock);

    const quote = await requestRwasOneInchQuote(
      { symbol: "IBITon", side: "buy", amount: "10", walletAddress: WALLET },
      "request-1"
    );

    expect(quote).toMatchObject({
      provider: "1inch-fusion",
      side: "buy",
      input: { address: USDC, amount: "10000000" },
      output: {
        address: ASSET,
        amount: "213612336576793740",
        marketAmount: "226636609542967402",
        minimumAmount: "189632785225595070",
      },
      resolverFee: { tokenAddress: ASSET, amount: "12348728209594601" },
      economicallyViable: false,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const query = new URL(url).searchParams;
    expect(query.get("fromTokenAddress")).toBe(USDC);
    expect(query.get("toTokenAddress")).toBe(ASSET);
    expect(query.get("enableEstimate")).toBe("true");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-server-key");
  });

  it("supports sell coverage using the token's published Ethereum decimals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          fusionPayload({
            fromTokenAmount: "27350000000000000",
            toTokenAmount: "1198827",
            feeToken: USDC,
            presets: {
              fast: {
                auctionDuration: 180,
                startAuctionIn: 60,
                bankFee: "0",
                initialRateBump: 0,
                auctionStartAmount: "1198827",
                auctionEndAmount: "589791",
                tokenFee: "543100",
                exclusiveResolver: null,
                estP: 100,
                allowPartialFills: true,
                allowMultipleFills: true,
                gasCost: { gasBumpEstimate: 0, gasPriceEstimate: "1000000000" },
                points: [],
                startAmount: "652323",
              },
              medium: {
                auctionDuration: 180,
                startAuctionIn: 60,
                bankFee: "0",
                initialRateBump: 0,
                auctionStartAmount: "1198827",
                auctionEndAmount: "589791",
                tokenFee: "543100",
                exclusiveResolver: null,
                estP: 100,
                allowPartialFills: true,
                allowMultipleFills: true,
                gasCost: { gasBumpEstimate: 0, gasPriceEstimate: "1000000000" },
                points: [],
                startAmount: "652323",
              },
              slow: {
                auctionDuration: 180,
                startAuctionIn: 60,
                bankFee: "0",
                initialRateBump: 0,
                auctionStartAmount: "1198827",
                auctionEndAmount: "589791",
                tokenFee: "543100",
                exclusiveResolver: null,
                estP: 100,
                allowPartialFills: true,
                allowMultipleFills: true,
                gasCost: { gasBumpEstimate: 0, gasPriceEstimate: "1000000000" },
                points: [],
                startAmount: "652323",
              },
            },
            marketAmount: "1198827",
            volume: { usd: { fromToken: "1.1986", toToken: "1.1946" } },
          })
        )
      )
    );

    const quote = await requestRwasOneInchQuote(
      { symbol: "IBITon", side: "sell", amount: "0.02735", walletAddress: WALLET },
      "request-2"
    );

    expect(quote).toMatchObject({
      side: "sell",
      input: { address: ASSET, amount: "27350000000000000" },
      output: { address: USDC, amount: "652323", minimumAmount: "46691" },
      economicallyViable: false,
    });
  });

  it("rejects a malformed preset instead of reporting false coverage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          fusionPayload({
            presets: {
              fast: {
                auctionDuration: 180,
                startAuctionIn: 60,
                bankFee: "0",
                initialRateBump: 0,
                auctionStartAmount: "226636609052320877",
                auctionEndAmount: "220000000000000000",
                tokenFee: "0",
                exclusiveResolver: null,
                estP: 100,
                allowPartialFills: true,
                allowMultipleFills: true,
                gasCost: { gasBumpEstimate: 0, gasPriceEstimate: "1000000000" },
                points: [],
                startAmount: "210000000000000000",
              },
            },
          })
        )
      )
    );

    await expect(
      requestRwasOneInchQuote(
        { symbol: "IBITon", side: "buy", amount: "10", walletAddress: WALLET },
        "request-3"
      )
    ).rejects.toMatchObject({ code: "ONEINCH_CONTRACT_CHANGED", status: 502 });
  });

  it("fails closed when the server credential is absent", async () => {
    delete process.env.ONEINCH_API_KEY;
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      requestRwasOneInchQuote(
        { symbol: "IBITon", side: "buy", amount: "10", walletAddress: WALLET },
        "request-4"
      )
    ).rejects.toMatchObject({ code: "ONEINCH_NOT_CONFIGURED", status: 503 });
  });

  it("builds a short-lived Fusion order without exposing the server credential", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(viableFusionPayload())));

    const prepared = await prepareRwasOneInchOrder(
      { symbol: "IBITon", side: "buy", amount: "50", walletAddress: WALLET },
      "request-5"
    );

    expect(prepared).toMatchObject({
      quote: { economicallyViable: true },
      approval: {
        chainId: 1,
        tokenAddress: USDC,
        spenderAddress: "0x111111125421ca6dc452d289314280a0f8842a65",
        amount: "50000000",
      },
      typedData: {
        domain: {
          name: "1inch Aggregation Router",
          version: "6",
          chainId: 1,
          verifyingContract: "0x111111125421ca6dc452d289314280a0f8842a65",
        },
        message: { maker: WALLET, makerAsset: USDC, takerAsset: ASSET },
      },
    });
    expect(prepared.ticket).not.toContain("test-server-key");
    expect(Date.parse(prepared.expiresAt)).toBeGreaterThan(Date.now());
  });

  it("verifies the maker signature before relaying the Fusion order", async () => {
    const account = privateKeyToAccount(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(viableFusionPayload()))
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetchMock);
    const prepared = await prepareRwasOneInchOrder(
      { symbol: "IBITon", side: "buy", amount: "50", walletAddress: account.address },
      "request-6"
    );
    const signature = await account.signTypedData({
      domain: {
        ...prepared.typedData.domain,
        verifyingContract: prepared.typedData.domain.verifyingContract as Address,
      },
      primaryType: prepared.typedData.primaryType,
      types: { Order: prepared.typedData.types.Order },
      message: prepared.typedData.message,
    });

    await expect(
      submitRwasOneInchOrder({ ticket: prepared.ticket, signature }, "request-7")
    ).resolves.toEqual({ orderHash: prepared.orderHash, status: "pending" });
    const [, relayerInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(new Headers(relayerInit.headers).get("authorization")).toBe("Bearer test-server-key");
    expect(JSON.parse(String(relayerInit.body))).toMatchObject({
      order: { maker: account.address.toLowerCase() },
      signature,
      quoteId: prepared.quote.quoteId,
    });
  });
});
