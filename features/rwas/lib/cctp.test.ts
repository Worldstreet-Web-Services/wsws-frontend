import {
  concatHex,
  decodeFunctionData,
  encodeFunctionResult,
  numberToHex,
  padHex,
  type Address,
  type Hex,
} from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchRwasCctpMessageReceived } from "@/features/rwas/lib/cctp";
import { addressToCctpBytes32, CCTP_TOKEN_MESSENGER_V2 } from "@/lib/trade/cctp";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiFetch: mocks.apiFetch }));

const WALLET = "0x1111111111111111111111111111111111111111" as Address;
const NONCE = numberToHex(77, { size: 32 });
const USED_NONCES_ABI = [
  {
    type: "function",
    name: "usedNonces",
    stateMutability: "view",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function uint(value: bigint | number, size: number): Hex {
  return numberToHex(value, { size });
}

function message(): Hex {
  const messenger = addressToCctpBytes32(CCTP_TOKEN_MESSENGER_V2);
  const wallet = addressToCctpBytes32(WALLET);
  return concatHex([
    uint(1, 4),
    uint(6, 4),
    uint(0, 4),
    NONCE,
    messenger,
    messenger,
    wallet,
    uint(1_000, 4),
    uint(1_000, 4),
    uint(1, 4),
    padHex(USDC_BY_CHAIN.base.address as Address, { size: 32 }),
    wallet,
    uint(1_200_000, 32),
    wallet,
    uint(164, 32),
    uint(156, 32),
    uint(99_999_999, 32),
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchRwasCctpMessageReceived", () => {
  it.each([
    [0n, false],
    [1n, true],
  ])("maps Circle's used nonce value %s to %s", async (used, expected) => {
    mocks.apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: "test",
          result: encodeFunctionResult({
            abi: USED_NONCES_ABI,
            functionName: "usedNonces",
            result: used,
          }),
        })
      )
    );

    await expect(
      fetchRwasCctpMessageReceived({
        message: message(),
        depositor: WALLET,
        amount: 1_200_000n,
      })
    ).resolves.toBe(expected);

    const [path, init, options] = mocks.apiFetch.mock.calls[0];
    expect(path).toBe("/api/evm-rpc/eth-mainnet");
    expect(options).toEqual({ requireAuth: true });
    const body = JSON.parse(init.body as string) as {
      method: string;
      params: [{ to: string; data: Hex }, string];
    };
    expect(body.method).toBe("eth_call");
    expect(body.params[1]).toBe("latest");
    expect(decodeFunctionData({ abi: USED_NONCES_ABI, data: body.params[0].data }).args).toEqual([
      NONCE,
    ]);
  });
});
