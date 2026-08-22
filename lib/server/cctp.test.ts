import { afterEach, describe, expect, it, vi } from "vitest";
import { concatHex, numberToHex, padHex, type Address, type Hex } from "viem";

import { requestRwasCctpQuote, requestRwasCctpStatus } from "@/lib/server/cctp";
import { addressToCctpBytes32, CCTP_TOKEN_MESSENGER_V2 } from "@/lib/trade/cctp";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

const WALLET = "0x1111111111111111111111111111111111111111" as Address;
const SOURCE_HASH = `0x${"a".repeat(64)}` as Hex;

function uint(value: bigint | number, size: number): Hex {
  return numberToHex(value, { size });
}

function attestedMessage(): Hex {
  const messenger = addressToCctpBytes32(CCTP_TOKEN_MESSENGER_V2);
  const wallet = addressToCctpBytes32(WALLET);
  return concatHex([
    uint(1, 4),
    uint(6, 4),
    uint(0, 4),
    uint(77, 32),
    messenger,
    messenger,
    wallet,
    uint(1_000, 4),
    uint(1_000, 4),
    uint(1, 4),
    padHex(USDC_BY_CHAIN.base.address as Address, { size: 32 }),
    wallet,
    uint(1_000_000, 32),
    wallet,
    uint(164, 32),
    uint(130, 32),
    uint(99_999_999, 32),
  ]);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RWA CCTP adapter", () => {
  it("quotes fractional fast-transfer fees with a bounded max-fee buffer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json([
          { finalityThreshold: 1_000, minimumFee: 1.3 },
          { finalityThreshold: 2_000, minimumFee: 0 },
        ])
      )
      .mockResolvedValueOnce(
        Response.json({ allowance: 50_245_266.979113, lastUpdated: "2026-08-21T00:00:00Z" })
      );
    vi.stubGlobal("fetch", fetchMock);

    const quote = await requestRwasCctpQuote({ amount: "1000000", depositor: WALLET });

    expect(quote).toMatchObject({
      inputAmount: "1000000",
      expectedOutputAmount: "999870",
      minOutputAmount: "999836",
      maxFee: "164",
      feeBps: "1.3",
    });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://iris-api.circle.com/v2/burn/USDC/fees/6/0",
      "https://iris-api.circle.com/v2/fastBurn/USDC/allowance",
    ]);
  });

  it("rejects a burn above the current Fast Transfer allowance", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json([{ finalityThreshold: 1_000, minimumFee: 1 }])
        )
        .mockResolvedValueOnce(Response.json({ allowance: 0.5 }))
    );

    await expect(
      requestRwasCctpQuote({ amount: "1000000", depositor: WALLET })
    ).rejects.toMatchObject({ code: "CCTP_FAST_ALLOWANCE_LOW", status: 503 });
  });

  it("returns only an attestation that exactly matches the requested burn", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          sourceTxHash: SOURCE_HASH,
          messages: [
            {
              message: attestedMessage(),
              attestation: `0x${"b".repeat(130)}`,
              cctpVersion: 2,
              status: "complete",
            },
          ],
        })
      )
    );

    await expect(
      requestRwasCctpStatus({
        sourceTransactionHash: SOURCE_HASH,
        depositor: WALLET,
        amount: "1000000",
      })
    ).resolves.toMatchObject({
      status: "complete",
      outputAmount: "999870",
      feeExecuted: "130",
    });
  });
});
