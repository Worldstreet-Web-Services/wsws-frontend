import "server-only";

import { isAddress, isHex } from "viem";
import { z } from "zod";

import {
  rwasDexQuoteSchema,
  type RwasDexQuote,
  type RwasDexQuoteRequest,
} from "@/lib/api/schemas/rwas-dex";
import { marketAssetDetailsSchema } from "@/lib/api/schemas/rwas";
import { requestRwas } from "@/lib/server/rwas";
import { toBaseUnits } from "@/lib/trade/math";

const SOCKET_QUOTE_URL = "https://public-backend.socket.tech/v3/swap/quote";
const ETHEREUM_CHAIN_ID = 1;
const ETHEREUM_USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDC_DECIMALS = 6;
const QUOTE_TIMEOUT_MS = 8_000;
const MIN_VALIDITY_SECONDS = 5;
const MIN_VALUE_RATIO = 0.95;
const SECONDARY_PROVIDER = "bitget";

const unsignedInteger = z.string().regex(/^\d+$/u);
const socketTokenSchema = z.object({
  chainId: z.literal(ETHEREUM_CHAIN_ID),
  address: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(255),
});
const socketRouteSchema = z.object({
  userOp: z.literal("tx"),
  quoteId: z.string(),
  expiresAt: z.number().int().positive(),
  output: z.object({
    token: socketTokenSchema,
    amount: unsignedInteger,
    minAmountOut: unsignedInteger,
    valueInUsd: z.number().finite().nonnegative(),
    isSimulated: z.boolean().optional(),
  }),
  estimatedTime: z.number().finite().nonnegative(),
  routeDetails: z.object({
    dexDetails: z.object({
      protocol: z.object({ name: z.string(), displayName: z.string() }),
      inputTokenAddress: z.string(),
      outputTokenAddress: z.string(),
      amountIn: unsignedInteger,
    }),
  }),
  approval: z
    .object({
      spenderAddress: z.string(),
      amount: unsignedInteger,
      tokenAddress: z.string(),
      userAddress: z.string(),
    })
    .nullish(),
  txData: z.object({
    kind: z.literal("evm_tx"),
    object: z.object({
      chainId: z.literal(ETHEREUM_CHAIN_ID),
      to: z.string(),
      data: z.string(),
      value: unsignedInteger,
    }),
  }),
  gasFee: z.object({ feeInUsd: z.number().finite().nonnegative() }),
  isDepositTx: z.boolean().optional(),
});
const socketResponseSchema = z.object({
  success: z.literal(true),
  result: z.object({
    input: z.object({
      token: socketTokenSchema,
      amount: unsignedInteger,
      valueInUsd: z.number().finite().positive(),
    }),
    routes: z.array(socketRouteSchema),
  }),
});

export class RwasDexQuoteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "RwasDexQuoteError";
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

async function ethereumDeployment(symbol: string, requestId: string) {
  const response = await requestRwas(
    `market-assets/${encodeURIComponent(symbol)}`,
    new URLSearchParams(),
    requestId
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RwasDexQuoteError(
      response.status === 404 ? 404 : 502,
      response.status === 404 ? "NOT_FOUND" : "ASSET_UNAVAILABLE",
      response.status === 404 ? "The market asset was not found." : "Asset details are unavailable."
    );
  }
  const envelope = z
    .object({ success: z.literal(true), data: marketAssetDetailsSchema })
    .safeParse(payload);
  if (!envelope.success) {
    throw new RwasDexQuoteError(502, "UPSTREAM_CONTRACT", "Asset details are invalid.");
  }
  const detail = envelope.data.data;
  const deployment = detail.networks.find((network) => network.chainId === ETHEREUM_CHAIN_ID);
  if (!deployment || !isAddress(deployment.address)) {
    throw new RwasDexQuoteError(
      409,
      "ETHEREUM_UNAVAILABLE",
      "This asset is not available on Ethereum."
    );
  }
  return { detail, deployment };
}

function routeIsSafe(
  route: z.infer<typeof socketRouteSchema>,
  input: z.infer<typeof socketResponseSchema>["result"]["input"],
  expectedInputToken: string,
  expectedOutputToken: string,
  expectedInputDecimals: number,
  expectedOutputDecimals: number,
  walletAddress: string,
  nowSeconds: number
): boolean {
  const protocol = route.routeDetails.dexDetails.protocol.name.toLowerCase();
  const approval = route.approval;
  return (
    protocol === SECONDARY_PROVIDER &&
    route.output.isSimulated === true &&
    route.isDepositTx !== true &&
    route.expiresAt > nowSeconds + MIN_VALIDITY_SECONDS &&
    route.routeDetails.dexDetails.amountIn === input.amount &&
    input.token.decimals === expectedInputDecimals &&
    route.output.token.decimals === expectedOutputDecimals &&
    isAddress(input.token.address) &&
    isAddress(route.output.token.address) &&
    isAddress(route.routeDetails.dexDetails.inputTokenAddress) &&
    isAddress(route.routeDetails.dexDetails.outputTokenAddress) &&
    sameAddress(input.token.address, expectedInputToken) &&
    sameAddress(route.routeDetails.dexDetails.inputTokenAddress, expectedInputToken) &&
    sameAddress(route.output.token.address, expectedOutputToken) &&
    sameAddress(route.routeDetails.dexDetails.outputTokenAddress, expectedOutputToken) &&
    BigInt(route.output.amount) > 0n &&
    BigInt(route.output.minAmountOut) > 0n &&
    BigInt(route.output.minAmountOut) <= BigInt(route.output.amount) &&
    route.output.valueInUsd / input.valueInUsd >= MIN_VALUE_RATIO &&
    isAddress(route.txData.object.to) &&
    isHex(route.txData.object.data) &&
    BigInt(route.txData.object.value) === 0n &&
    (approval == null ||
      (isAddress(approval.tokenAddress) &&
        isAddress(approval.spenderAddress) &&
        isAddress(approval.userAddress) &&
        sameAddress(approval.tokenAddress, expectedInputToken) &&
        sameAddress(approval.userAddress, walletAddress) &&
        approval.amount === input.amount))
  );
}

export async function requestRwasDexQuote(
  input: RwasDexQuoteRequest,
  requestId: string
): Promise<RwasDexQuote> {
  const { detail, deployment } = await ethereumDeployment(input.symbol, requestId);
  const inputDecimals = input.side === "buy" ? USDC_DECIMALS : deployment.decimals;
  const inputAmount = toBaseUnits(input.amount, inputDecimals);
  if (inputAmount <= 0n) {
    throw new RwasDexQuoteError(400, "INVALID_AMOUNT", "Enter a valid trade amount.");
  }
  const expectedInputToken = input.side === "buy" ? ETHEREUM_USDC : deployment.address;
  const expectedOutputToken = input.side === "buy" ? deployment.address : ETHEREUM_USDC;
  const outputDecimals = input.side === "buy" ? deployment.decimals : USDC_DECIMALS;
  const query = new URLSearchParams({
    userOps: "tx",
    originChainId: String(ETHEREUM_CHAIN_ID),
    destinationChainId: String(ETHEREUM_CHAIN_ID),
    inputToken: expectedInputToken,
    outputToken: expectedOutputToken,
    inputAmount: inputAmount.toString(),
    receiverAddress: input.walletAddress,
    userAddress: input.walletAddress,
    slippage: "0.5",
    simulatedQuotesRequired: "true",
    includeProvider: SECONDARY_PROVIDER,
  });
  const response = await fetch(`${SOCKET_QUOTE_URL}?${query}`, {
    headers: { accept: "application/json", "x-request-id": requestId },
    cache: "no-store",
    signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new RwasDexQuoteError(502, "VENUE_UNAVAILABLE", "The Ethereum venue is unavailable.");
  }
  const parsed = socketResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success || parsed.data.result.input.amount !== inputAmount.toString()) {
    throw new RwasDexQuoteError(502, "UPSTREAM_CONTRACT", "The venue quote is invalid.");
  }

  const nowSeconds = Math.floor(Date.now() / 1_000);
  const route = parsed.data.result.routes
    .filter((candidate) =>
      routeIsSafe(
        candidate,
        parsed.data.result.input,
        expectedInputToken,
        expectedOutputToken,
        inputDecimals,
        outputDecimals,
        input.walletAddress,
        nowSeconds
      )
    )
    .sort((left, right) => {
      const leftAmount = BigInt(left.output.minAmountOut);
      const rightAmount = BigInt(right.output.minAmountOut);
      return leftAmount === rightAmount ? 0 : leftAmount > rightAmount ? -1 : 1;
    })[0];
  if (!route) {
    throw new RwasDexQuoteError(
      409,
      "DEX_ROUTE_UNAVAILABLE",
      "No simulated Ethereum venue route is available for this amount."
    );
  }

  return rwasDexQuoteSchema.parse({
    quoteId: route.quoteId,
    provider: route.routeDetails.dexDetails.protocol.name,
    providerName: route.routeDetails.dexDetails.protocol.displayName,
    side: input.side,
    chainId: ETHEREUM_CHAIN_ID,
    input: {
      address: expectedInputToken,
      symbol: input.side === "buy" ? "USDC" : detail.asset.symbol,
      decimals: inputDecimals,
      amount: inputAmount.toString(),
    },
    output: {
      address: expectedOutputToken,
      symbol: input.side === "buy" ? detail.asset.symbol : "USDC",
      decimals: route.output.token.decimals,
      amount: route.output.amount,
      minimumAmount: route.output.minAmountOut,
    },
    approval: route.approval
      ? {
          tokenAddress: route.approval.tokenAddress,
          spenderAddress: route.approval.spenderAddress,
          amount: route.approval.amount,
        }
      : null,
    transaction: route.txData.object,
    estimatedTimeSeconds: route.estimatedTime,
    gasFeeUsd: String(route.gasFee.feeInUsd),
    expiresAt: new Date(route.expiresAt * 1_000).toISOString(),
    simulated: true,
  });
}
