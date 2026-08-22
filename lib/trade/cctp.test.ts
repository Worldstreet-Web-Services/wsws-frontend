import { concatHex, getAddress, numberToHex, padHex, type Address, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import {
  addressToCctpBytes32,
  CCTP_TOKEN_MESSENGER_V2,
  decodeCctpBurnMessage,
  validateBaseToEthereumCctpMessage,
} from "@/lib/trade/cctp";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

const WALLET = "0x1111111111111111111111111111111111111111" as Address;

function uint(value: bigint | number, size: number): Hex {
  return numberToHex(value, { size });
}

function message(input: { amount?: bigint; fee?: bigint; wallet?: Address } = {}): Hex {
  const amount = input.amount ?? 1_000_000n;
  const fee = input.fee ?? 130n;
  const wallet = input.wallet ?? WALLET;
  const messenger = addressToCctpBytes32(CCTP_TOKEN_MESSENGER_V2);
  const walletBytes = addressToCctpBytes32(wallet);
  return concatHex([
    uint(1, 4),
    uint(6, 4),
    uint(0, 4),
    uint(77, 32),
    messenger,
    messenger,
    walletBytes,
    uint(1_000, 4),
    uint(1_000, 4),
    uint(1, 4),
    padHex(USDC_BY_CHAIN.base.address as Address, { size: 32 }),
    walletBytes,
    uint(amount, 32),
    walletBytes,
    uint(164, 32),
    uint(fee, 32),
    uint(99_999_999, 32),
  ]);
}

describe("CCTP V2 burn messages", () => {
  it("decodes and validates an exact Base to Ethereum USDC burn", () => {
    const raw = message();

    expect(decodeCctpBurnMessage(raw)).toMatchObject({
      sourceDomain: 6,
      destinationDomain: 0,
      nonce: uint(77, 32),
      burnToken: getAddress(USDC_BY_CHAIN.base.address),
      mintRecipient: WALLET,
      amount: 1_000_000n,
      feeExecuted: 130n,
    });
    expect(
      validateBaseToEthereumCctpMessage({
        message: raw,
        depositor: WALLET,
        amount: 1_000_000n,
      }).outputAmount
    ).toBe(999_870n);
  });

  it("rejects an attestation bound to another destination wallet", () => {
    const otherWallet = "0x2222222222222222222222222222222222222222" as Address;

    expect(() =>
      validateBaseToEthereumCctpMessage({
        message: message({ wallet: otherWallet }),
        depositor: WALLET,
        amount: 1_000_000n,
      })
    ).toThrow("does not match this purchase");
  });
});
