import { getAddress, hexToBigInt, isAddress, isHex, sliceHex, type Address, type Hex } from "viem";

import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

export const CCTP_TOKEN_MESSENGER_V2 = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d" as Address;
export const CCTP_MESSAGE_TRANSMITTER_V2 = "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64" as Address;
export const CCTP_BASE_DOMAIN = 6;
export const CCTP_ETHEREUM_DOMAIN = 0;
export const CCTP_FAST_FINALITY_THRESHOLD = 1_000;
export const CCTP_STANDARD_FINALITY_THRESHOLD = 2_000;
export const CCTP_MAX_BURN_AMOUNT = 10_000_000n * 1_000_000n;

const MESSAGE_HEADER_LENGTH = 148;
const BURN_MESSAGE_MIN_LENGTH = 228;

export interface DecodedCctpBurnMessage {
  sourceDomain: number;
  destinationDomain: number;
  nonce: Hex;
  sender: Hex;
  recipient: Hex;
  destinationCaller: Hex;
  minFinalityThreshold: number;
  finalityThresholdExecuted: number;
  burnToken: Address;
  mintRecipient: Address;
  amount: bigint;
  messageSender: Address;
  maxFee: bigint;
  feeExecuted: bigint;
  expirationBlock: bigint;
}

function uintAt(message: Hex, offset: number, length: number): bigint {
  return hexToBigInt(sliceHex(message, offset, offset + length));
}

function uint32At(message: Hex, offset: number): number {
  const value = uintAt(message, offset, 4);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("The CCTP message is invalid.");
  return Number(value);
}

function addressAt(message: Hex, offset: number): Address {
  return getAddress(sliceHex(message, offset + 12, offset + 32));
}

export function addressToCctpBytes32(address: string): Hex {
  if (!isAddress(address)) throw new Error("The CCTP wallet address is invalid.");
  return `0x${address.slice(2).padStart(64, "0")}` as Hex;
}

export function decodeCctpBurnMessage(message: Hex): DecodedCctpBurnMessage {
  if (
    !isHex(message) ||
    (message.length - 2) / 2 < MESSAGE_HEADER_LENGTH + BURN_MESSAGE_MIN_LENGTH
  ) {
    throw new Error("The CCTP message is invalid.");
  }
  if (uint32At(message, 0) !== 1 || uint32At(message, MESSAGE_HEADER_LENGTH) !== 1) {
    throw new Error("The CCTP message version is unsupported.");
  }

  const body = MESSAGE_HEADER_LENGTH;
  return {
    sourceDomain: uint32At(message, 4),
    destinationDomain: uint32At(message, 8),
    nonce: sliceHex(message, 12, 44),
    sender: sliceHex(message, 44, 76),
    recipient: sliceHex(message, 76, 108),
    destinationCaller: sliceHex(message, 108, 140),
    minFinalityThreshold: uint32At(message, 140),
    finalityThresholdExecuted: uint32At(message, 144),
    burnToken: addressAt(message, body + 4),
    mintRecipient: addressAt(message, body + 36),
    amount: uintAt(message, body + 68, 32),
    messageSender: addressAt(message, body + 100),
    maxFee: uintAt(message, body + 132, 32),
    feeExecuted: uintAt(message, body + 164, 32),
    expirationBlock: uintAt(message, body + 196, 32),
  };
}

export function validateBaseToEthereumCctpMessage(input: {
  message: Hex;
  depositor: Address;
  amount: bigint;
}): DecodedCctpBurnMessage & { outputAmount: bigint } {
  const decoded = decodeCctpBurnMessage(input.message);
  const wallet = getAddress(input.depositor);
  const messenger = addressToCctpBytes32(CCTP_TOKEN_MESSENGER_V2).toLowerCase();
  const walletBytes = addressToCctpBytes32(wallet).toLowerCase();

  if (
    decoded.sourceDomain !== CCTP_BASE_DOMAIN ||
    decoded.destinationDomain !== CCTP_ETHEREUM_DOMAIN ||
    decoded.sender.toLowerCase() !== messenger ||
    decoded.recipient.toLowerCase() !== messenger ||
    decoded.destinationCaller.toLowerCase() !== walletBytes ||
    decoded.minFinalityThreshold !== CCTP_FAST_FINALITY_THRESHOLD ||
    decoded.finalityThresholdExecuted < CCTP_FAST_FINALITY_THRESHOLD ||
    decoded.finalityThresholdExecuted >= CCTP_STANDARD_FINALITY_THRESHOLD ||
    decoded.burnToken.toLowerCase() !== USDC_BY_CHAIN.base.address.toLowerCase() ||
    decoded.mintRecipient.toLowerCase() !== wallet.toLowerCase() ||
    decoded.messageSender.toLowerCase() !== wallet.toLowerCase() ||
    decoded.amount !== input.amount ||
    decoded.feeExecuted > decoded.maxFee ||
    decoded.feeExecuted >= decoded.amount
  ) {
    throw new Error("The attested CCTP transfer does not match this purchase.");
  }

  return { ...decoded, outputAmount: decoded.amount - decoded.feeExecuted };
}
