import { z } from "zod";

// What the RWA screens depend on from the rwa service.
//
// Same contract as the payment schemas: model what the frontend reads, stay
// tolerant of fields the backend adds, fail loudly when one the flow needs
// disappears or changes type. The build response matters most, because its
// steps are the transactions a user is asked to sign.

const chain = z.enum(["solana", "ethereum", "base", "arbitrum", "bsc", "polygon"]);

const asset = z.object({
  id: z.string(),
  chain,
  address: z.string(),
  symbol: z.string(),
  name: z.string(),
  issuer: z.string(),
  category: z.string(),
  freelyTradable: z.boolean(),
  // Best-effort upstream: null when the price source is cold. The table renders
  // a dash for it, so null is expected rather than a fault.
  priceUsd: z.string().nullable().optional(),
  // Null for 29 of the 45 assets the registry currently returns, despite the
  // gateway's own spec typing it as a plain integer. Nullable is the reality.
  yieldApyBps: z.number().nullable().optional(),
  accessMode: z.enum(["dex", "issuer", "hybrid"]).optional(),
  kycRequired: z.boolean().optional(),
  minInvestmentUsd: z.string().nullable().optional(),
  deprecated: z.boolean().optional(),
  tvlUsd: z.string().optional(),
});

const quote = z.object({
  provider: z.string(),
  input: z.object({ chain: z.string(), address: z.string(), amount: z.string() }),
  // output.amount is what the buyer is told they receive.
  output: z.object({
    chain: z.string(),
    address: z.string(),
    amount: z.string(),
    amountMin: z.string().optional(),
  }),
  priceImpactBps: z.number().nullable(),
});

// A step the wallet is asked to sign. `kind` decides how the client handles it,
// so an unrecognised value must not pass silently.
const step = z.object({
  id: z.string(),
  kind: z.enum(["sign-transaction", "sign-typed-data", "post-to-endpoint"]),
  chain,
  description: z.string(),
  tx: z
    .object({
      format: z.string(),
      base64: z.string().optional(),
      to: z.string().optional(),
      data: z.string().optional(),
      value: z.string().optional(),
    })
    .optional(),
  waitForConfirmation: z.boolean().optional(),
});

export const assetsSchema = z.array(asset);

export const categoriesSchema = z.array(z.object({ category: z.string(), count: z.number() }));

export const quoteSchema = z.object({
  best: quote.nullable(),
  all: z.array(quote),
  failed: z.array(z.unknown()),
});

export const buildSchema = z.object({
  actionId: z.string(),
  chain,
  expiresAt: z.string(),
  steps: z.array(step),
  warnings: z.array(z.string()).optional(),
});

// Mirrors the route's own allowlist in lib/server/wsapi.ts.
const RWA_SCHEMAS: { pattern: RegExp; schema: z.ZodType }[] = [
  { pattern: /^categories$/, schema: categoriesSchema },
  { pattern: /^assets$/, schema: assetsSchema },
  { pattern: /^assets\/[^/]+$/, schema: asset },
  { pattern: /^quote$/, schema: quoteSchema },
  { pattern: /^build$/, schema: buildSchema },
];

export function rwaSchemaFor(path: string): z.ZodType | null {
  return RWA_SCHEMAS.find((entry) => entry.pattern.test(path))?.schema ?? null;
}
