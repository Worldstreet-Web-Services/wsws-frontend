import "server-only";

import { isAddress, isHex, type Address, type Hex } from "viem";
import { z } from "zod";

import {
  rwasCctpQuoteSchema,
  rwasCctpStatusSchema,
  type RwasCctpQuote,
  type RwasCctpQuoteRequest,
  type RwasCctpStatus,
  type RwasCctpStatusRequest,
} from "@/lib/api/schemas/rwas-cctp";
import {
  CCTP_BASE_DOMAIN,
  CCTP_ETHEREUM_DOMAIN,
  CCTP_FAST_FINALITY_THRESHOLD,
  CCTP_MAX_BURN_AMOUNT,
  validateBaseToEthereumCctpMessage,
} from "@/lib/trade/cctp";

const IRIS_API_BASE = "https://iris-api.circle.com";
const IRIS_TIMEOUT_MS = 8_000;
const QUOTE_TTL_SECONDS = 30;
const EXPECTED_FILL_TIME_SECONDS = 8;
const MAX_FEE_BUFFER_PERCENT = 25n;
const USDC_SCALE = 1_000_000n;

const feeSchema = z.object({
  finalityThreshold: z.number().int(),
  minimumFee: z.union([z.number().nonnegative(), z.string().regex(/^\d+(?:\.\d+)?$/u)]),
});

const allowanceSchema = z.object({
  allowance: z.union([z.number().nonnegative(), z.string().regex(/^\d+(?:\.\d+)?$/u)]),
  lastUpdated: z.string().optional(),
});

const irisMessageSchema = z.object({
  message: z.string(),
  attestation: z.string().nullable().optional(),
  cctpVersion: z.number().int().optional(),
  status: z.string().optional(),
});

const irisMessagesSchema = z.object({
  messages: z.array(irisMessageSchema),
  sourceTxHash: z.string().optional(),
});

export class CctpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "CctpError";
  }
}

function decimalString(value: number | string): string {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid decimal value.");
  const trimmed = value.toFixed(6).replace(/0+$/u, "").replace(/\.$/u, "");
  return trimmed || "0";
}

function decimalFraction(value: number | string): { numerator: bigint; denominator: bigint } {
  const normalized = decimalString(value);
  const [whole, fraction = ""] = normalized.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  return { numerator: BigInt(`${whole}${fraction}`), denominator };
}

function decimalUsdcToUnits(value: number | string): bigint {
  const normalized = decimalString(value);
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * USDC_SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

function feeAmount(amount: bigint, bps: number | string): bigint {
  const fee = decimalFraction(bps);
  return ceilDivide(amount * fee.numerator, 10_000n * fee.denominator);
}

async function irisFetch(path: string): Promise<Response> {
  return fetch(`${IRIS_API_BASE}${path}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(IRIS_TIMEOUT_MS),
  });
}

function providerFailure(response: Response, message: string): CctpError {
  return new CctpError(
    response.status === 429 ? 503 : 502,
    response.status === 429 ? "CCTP_BUSY" : "CCTP_UNAVAILABLE",
    response.status === 429 ? "Circle is busy. Try again shortly." : message
  );
}

export async function requestRwasCctpQuote(
  input: RwasCctpQuoteRequest
): Promise<RwasCctpQuote> {
  if (!isAddress(input.depositor)) {
    throw new CctpError(400, "VALIDATION_ERROR", "The wallet address is invalid.");
  }
  const amount = BigInt(input.amount);
  if (amount > CCTP_MAX_BURN_AMOUNT) {
    throw new CctpError(
      400,
      "CCTP_AMOUNT_TOO_HIGH",
      "Circle limits each CCTP transfer to 10,000,000 USDC."
    );
  }

  const [feesResponse, allowanceResponse] = await Promise.all([
    irisFetch(`/v2/burn/USDC/fees/${CCTP_BASE_DOMAIN}/${CCTP_ETHEREUM_DOMAIN}`),
    irisFetch("/v2/fastBurn/USDC/allowance"),
  ]);
  if (!feesResponse.ok) {
    throw providerFailure(feesResponse, "The Circle transfer fee is unavailable.");
  }
  if (!allowanceResponse.ok) {
    throw providerFailure(allowanceResponse, "The Circle Fast Transfer allowance is unavailable.");
  }

  const fees = z.array(feeSchema).safeParse(await feesResponse.json().catch(() => null));
  const allowance = allowanceSchema.safeParse(
    await allowanceResponse.json().catch(() => null)
  );
  const fastFee = fees.success
    ? fees.data.find((entry) => entry.finalityThreshold === CCTP_FAST_FINALITY_THRESHOLD)
    : null;
  if (!fastFee || !allowance.success) {
    throw new CctpError(502, "CCTP_UPSTREAM_CONTRACT", "The Circle quote is invalid.");
  }

  const available = decimalUsdcToUnits(allowance.data.allowance);
  if (available < amount) {
    throw new CctpError(
      503,
      "CCTP_FAST_ALLOWANCE_LOW",
      "Circle does not currently have enough Fast Transfer allowance for this amount."
    );
  }

  const minimumFee = feeAmount(amount, fastFee.minimumFee);
  const feeBuffer = minimumFee === 0n
    ? 0n
    : ceilDivide(minimumFee * MAX_FEE_BUFFER_PERCENT, 100n) + 1n;
  const maxFee = minimumFee + feeBuffer;
  if (maxFee >= amount) {
    throw new CctpError(
      400,
      "CCTP_AMOUNT_TOO_LOW",
      "This amount is below the current Circle Fast Transfer minimum."
    );
  }

  return rwasCctpQuoteSchema.parse({
    id: crypto.randomUUID(),
    inputAmount: input.amount,
    expectedOutputAmount: (amount - minimumFee).toString(),
    minOutputAmount: (amount - maxFee).toString(),
    maxFee: maxFee.toString(),
    feeBps: decimalString(fastFee.minimumFee),
    expectedFillTime: EXPECTED_FILL_TIME_SECONDS,
    quoteExpiryTimestamp: Math.floor(Date.now() / 1_000) + QUOTE_TTL_SECONDS,
  });
}

export async function requestRwasCctpStatus(
  input: RwasCctpStatusRequest
): Promise<RwasCctpStatus> {
  if (!isAddress(input.depositor)) {
    throw new CctpError(400, "VALIDATION_ERROR", "The wallet address is invalid.");
  }
  const response = await irisFetch(
    `/v2/messages/${CCTP_BASE_DOMAIN}?transactionHash=${encodeURIComponent(input.sourceTransactionHash)}`
  );
  if (response.status === 404) {
    return rwasCctpStatusSchema.parse({
      status: "pending",
      sourceTransactionHash: input.sourceTransactionHash,
    });
  }
  if (!response.ok) {
    throw providerFailure(response, "The Circle attestation is temporarily unavailable.");
  }

  const parsed = irisMessagesSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new CctpError(502, "CCTP_UPSTREAM_CONTRACT", "The Circle attestation is invalid.");
  }
  const v2Messages = parsed.data.messages.filter((entry) => entry.cctpVersion === 2);
  const complete = v2Messages.filter(
    (entry) =>
      entry.status === "complete" &&
      typeof entry.attestation === "string" &&
      isHex(entry.attestation) &&
      isHex(entry.message)
  );
  if (complete.length === 0) {
    return rwasCctpStatusSchema.parse({
      status: "pending",
      sourceTransactionHash: input.sourceTransactionHash,
    });
  }

  for (const entry of complete) {
    try {
      const decoded = validateBaseToEthereumCctpMessage({
        message: entry.message as Hex,
        depositor: input.depositor as Address,
        amount: BigInt(input.amount),
      });
      return rwasCctpStatusSchema.parse({
        status: "complete",
        sourceTransactionHash: input.sourceTransactionHash,
        message: entry.message,
        attestation: entry.attestation,
        outputAmount: decoded.outputAmount.toString(),
        feeExecuted: decoded.feeExecuted.toString(),
      });
    } catch {
      // A transaction can contain several CCTP messages. Only the exact burn
      // created for this wallet and purchase amount is executable here.
    }
  }
  throw new CctpError(
    409,
    "CCTP_MESSAGE_MISMATCH",
    "Circle attested a transfer that does not match this purchase."
  );
}
