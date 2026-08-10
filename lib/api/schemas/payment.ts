import { z } from "zod";

// What the off-ramp flow actually reads from the payment service.
//
// These describe the frontend's requirements, not the service's full response:
// if the backend adds a field we do not model, nothing breaks, but if it stops
// sending one the flow depends on, the proxy fails loudly instead of letting a
// component render undefined. That has already happened twice, with the removal
// of fiat.totalFee and of the sender object.

const tokenAmount = z.object({
  amount: z.string(),
  chainId: z.number(),
  asset: z.string(),
  decimals: z.number(),
});

const fiatQuote = z.object({
  fxRate: z.string(),
  receive: z.object({ amount: z.string(), currency: z.string() }),
  send: z.object({ amount: z.string(), currency: z.string() }),
  // The rail stopped quoting an explicit fee line. Optional on purpose: the
  // review step only renders the row when a fee is actually returned.
  totalFee: z.string().optional(),
});

export const corridorsSchema = z.object({
  corridors: z.array(z.object({ country: z.string(), currencies: z.array(z.string()) })),
});

export const banksSchema = z.object({
  banks: z.array(z.object({ id: z.string(), name: z.string(), country: z.string() })),
});

export const walletsSchema = z.object({
  providers: z.array(
    z.object({
      name: z.string(),
      country: z.string(),
      // Published inconsistently: Ghana returns empty strings for both.
      minPerTx: z.string(),
      maxPerTx: z.string(),
    })
  ),
});

export const verifyRecipientSchema = z.object({
  verified: z.boolean(),
  accountName: z.string().optional(),
});

export const offrampQuoteSchema = z.object({
  provider: z.string(),
  fiat: fiatQuote,
  spreadBps: z.number(),
  settlement: tokenAmount,
  // pay.amountIn is what the user is asked to send. The funding step sends
  // exactly these base units, so a missing value must never reach the client.
  pay: z.object({ amountIn: tokenAmount }),
});

export const rampOrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  publicStatus: z.enum(["awaiting_deposit", "processing", "completed", "needs_attention"]),
  // The address the user funds. A missing one would strand a payment.
  depositAddress: z.string(),
  expectedSettlement: tokenAmount.optional(),
  fiatQuote: fiatQuote.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Which schema guards which allowlisted path. Keys are matched against the
// joined request path, so they stay in step with the route's own allowlist.
export const PAYMENT_SCHEMAS: { pattern: RegExp; schema: z.ZodType }[] = [
  { pattern: /^corridors$/, schema: corridorsSchema },
  { pattern: /^corridors\/[A-Za-z]{2}\/banks$/, schema: banksSchema },
  { pattern: /^corridors\/[A-Za-z]{2}\/wallets$/, schema: walletsSchema },
  { pattern: /^offramp\/orders\/[\w-]+$/, schema: rampOrderSchema },
  { pattern: /^offramp\/quote$/, schema: offrampQuoteSchema },
  { pattern: /^offramp\/orders$/, schema: rampOrderSchema },
  { pattern: /^offramp\/verify-recipient$/, schema: verifyRecipientSchema },
];

export function paymentSchemaFor(path: string): z.ZodType | null {
  return PAYMENT_SCHEMAS.find((entry) => entry.pattern.test(path))?.schema ?? null;
}
