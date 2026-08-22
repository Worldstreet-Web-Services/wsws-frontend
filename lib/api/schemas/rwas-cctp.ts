import { isAddress } from "viem";
import { z } from "zod";

const unsignedIntegerSchema = z.string().regex(/^\d+$/u);
const addressSchema = z.string().refine(isAddress, "A valid EVM address is required.");
const hashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/u);
const hexDataSchema = z.string().regex(/^0x[0-9a-fA-F]+$/u);

export const rwasCctpQuoteRequestSchema = z.object({
  amount: unsignedIntegerSchema.refine((value) => BigInt(value) > 0n),
  depositor: addressSchema,
});

export type RwasCctpQuoteRequest = z.infer<typeof rwasCctpQuoteRequestSchema>;

export const rwasCctpQuoteSchema = z.object({
  id: z.string().uuid(),
  inputAmount: unsignedIntegerSchema,
  expectedOutputAmount: unsignedIntegerSchema,
  minOutputAmount: unsignedIntegerSchema,
  maxFee: unsignedIntegerSchema,
  feeBps: z.string().regex(/^\d+(?:\.\d+)?$/u),
  expectedFillTime: z.number().int().nonnegative(),
  quoteExpiryTimestamp: z.number().int().positive(),
});

export type RwasCctpQuote = z.infer<typeof rwasCctpQuoteSchema>;

export const rwasCctpStatusRequestSchema = z.object({
  sourceTransactionHash: hashSchema,
  depositor: addressSchema,
  amount: unsignedIntegerSchema.refine((value) => BigInt(value) > 0n),
});

export type RwasCctpStatusRequest = z.infer<typeof rwasCctpStatusRequestSchema>;

export const rwasCctpStatusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("pending"),
    sourceTransactionHash: hashSchema,
  }),
  z.object({
    status: z.literal("complete"),
    sourceTransactionHash: hashSchema,
    message: hexDataSchema,
    attestation: hexDataSchema,
    outputAmount: unsignedIntegerSchema,
    feeExecuted: unsignedIntegerSchema,
  }),
]);

export type RwasCctpStatus = z.infer<typeof rwasCctpStatusSchema>;
