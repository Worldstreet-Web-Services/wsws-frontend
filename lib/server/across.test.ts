import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  requestEthereumUsdcToBaseQuote,
  requestRwasAcrossQuote,
  requestRwasAcrossStatus,
} from "@/lib/server/across";

const WALLET = "0x1111111111111111111111111111111111111111";
const TX_HASH = `0x${"a".repeat(64)}`;
const originalApiKey = process.env.ACROSS_API_KEY;
const originalIntegratorId = process.env.ACROSS_API_INTEGRATOR_ID;

function quotePayload() {
  return {
    id: "quote-1",
    inputAmount: "10000000",
    expectedOutputAmount: "9970000",
    minOutputAmount: "9900000",
    expectedFillTime: 7,
    quoteExpiryTimestamp: Math.floor(Date.now() / 1_000) + 60,
    approvalTxns: [
      { chainId: 8453, to: WALLET, data: "0x095ea7b3", value: "0" },
    ],
    checks: {
      balance: { actual: "12000000", expected: "10000000" },
    },
    swapTx: {
      simulationSuccess: true,
      chainId: 8453,
      to: "0x2222222222222222222222222222222222222222",
      data: "0x1234",
      value: "0",
    },
  };
}

beforeEach(() => {
  process.env.ACROSS_API_KEY = "test-key";
  process.env.ACROSS_API_INTEGRATOR_ID = "0x02a2";
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalApiKey === undefined) delete process.env.ACROSS_API_KEY;
  else process.env.ACROSS_API_KEY = originalApiKey;
  if (originalIntegratorId === undefined) delete process.env.ACROSS_API_INTEGRATOR_ID;
  else process.env.ACROSS_API_INTEGRATOR_ID = originalIntegratorId;
});

describe("custom RWA Across adapter", () => {
  it("requests only exact-input Base USDC to Ethereum USDC routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(quotePayload()));
    vi.stubGlobal("fetch", fetchMock);

    const quote = await requestRwasAcrossQuote({ amount: "10000000", depositor: WALLET });

    expect(quote.expectedOutputAmount).toBe("9970000");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsedUrl = new URL(url);
    expect(parsedUrl.pathname).toBe("/api/swap/approval");
    expect(parsedUrl.searchParams.get("tradeType")).toBe("exactInput");
    expect(parsedUrl.searchParams.get("originChainId")).toBe("8453");
    expect(parsedUrl.searchParams.get("destinationChainId")).toBe("1");
    expect(parsedUrl.searchParams.get("integratorId")).toBe("0x02a2");
    expect(parsedUrl.searchParams.get("recipient")).toBe(WALLET);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-key");
  });

  it("defers origin simulation to the sponsored approval-plus-deposit batch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          ...quotePayload(),
          swapTx: { ...quotePayload().swapTx, simulationSuccess: false },
        })
      )
    );

    await expect(
      requestRwasAcrossQuote({ amount: "10000000", depositor: WALLET })
    ).resolves.toMatchObject({ id: "quote-1", inputAmount: "10000000" });
  });

  it("normalizes a null approval list returned by Across", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          ...quotePayload(),
          approvalTxns: null,
        })
      )
    );

    await expect(
      requestRwasAcrossQuote({ amount: "10000000", depositor: WALLET })
    ).resolves.toMatchObject({ approvalTxns: [] });
  });

  it("requests exact-input Ethereum USDC to Base USDC return routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        ...quotePayload(),
        inputAmount: "581972",
        expectedOutputAmount: "578587",
        minOutputAmount: "578587",
        approvalTxns: [
          { chainId: 1, to: WALLET, data: "0x095ea7b3", value: "0" },
        ],
        checks: { balance: { actual: "581972", expected: "581972" } },
        swapTx: { ...quotePayload().swapTx, chainId: 1 },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const quote = await requestEthereumUsdcToBaseQuote({
      amount: "581972",
      depositor: WALLET,
    });

    expect(quote.expectedOutputAmount).toBe("578587");
    const [url] = fetchMock.mock.calls[0] as [string];
    const parsedUrl = new URL(url);
    expect(parsedUrl.searchParams.get("originChainId")).toBe("1");
    expect(parsedUrl.searchParams.get("destinationChainId")).toBe("8453");
  });

  it("treats a not-yet-indexed source transaction as pending", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
        Response.json(
          { error: "DepositNotFoundException", message: "Deposit not found" },
          { status: 404 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestRwasAcrossStatus(TX_HASH)).resolves.toEqual({
      status: "pending",
      depositTxnRef: TX_HASH,
      fillTxnRef: null,
      refundTxnRef: null,
    });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(new URL(url).searchParams.has("integratorId")).toBe(false);
  });
});
