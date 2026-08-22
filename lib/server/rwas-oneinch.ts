import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { NetworkEnum, Quote, QuoterRequest, type QuoterResponse } from "@1inch/fusion-sdk";
import { hashTypedData, isAddress, recoverTypedDataAddress, type Address, type Hex } from "viem";
import { z } from "zod";

import {
  rwasOneInchOrderSchema,
  rwasOneInchOrderStatusSchema,
  rwasOneInchPreparedOrderSchema,
  rwasOneInchQuoteSchema,
  rwasOneInchTicketPayloadSchema,
  rwasOneInchTypedDataSchema,
  type RwasOneInchOrderStatus,
  type RwasOneInchPreparedOrder,
  type RwasOneInchQuote,
  type RwasOneInchQuoteRequest,
  type RwasOneInchSubmitRequest,
  type RwasOneInchSubmitResponse,
  type RwasOneInchTicketPayload,
} from "@/lib/api/schemas/rwas-oneinch";
import { marketAssetDetailsSchema } from "@/lib/api/schemas/rwas";
import { requestRwas } from "@/lib/server/rwas";
import { toBaseUnits } from "@/lib/trade/math";

const ONEINCH_FUSION_URL = "https://api.1inch.com/fusion";
const ETHEREUM_CHAIN_ID = 1;
const ETHEREUM_USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const ONEINCH_LIMIT_ORDER_PROTOCOL = "0x111111125421ca6dc452d289314280a0f8842a65";
const USDC_DECIMALS = 6;
const QUOTE_TIMEOUT_MS = 8_000;
const RELAYER_TIMEOUT_MS = 8_000;
const LOCAL_QUOTE_VALIDITY_MS = 30_000;
const MIN_EFFECTIVE_RATE_PERCENT = 90;

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/u);
const bytes32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/u);
const unsignedInteger = z.string().regex(/^\d+$/u);
const positiveDecimal = z.string().regex(/^\d+(?:\.\d+)?$/u);
const fusionPresetSchema = z.object({
  auctionDuration: z.number().int().positive(),
  startAuctionIn: z.number().int().nonnegative(),
  bankFee: unsignedInteger,
  initialRateBump: z.number().int().nonnegative(),
  auctionStartAmount: unsignedInteger,
  auctionEndAmount: unsignedInteger,
  tokenFee: unsignedInteger,
  exclusiveResolver: address.nullable(),
  estP: z.number().finite().nonnegative(),
  allowPartialFills: z.boolean(),
  allowMultipleFills: z.boolean(),
  gasCost: z.object({
    gasBumpEstimate: z.number().int().nonnegative(),
    gasPriceEstimate: unsignedInteger,
  }),
  points: z.array(
    z.object({ delay: z.number().int().nonnegative(), coefficient: z.number().int() })
  ),
  startAmount: unsignedInteger,
});
const fusionQuoteSchema = z.object({
  quoteId: z.uuid(),
  fromTokenAmount: unsignedInteger,
  toTokenAmount: unsignedInteger,
  feeToken: address,
  presets: z.record(z.string(), fusionPresetSchema),
  fee: z.object({
    receiver: address,
    bps: z.number().int().nonnegative(),
    whitelistDiscountPercent: z.number().finite().nonnegative(),
  }),
  integratorFee: z.number().int().nonnegative(),
  integratorFeeReceiver: address.optional(),
  integratorFeeShare: z.number().finite().nonnegative(),
  settlementAddress: address,
  nativeOrderFactoryAddress: address.optional(),
  nativeOrderImplAddress: address.optional(),
  whitelist: z.array(address).min(1),
  recommended_preset: z.string().min(1),
  prices: z.object({
    usd: z.object({ fromToken: positiveDecimal, toToken: positiveDecimal }),
  }),
  volume: z.object({
    usd: z.object({ fromToken: positiveDecimal, toToken: positiveDecimal }),
  }),
  priceImpactPercent: z.number().finite().nonnegative(),
  autoK: z.number().finite().nonnegative(),
  marketAmount: unsignedInteger,
  quoteGeneratedAt: z.number().int().positive(),
  source: z.string().optional(),
  surplusFee: z.number().finite().nonnegative().optional(),
});
const oneInchStatusResponseSchema = z.object({
  status: rwasOneInchOrderStatusSchema.shape.status,
  fills: z.array(z.object({ txHash: bytes32 })).default([]),
});

type FusionQuote = z.infer<typeof fusionQuoteSchema>;

interface FusionContext {
  detail: z.infer<typeof marketAssetDetailsSchema>;
  deployment: z.infer<typeof marketAssetDetailsSchema>["networks"][number];
  inputToken: Address;
  outputToken: Address;
  inputDecimals: number;
  outputDecimals: number;
  inputAmount: bigint;
}

export class RwasOneInchQuoteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "RwasOneInchQuoteError";
  }
}

function oneInchApiKey(): string {
  const key = process.env.ONEINCH_API_KEY?.trim();
  if (!key) {
    throw new RwasOneInchQuoteError(
      503,
      "ONEINCH_NOT_CONFIGURED",
      "1inch trading is not configured."
    );
  }
  return key;
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
    throw new RwasOneInchQuoteError(
      response.status === 404 ? 404 : 502,
      response.status === 404 ? "NOT_FOUND" : "ASSET_UNAVAILABLE",
      response.status === 404 ? "The market asset was not found." : "Asset details are unavailable."
    );
  }
  const envelope = z
    .object({ success: z.literal(true), data: marketAssetDetailsSchema })
    .safeParse(payload);
  if (!envelope.success) {
    throw new RwasOneInchQuoteError(502, "UPSTREAM_CONTRACT", "Asset details are invalid.");
  }
  const detail = envelope.data.data;
  const deployment = detail.networks.find((network) => network.chainId === ETHEREUM_CHAIN_ID);
  if (!deployment || !isAddress(deployment.address)) {
    throw new RwasOneInchQuoteError(
      409,
      "ETHEREUM_UNAVAILABLE",
      "This asset is not available on Ethereum."
    );
  }
  return { detail, deployment };
}

async function fusionContext(
  input: RwasOneInchQuoteRequest,
  requestId: string
): Promise<FusionContext> {
  const { detail, deployment } = await ethereumDeployment(input.symbol, requestId);
  const inputDecimals = input.side === "buy" ? USDC_DECIMALS : deployment.decimals;
  const inputAmount = toBaseUnits(input.amount, inputDecimals);
  if (inputAmount <= 0n) {
    throw new RwasOneInchQuoteError(400, "INVALID_AMOUNT", "Enter a valid trade amount.");
  }
  return {
    detail,
    deployment,
    inputToken: (input.side === "buy" ? ETHEREUM_USDC : deployment.address) as Address,
    outputToken: (input.side === "buy" ? deployment.address : ETHEREUM_USDC) as Address,
    inputDecimals,
    outputDecimals: input.side === "buy" ? deployment.decimals : USDC_DECIMALS,
    inputAmount,
  };
}

function effectiveRatePercent(
  marketAmount: bigint,
  expectedAmount: bigint,
  inputUsd: string,
  outputUsd: string
): number {
  const marketRatio = Number(expectedAmount) / Number(marketAmount);
  const usdRatio = Number(outputUsd) / Number(inputUsd);
  const rate = marketRatio * usdRatio * 100;
  return Number.isFinite(rate) && rate >= 0 ? Number(rate.toFixed(4)) : 0;
}

function upstreamFailure(status: number): RwasOneInchQuoteError {
  if (status === 400 || status === 404 || status === 422) {
    return new RwasOneInchQuoteError(
      409,
      "ONEINCH_ROUTE_UNAVAILABLE",
      "1inch Fusion has no Ethereum route for this asset and amount."
    );
  }
  if (status === 429) {
    return new RwasOneInchQuoteError(
      503,
      "ONEINCH_RATE_LIMITED",
      "1inch quote capacity is temporarily busy."
    );
  }
  if (status === 401 || status === 403) {
    return new RwasOneInchQuoteError(
      503,
      "ONEINCH_AUTH_FAILED",
      "1inch trading is not configured correctly."
    );
  }
  return new RwasOneInchQuoteError(
    502,
    "ONEINCH_UNAVAILABLE",
    "1inch trading is temporarily unavailable."
  );
}

async function fetchFusionQuote(
  input: RwasOneInchQuoteRequest,
  context: FusionContext,
  requestId: string
): Promise<FusionQuote> {
  const query = new URLSearchParams({
    fromTokenAddress: context.inputToken,
    toTokenAddress: context.outputToken,
    amount: context.inputAmount.toString(),
    walletAddress: input.walletAddress,
    enableEstimate: "true",
    source: "ark-rwas",
  });
  const response = await fetch(
    `${ONEINCH_FUSION_URL}/quoter/v2.0/${ETHEREUM_CHAIN_ID}/quote/receive/?${query}`,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${oneInchApiKey()}`,
        "x-request-id": requestId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS),
    }
  );
  if (!response.ok) throw upstreamFailure(response.status);

  const parsed = fusionQuoteSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new RwasOneInchQuoteError(
      502,
      "ONEINCH_CONTRACT_CHANGED",
      "The 1inch quote response is invalid."
    );
  }
  return parsed.data;
}

function normalizeQuote(
  input: RwasOneInchQuoteRequest,
  context: FusionContext,
  quote: FusionQuote
): RwasOneInchQuote {
  const preset = quote.presets[quote.recommended_preset];
  const marketAmount = BigInt(quote.marketAmount);
  const expectedAmount = BigInt(preset?.startAmount ?? "0");
  const grossMinimumAmount = BigInt(preset?.auctionEndAmount ?? "0");
  const tokenFee = BigInt(preset?.tokenFee ?? "0");
  const minimumAmount = grossMinimumAmount > tokenFee ? grossMinimumAmount - tokenFee : 0n;
  if (
    quote.fromTokenAmount !== context.inputAmount.toString() ||
    !preset ||
    !sameAddress(quote.feeToken, context.outputToken) ||
    marketAmount <= 0n ||
    expectedAmount <= 0n ||
    minimumAmount <= 0n ||
    expectedAmount > marketAmount ||
    minimumAmount > expectedAmount
  ) {
    throw new RwasOneInchQuoteError(
      502,
      "ONEINCH_CONTRACT_CHANGED",
      "The 1inch quote response is invalid."
    );
  }

  const effectiveRate = effectiveRatePercent(
    marketAmount,
    expectedAmount,
    quote.volume.usd.fromToken,
    quote.volume.usd.toToken
  );
  const minimumEffectiveRate = effectiveRatePercent(
    marketAmount,
    minimumAmount,
    quote.volume.usd.fromToken,
    quote.volume.usd.toToken
  );
  const generatedAtMs =
    quote.quoteGeneratedAt < 10_000_000_000
      ? quote.quoteGeneratedAt * 1_000
      : quote.quoteGeneratedAt;
  const generatedAt = new Date(generatedAtMs);
  return rwasOneInchQuoteSchema.parse({
    quoteId: quote.quoteId,
    provider: "1inch-fusion",
    providerName: "1inch Fusion",
    side: input.side,
    chainId: ETHEREUM_CHAIN_ID,
    input: {
      address: context.inputToken,
      symbol: input.side === "buy" ? "USDC" : context.detail.asset.symbol,
      decimals: context.inputDecimals,
      amount: context.inputAmount.toString(),
    },
    output: {
      address: context.outputToken,
      symbol: input.side === "buy" ? context.detail.asset.symbol : "USDC",
      decimals: context.outputDecimals,
      amount: expectedAmount.toString(),
      marketAmount: marketAmount.toString(),
      minimumAmount: minimumAmount.toString(),
    },
    resolverFee: {
      tokenAddress: quote.feeToken,
      amount: preset.tokenFee,
    },
    recommendedPreset: quote.recommended_preset,
    estimatedFillTimeSeconds: preset.startAuctionIn + preset.auctionDuration,
    priceImpactPercent: quote.priceImpactPercent,
    effectiveRatePercent: effectiveRate,
    minimumEffectiveRatePercent: minimumEffectiveRate,
    economicallyViable:
      effectiveRate >= MIN_EFFECTIVE_RATE_PERCENT &&
      minimumEffectiveRate >= MIN_EFFECTIVE_RATE_PERCENT,
    generatedAt: generatedAt.toISOString(),
    expiresAt: new Date(Date.now() + LOCAL_QUOTE_VALIDITY_MS).toISOString(),
  });
}

async function quoteBundle(input: RwasOneInchQuoteRequest, requestId: string) {
  const context = await fusionContext(input, requestId);
  const rawQuote = await fetchFusionQuote(input, context, requestId);
  return { context, rawQuote, quote: normalizeQuote(input, context, rawQuote) };
}

export async function requestRwasOneInchQuote(
  input: RwasOneInchQuoteRequest,
  requestId: string
): Promise<RwasOneInchQuote> {
  return (await quoteBundle(input, requestId)).quote;
}

function ticketMac(payload: string): string {
  return createHmac("sha256", oneInchApiKey())
    .update("ark-rwas-oneinch-order-v1:")
    .update(payload)
    .digest("base64url");
}

function encodeTicket(payload: RwasOneInchTicketPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${ticketMac(encoded)}`;
}

function invalidTicket(): RwasOneInchQuoteError {
  return new RwasOneInchQuoteError(
    400,
    "INVALID_ORDER_TICKET",
    "The 1inch order expired or changed."
  );
}

function decodeTicket(ticket: string): RwasOneInchTicketPayload {
  const parts = ticket.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw invalidTicket();
  const expected = Buffer.from(ticketMac(parts[0]));
  const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw invalidTicket();
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw invalidTicket();
  }
  const parsed = rwasOneInchTicketPayloadSchema.safeParse(value);
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) throw invalidTicket();
  return parsed.data;
}

function typedDataHash(payload: RwasOneInchTicketPayload): Hex {
  return hashTypedData({
    domain: {
      ...payload.typedData.domain,
      verifyingContract: payload.typedData.domain.verifyingContract as Address,
    },
    primaryType: payload.typedData.primaryType,
    types: { Order: payload.typedData.types.Order },
    message: payload.typedData.message,
  });
}

function assertOrderIntegrity(payload: RwasOneInchTicketPayload): void {
  const { order, typedData, quote } = payload;
  const messageMatches = Object.entries(order).every(
    ([key, value]) => typedData.message[key as keyof typeof typedData.message] === value
  );
  if (
    !messageMatches ||
    typedDataHash(payload) !== payload.orderHash ||
    !sameAddress(order.makerAsset, quote.input.address) ||
    !sameAddress(order.takerAsset, quote.output.address) ||
    order.makingAmount !== quote.input.amount ||
    !sameAddress(typedData.domain.verifyingContract, ONEINCH_LIMIT_ORDER_PROTOCOL)
  ) {
    throw invalidTicket();
  }
}

export async function prepareRwasOneInchOrder(
  input: RwasOneInchQuoteRequest,
  requestId: string
): Promise<RwasOneInchPreparedOrder> {
  const { context, rawQuote, quote } = await quoteBundle(input, requestId);
  if (!quote.economicallyViable) {
    throw new RwasOneInchQuoteError(
      409,
      "ONEINCH_QUOTE_UNECONOMIC",
      `The current 1inch route guarantees only ${quote.minimumEffectiveRatePercent.toFixed(2)}% of market value. Enter a larger amount.`
    );
  }

  const request = QuoterRequest.new({
    fromTokenAddress: context.inputToken,
    toTokenAddress: context.outputToken,
    amount: context.inputAmount.toString(),
    walletAddress: input.walletAddress,
    enableEstimate: true,
    source: "ark-rwas",
  });
  let fusionQuote: Quote;
  try {
    fusionQuote = new Quote(request, rawQuote as unknown as QuoterResponse);
  } catch {
    throw new RwasOneInchQuoteError(
      502,
      "ONEINCH_CONTRACT_CHANGED",
      "The 1inch quote could not be converted into an order."
    );
  }
  const order = fusionQuote.createFusionOrder({
    network: NetworkEnum.ETHEREUM,
    preset: fusionQuote.recommendedPreset,
    orderExpirationDelay: 60n,
  });
  const orderData = rwasOneInchOrderSchema.parse(order.build());
  const typedData = rwasOneInchTypedDataSchema.parse(order.getTypedData(ETHEREUM_CHAIN_ID));
  const orderHash = order.getOrderHash(ETHEREUM_CHAIN_ID) as Hex;
  const extension = order.extension.encode() as Hex;
  if (
    !sameAddress(orderData.maker, input.walletAddress) ||
    !sameAddress(orderData.makerAsset, context.inputToken) ||
    !sameAddress(orderData.takerAsset, context.outputToken) ||
    orderData.makingAmount !== context.inputAmount.toString() ||
    typedData.domain.chainId !== ETHEREUM_CHAIN_ID ||
    !sameAddress(typedData.domain.verifyingContract, ONEINCH_LIMIT_ORDER_PROTOCOL)
  ) {
    throw new RwasOneInchQuoteError(
      502,
      "ONEINCH_CONTRACT_CHANGED",
      "The 1inch order does not match the requested trade."
    );
  }

  const expiresAt = Date.now() + LOCAL_QUOTE_VALIDITY_MS;
  const payload = rwasOneInchTicketPayloadSchema.parse({
    version: 1,
    expiresAt,
    quote,
    orderHash,
    order: orderData,
    extension,
    typedData,
  });
  assertOrderIntegrity(payload);
  return rwasOneInchPreparedOrderSchema.parse({
    quote,
    orderHash,
    typedData,
    approval: {
      chainId: ETHEREUM_CHAIN_ID,
      tokenAddress: context.inputToken,
      spenderAddress: ONEINCH_LIMIT_ORDER_PROTOCOL,
      amount: context.inputAmount.toString(),
    },
    ticket: encodeTicket(payload),
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

export async function submitRwasOneInchOrder(
  input: RwasOneInchSubmitRequest,
  requestId: string
): Promise<RwasOneInchSubmitResponse> {
  const payload = decodeTicket(input.ticket);
  assertOrderIntegrity(payload);
  const signer = await recoverTypedDataAddress({
    domain: {
      ...payload.typedData.domain,
      verifyingContract: payload.typedData.domain.verifyingContract as Address,
    },
    primaryType: payload.typedData.primaryType,
    types: { Order: payload.typedData.types.Order },
    message: payload.typedData.message,
    signature: input.signature as Hex,
  });
  if (!sameAddress(signer, payload.order.maker)) {
    throw new RwasOneInchQuoteError(
      401,
      "INVALID_ORDER_SIGNATURE",
      "The 1inch order signature does not match the connected wallet."
    );
  }

  const response = await fetch(
    `${ONEINCH_FUSION_URL}/relayer/v2.0/${ETHEREUM_CHAIN_ID}/order/submit`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${oneInchApiKey()}`,
        "content-type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify({
        order: payload.order,
        signature: input.signature,
        quoteId: payload.quote.quoteId,
        extension: payload.extension,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(RELAYER_TIMEOUT_MS),
    }
  );
  if (!response.ok) throw upstreamFailure(response.status);
  return { orderHash: payload.orderHash, status: "pending" };
}

export async function requestRwasOneInchOrderStatus(
  orderHash: string,
  requestId: string
): Promise<RwasOneInchOrderStatus> {
  if (!bytes32.safeParse(orderHash).success) {
    throw new RwasOneInchQuoteError(
      400,
      "INVALID_ORDER_HASH",
      "The 1inch order reference is invalid."
    );
  }
  const response = await fetch(
    `${ONEINCH_FUSION_URL}/orders/v2.0/${ETHEREUM_CHAIN_ID}/order/status/${orderHash}`,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${oneInchApiKey()}`,
        "x-request-id": requestId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS),
    }
  );
  if (response.status === 404) {
    return { orderHash, status: "pending", transactionHash: null };
  }
  if (!response.ok) throw upstreamFailure(response.status);
  const parsed = oneInchStatusResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new RwasOneInchQuoteError(
      502,
      "ONEINCH_CONTRACT_CHANGED",
      "The 1inch order status is invalid."
    );
  }
  return rwasOneInchOrderStatusSchema.parse({
    orderHash,
    status: parsed.data.status,
    transactionHash: parsed.data.fills.at(-1)?.txHash ?? null,
  });
}
