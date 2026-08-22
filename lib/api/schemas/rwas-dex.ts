import { z } from "zod";

import { marketAssetQuoteSideSchema } from "@/lib/api/schemas/rwas";

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/u);
const calldata = z.string().regex(/^0x(?:[0-9a-fA-F]{2})*$/u);
const unsignedInteger = z.string().regex(/^\d+$/u);
const positiveInteger = unsignedInteger.refine((value) => BigInt(value) > 0n);
const positiveDecimal = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/u)
  .refine((value) => Number(value) > 0);

export const rwasDexQuoteRequestSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/u),
  side: marketAssetQuoteSideSchema,
  amount: positiveDecimal,
  walletAddress: address,
});

const dexAssetSchema = z.object({
  address,
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(255),
  amount: positiveInteger,
});

export const rwasDexQuoteSchema = z.object({
  quoteId: z.string().regex(/^0x[0-9a-fA-F]{64}$/u),
  provider: z.string().min(1),
  providerName: z.string().min(1),
  side: marketAssetQuoteSideSchema,
  chainId: z.literal(1),
  input: dexAssetSchema,
  output: dexAssetSchema.extend({ minimumAmount: positiveInteger }),
  approval: z
    .object({
      tokenAddress: address,
      spenderAddress: address,
      amount: positiveInteger,
    })
    .nullable(),
  transaction: z.object({
    to: address,
    data: calldata,
    value: unsignedInteger,
  }),
  estimatedTimeSeconds: z.number().finite().nonnegative(),
  gasFeeUsd: z.string().regex(/^\d+(?:\.\d+)?$/u),
  expiresAt: z.iso.datetime({ offset: true }),
  simulated: z.literal(true),
});

export type RwasDexQuoteRequest = z.infer<typeof rwasDexQuoteRequestSchema>;
export type RwasDexQuote = z.infer<typeof rwasDexQuoteSchema>;
