import "server-only";

import { isAddress } from "viem";
import { z } from "zod";

import {
  rwasAcrossQuoteSchema,
  rwasAcrossStatusSchema,
  type RwasAcrossQuote,
  type RwasAcrossQuoteRequest,
  type RwasAcrossStatus,
} from "@/lib/api/schemas/rwas-across";
import { USDC_BY_CHAIN } from "@/lib/trade/usdc";

const ACROSS_API_BASE = "https://app.across.to/api";
const ACROSS_TIMEOUT_MS = 10_000;
const BASE_CHAIN_ID = 8453;
const ETHEREUM_CHAIN_ID = 1;

interface AcrossUsdcRoute {
  originChainId: typeof BASE_CHAIN_ID | typeof ETHEREUM_CHAIN_ID;
  destinationChainId: typeof BASE_CHAIN_ID | typeof ETHEREUM_CHAIN_ID;
  inputToken: string;
  outputToken: string;
  originName: "Base" | "Ethereum";
  destinationName: "Base" | "Ethereum";
}

const BASE_TO_ETHEREUM: AcrossUsdcRoute = {
  originChainId: BASE_CHAIN_ID,
  destinationChainId: ETHEREUM_CHAIN_ID,
  inputToken: USDC_BY_CHAIN.base.address,
  outputToken: USDC_BY_CHAIN.ethereum.address,
  originName: "Base",
  destinationName: "Ethereum",
};

const ETHEREUM_TO_BASE: AcrossUsdcRoute = {
  originChainId: ETHEREUM_CHAIN_ID,
  destinationChainId: BASE_CHAIN_ID,
  inputToken: USDC_BY_CHAIN.ethereum.address,
  outputToken: USDC_BY_CHAIN.base.address,
  originName: "Ethereum",
  destinationName: "Base",
};

const providerTransactionSchema = z.object({
  chainId: z.number().int(),
  to: z.string(),
  data: z.string(),
  value: z.union([z.string(), z.number()]).optional(),
});

const providerQuoteSchema = z.object({
  id: z.string().min(1),
  inputAmount: z.string(),
  expectedOutputAmount: z.string(),
  minOutputAmount: z.string(),
  expectedFillTime: z.number(),
  quoteExpiryTimestamp: z.number(),
  approvalTxns: z
    .array(providerTransactionSchema)
    .nullish()
    .transform((transactions) => transactions ?? []),
  checks: z.object({
    balance: z.object({ actual: z.string(), expected: z.string() }),
  }),
  swapTx: providerTransactionSchema.extend({ simulationSuccess: z.boolean() }),
});

const providerStatusSchema = z.object({
  status: z.string(),
  depositTxnRef: z.string().optional(),
  depositTxHash: z.string().optional(),
  fillTxnRef: z.string().nullable().optional(),
  fillTx: z.string().nullable().optional(),
  depositRefundTxnRef: z.string().nullable().optional(),
  depositRefundTxHash: z.string().nullable().optional(),
});

export class AcrossBridgeError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AcrossBridgeError";
  }
}

function credentials(): { apiKey: string; integratorId: string } {
  const apiKey = process.env.ACROSS_API_KEY?.trim();
  const integratorId = process.env.ACROSS_API_INTEGRATOR_ID?.trim();
  if (!apiKey || !integratorId) {
    throw new AcrossBridgeError(503, "BRIDGE_NOT_CONFIGURED", "The bridge is not configured.");
  }
  if (!/^0x[0-9a-fA-F]{4}$/u.test(integratorId)) {
    throw new AcrossBridgeError(
      503,
      "BRIDGE_NOT_CONFIGURED",
      "The bridge integrator ID is invalid."
    );
  }
  return { apiKey, integratorId };
}

function providerMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Record<string, unknown>;
  for (const key of ["message", "error", "detail"]) {
    if (typeof candidate[key] === "string" && candidate[key].trim()) {
      return candidate[key].trim();
    }
  }
  return null;
}

async function acrossFetch(
  path: string,
  query: URLSearchParams,
  options: { includeIntegratorId?: boolean } = {}
): Promise<Response> {
  const { apiKey, integratorId } = credentials();
  if (options.includeIntegratorId) query.set("integratorId", integratorId);
  return fetch(`${ACROSS_API_BASE}/${path}?${query.toString()}`, {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(ACROSS_TIMEOUT_MS),
  });
}

function transaction(input: z.infer<typeof providerTransactionSchema>) {
  const value = input.value === undefined ? undefined : String(input.value);
  return {
    chainId: input.chainId,
    to: input.to,
    data: input.data,
    ...(value === undefined ? {} : { value }),
  };
}

async function requestAcrossUsdcQuote(
  input: RwasAcrossQuoteRequest,
  route: AcrossUsdcRoute
): Promise<RwasAcrossQuote> {
  if (!isAddress(input.depositor)) {
    throw new AcrossBridgeError(400, "VALIDATION_ERROR", "The wallet address is invalid.");
  }

  const query = new URLSearchParams({
    tradeType: "exactInput",
    strictTradeType: "true",
    originChainId: String(route.originChainId),
    destinationChainId: String(route.destinationChainId),
    inputToken: route.inputToken,
    outputToken: route.outputToken,
    amount: input.amount,
    depositor: input.depositor,
    recipient: input.depositor,
    refundAddress: input.depositor,
    refundOnOrigin: "true",
    slippage: "auto",
    // The app submits approval + deposit as one Alchemy-sponsored batch. The
    // bundler simulates that complete operation, while Across's standalone
    // origin estimate assumes the wallet itself has native Base gas.
    skipOriginTxEstimation: "true",
  });
  const response = await acrossFetch("swap/approval", query, { includeIntegratorId: true });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = providerMessage(payload);
    const tooSmall = response.status === 400 && /amount|minimum|too low|insufficient input/iu.test(message ?? "");
    throw new AcrossBridgeError(
      tooSmall ? 400 : response.status === 429 ? 503 : 502,
      tooSmall ? "BRIDGE_AMOUNT_TOO_LOW" : "BRIDGE_QUOTE_UNAVAILABLE",
      tooSmall
        ? "This amount is below the current Across route minimum."
        : response.status === 429
          ? "The bridge quote service is busy. Try again shortly."
          : `An ${route.originName} to ${route.destinationName} USDC route is unavailable.`
    );
  }

  const parsed = providerQuoteSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AcrossBridgeError(502, "UPSTREAM_CONTRACT", "The bridge quote is invalid.");
  }
  if (
    BigInt(parsed.data.checks.balance.actual) < BigInt(parsed.data.checks.balance.expected) ||
    BigInt(parsed.data.checks.balance.actual) < BigInt(input.amount)
  ) {
    throw new AcrossBridgeError(
      400,
      "INSUFFICIENT_BALANCE",
      `You do not have enough ${route.originName} USDC.`
    );
  }

  const quote = rwasAcrossQuoteSchema.safeParse({
    id: parsed.data.id,
    inputAmount: parsed.data.inputAmount,
    expectedOutputAmount: parsed.data.expectedOutputAmount,
    minOutputAmount: parsed.data.minOutputAmount,
    expectedFillTime: Math.ceil(parsed.data.expectedFillTime),
    quoteExpiryTimestamp: parsed.data.quoteExpiryTimestamp,
    approvalTxns: parsed.data.approvalTxns.map(transaction),
    swapTx: transaction(parsed.data.swapTx),
  });
  if (!quote.success || quote.data.swapTx.chainId !== route.originChainId) {
    throw new AcrossBridgeError(502, "UPSTREAM_CONTRACT", "The bridge quote is invalid.");
  }
  if (quote.data.approvalTxns.some((approval) => approval.chainId !== route.originChainId)) {
    throw new AcrossBridgeError(502, "UPSTREAM_CONTRACT", "The bridge approvals are invalid.");
  }
  return quote.data;
}

export function requestRwasAcrossQuote(
  input: RwasAcrossQuoteRequest
): Promise<RwasAcrossQuote> {
  return requestAcrossUsdcQuote(input, BASE_TO_ETHEREUM);
}

export function requestEthereumUsdcToBaseQuote(
  input: RwasAcrossQuoteRequest
): Promise<RwasAcrossQuote> {
  return requestAcrossUsdcQuote(input, ETHEREUM_TO_BASE);
}

export async function requestRwasAcrossStatus(
  depositTxnRef: string
): Promise<RwasAcrossStatus> {
  const response = await acrossFetch(
    "deposit/status",
    new URLSearchParams({ depositTxnRef })
  );
  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 404) {
    return rwasAcrossStatusSchema.parse({
      status: "pending",
      depositTxnRef,
      fillTxnRef: null,
      refundTxnRef: null,
    });
  }
  if (!response.ok) {
    throw new AcrossBridgeError(
      response.status === 429 ? 503 : 502,
      "BRIDGE_STATUS_UNAVAILABLE",
      "Bridge status is temporarily unavailable."
    );
  }

  const parsed = providerStatusSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AcrossBridgeError(502, "UPSTREAM_CONTRACT", "The bridge status is invalid.");
  }
  const normalizedStatus = parsed.data.status === "received" ? "pending" : parsed.data.status;
  if (!["pending", "filled", "expired", "refunded"].includes(normalizedStatus)) {
    throw new AcrossBridgeError(502, "UPSTREAM_CONTRACT", "The bridge status is invalid.");
  }
  return rwasAcrossStatusSchema.parse({
    status: normalizedStatus,
    depositTxnRef: parsed.data.depositTxnRef ?? parsed.data.depositTxHash ?? depositTxnRef,
    fillTxnRef: parsed.data.fillTxnRef ?? parsed.data.fillTx ?? null,
    refundTxnRef:
      parsed.data.depositRefundTxnRef ?? parsed.data.depositRefundTxHash ?? null,
  });
}
