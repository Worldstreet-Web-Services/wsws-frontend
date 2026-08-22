import { z } from "zod";

import { rwasDexQuoteRequestSchema } from "@/lib/api/schemas/rwas-dex";
import { marketAssetQuoteSideSchema } from "@/lib/api/schemas/rwas";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/u);
const bytes32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/u);
const hex = z.string().regex(/^0x(?:[0-9a-fA-F]{2})*$/u);
const unsignedInteger = z.string().regex(/^\d+$/u);
const positiveInteger = unsignedInteger.refine((value) => BigInt(value) > 0n);

export const rwasOneInchQuoteRequestSchema = rwasDexQuoteRequestSchema;

const oneInchAssetSchema = z.object({
  address,
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(255),
  amount: positiveInteger,
});

export const rwasOneInchQuoteSchema = z.object({
  quoteId: z.uuid(),
  provider: z.literal("1inch-fusion"),
  providerName: z.literal("1inch Fusion"),
  side: marketAssetQuoteSideSchema,
  chainId: z.literal(1),
  input: oneInchAssetSchema,
  output: oneInchAssetSchema.extend({
    marketAmount: positiveInteger,
    minimumAmount: positiveInteger,
  }),
  resolverFee: z.object({
    tokenAddress: address,
    amount: unsignedInteger,
  }),
  recommendedPreset: z.string().min(1),
  estimatedFillTimeSeconds: z.number().int().positive(),
  priceImpactPercent: z.number().finite().nonnegative(),
  effectiveRatePercent: z.number().finite().nonnegative(),
  minimumEffectiveRatePercent: z.number().finite().nonnegative(),
  economicallyViable: z.boolean(),
  generatedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
});

const eip712FieldSchema = z.object({ name: z.string().min(1), type: z.string().min(1) });

export const rwasOneInchOrderSchema = z.object({
  salt: unsignedInteger,
  maker: address,
  receiver: address,
  makerAsset: address,
  takerAsset: address,
  makingAmount: positiveInteger,
  takingAmount: positiveInteger,
  makerTraits: unsignedInteger,
});

export const rwasOneInchTypedDataSchema = z.object({
  primaryType: z.literal("Order"),
  types: z.object({
    EIP712Domain: z.array(eip712FieldSchema).min(1),
    Order: z.array(eip712FieldSchema).min(1),
  }),
  domain: z.object({
    name: z.literal("1inch Aggregation Router"),
    version: z.literal("6"),
    chainId: z.literal(1),
    verifyingContract: address,
  }),
  message: rwasOneInchOrderSchema,
});

export const rwasOneInchPrepareRequestSchema = rwasOneInchQuoteRequestSchema;

export const rwasOneInchPreparedOrderSchema = z.object({
  quote: rwasOneInchQuoteSchema,
  orderHash: bytes32,
  typedData: rwasOneInchTypedDataSchema,
  approval: z.object({
    chainId: z.literal(1),
    tokenAddress: address,
    spenderAddress: address,
    amount: positiveInteger,
  }),
  ticket: z.string().min(1).max(16_384),
  expiresAt: z.iso.datetime({ offset: true }),
});

export const rwasOneInchSubmitRequestSchema = z.object({
  ticket: z.string().min(1).max(16_384),
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/u),
});

export const rwasOneInchSubmitResponseSchema = z.object({
  orderHash: bytes32,
  status: z.literal("pending"),
});

export const rwasOneInchOrderStatusSchema = z.object({
  orderHash: bytes32,
  status: z.enum([
    "pending",
    "filled",
    "false-predicate",
    "not-enough-balance-or-allowance",
    "expired",
    "partially-filled",
    "wrong-permit",
    "cancelled",
    "invalid-signature",
  ]),
  transactionHash: bytes32.nullable(),
});

export const rwasOneInchTicketPayloadSchema = z.object({
  version: z.literal(1),
  expiresAt: z.number().int().positive(),
  quote: rwasOneInchQuoteSchema,
  orderHash: bytes32,
  order: rwasOneInchOrderSchema,
  extension: hex,
  typedData: rwasOneInchTypedDataSchema,
});

export type RwasOneInchQuoteRequest = z.infer<typeof rwasOneInchQuoteRequestSchema>;
export type RwasOneInchQuote = z.infer<typeof rwasOneInchQuoteSchema>;
export type RwasOneInchPreparedOrder = z.infer<typeof rwasOneInchPreparedOrderSchema>;
export type RwasOneInchSubmitRequest = z.infer<typeof rwasOneInchSubmitRequestSchema>;
export type RwasOneInchSubmitResponse = z.infer<typeof rwasOneInchSubmitResponseSchema>;
export type RwasOneInchOrderStatus = z.infer<typeof rwasOneInchOrderStatusSchema>;
export type RwasOneInchTicketPayload = z.infer<typeof rwasOneInchTicketPayloadSchema>;
