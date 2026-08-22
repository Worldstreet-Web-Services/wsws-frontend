import { isAddress } from "viem";
import { z } from "zod";

const unsignedIntegerSchema = z.string().regex(/^\d+$/u);
const addressSchema = z.string().refine(isAddress, "A valid EVM address is required.");
const hashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/u);
const hexDataSchema = z.string().regex(/^0x[0-9a-fA-F]*$/u);

export const rwasAcrossQuoteRequestSchema = z.object({
  amount: unsignedIntegerSchema.refine((value) => BigInt(value) > 0n),
  depositor: addressSchema,
});

export type RwasAcrossQuoteRequest = z.infer<typeof rwasAcrossQuoteRequestSchema>;

export const rwasAcrossTransactionSchema = z.object({
  chainId: z.number().int().positive(),
  to: addressSchema,
  data: hexDataSchema,
  value: unsignedIntegerSchema.optional(),
});

export type RwasAcrossTransaction = z.infer<typeof rwasAcrossTransactionSchema>;

export const rwasAcrossQuoteSchema = z.object({
  id: z.string().min(1),
  inputAmount: unsignedIntegerSchema,
  expectedOutputAmount: unsignedIntegerSchema,
  minOutputAmount: unsignedIntegerSchema,
  expectedFillTime: z.number().int().nonnegative(),
  quoteExpiryTimestamp: z.number().int().positive(),
  approvalTxns: z.array(rwasAcrossTransactionSchema),
  swapTx: rwasAcrossTransactionSchema,
});

export type RwasAcrossQuote = z.infer<typeof rwasAcrossQuoteSchema>;

export const rwasAcrossStatusRequestSchema = z.object({
  depositTxnRef: hashSchema,
});

export type RwasAcrossStatusRequest = z.infer<typeof rwasAcrossStatusRequestSchema>;

export const rwasAcrossStatusSchema = z.object({
  status: z.enum(["pending", "filled", "expired", "refunded"]),
  depositTxnRef: hashSchema,
  fillTxnRef: hashSchema.nullable(),
  refundTxnRef: hashSchema.nullable(),
});

export type RwasAcrossStatus = z.infer<typeof rwasAcrossStatusSchema>;
