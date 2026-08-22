import { z } from "zod";

const timestamp = z.iso.datetime({ offset: true });
const nonNegativeInteger = z.number().int().nonnegative();

export const marketAssetTagSchema = z.object({
  categoryLayer: z.string(),
  categorySlug: z.string(),
  categoryLabel: z.string(),
  tagSlug: z.string(),
  tagLabel: z.string(),
});

export const marketPricePointSchema = z.object({
  timestamp,
  priceUsd: z.string(),
});

export const primaryMarketSchema = z.object({
  priceUsd: z.string(),
  priceChange24hUsd: z.string(),
  priceChange24hPercent: z.string(),
  change24hAvailable: z.boolean().default(false),
  chartAvailable: z.boolean().default(false),
  priceHistory24h: z.array(marketPricePointSchema),
});

export const underlyingMarketSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  priceHigh52wUsd: z.string(),
  priceLow52wUsd: z.string(),
  volume24hUsd: z.string(),
  averageVolume: z.string(),
  sharesOutstanding: z.string(),
  marketCapUsd: z.string(),
});

export const marketAssetStablecoinSchema = z.object({
  symbol: z.string(),
  currency: z.string(),
  network: z.string(),
  address: z.string(),
  decimals: z.number().int().min(0).max(255),
  issuance: z.boolean(),
  redemption: z.boolean(),
  supportsAtomicSwaps: z.boolean(),
  solanaTokenProgram: z.string().nullable().optional(),
});

export const marketAssetNetworkSchema = z.object({
  network: z.string(),
  chainId: nonNegativeInteger,
  address: z.string(),
  decimals: z.number().int().min(0).max(255),
  wrapperAddress: z.string().nullable().optional(),
  wrapperAddressV2: z.string().nullable().optional(),
  supportsAtomicSwaps: z.boolean().default(false),
  stablecoins: z.array(marketAssetStablecoinSchema).default([]),
});

export const marketAssetSummarySchema = z.object({
  source: z.string(),
  symbol: z.string(),
  coingeckoId: z.string().nullable().optional(),
  ticker: z.string().nullable(),
  name: z.string(),
  iconUrl: z.string(),
  tags: z.array(marketAssetTagSchema),
  createdAt: timestamp,
  tradingPaused: z.boolean(),
  offHoursTradable: z.boolean(),
  primaryMarket: primaryMarketSchema,
  underlyingMarket: underlyingMarketSchema.nullable(),
  networks: z.array(marketAssetNetworkSchema),
  marketDataUpdatedAt: timestamp,
});

export const marketAssetListSchema = z.object({
  items: z.array(marketAssetSummarySchema).max(200),
  total: nonNegativeInteger,
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(200),
  totalPages: nonNegativeInteger,
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  limit: z.number().int().min(1).max(200),
  offset: z.number().int().min(0).max(10_000),
  lastUpdatedAt: timestamp.nullable(),
});

export const marketAssetTradingStatusSchema = z.object({
  tradeable: z.boolean(),
  pauseReason: z.string().nullable(),
  marketOpen: z.boolean(),
  currentSession: z.string().nullable(),
  nextMarketOpen: timestamp.nullable(),
  offHoursTradable: z.boolean(),
});

export const marketAssetDocumentSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export const marketAssetDetailPrimaryMarketSchema = z.object({
  priceUsd: z.string().nullable(),
  openUsd: z.string().nullable(),
  highUsd: z.string().nullable(),
  lowUsd: z.string().nullable(),
  closeUsd: z.string().nullable(),
  priceChange24hUsd: z.string().nullable(),
  priceChange24hPercent: z.string().nullable(),
  apyPercent: z.string().nullable(),
  fullyDilutedValueUsd: z.string().nullable(),
  marketCapUsd: z.string().nullable(),
  totalSupply: z.string().nullable(),
  circulatingSupply: z.string().nullable(),
  tvlUsd: z.string().nullable(),
  volume24hUsd: z.string().nullable(),
  averageVolume: z.string().nullable(),
  sharesMultiplier: z.string().nullable(),
});

export const marketAssetDetailUnderlyingMarketSchema = z.object({
  openUsd: z.string().nullable(),
  highUsd: z.string().nullable(),
  lowUsd: z.string().nullable(),
  marketCapUsd: z.string().nullable(),
  volume24hUsd: z.string().nullable(),
  averageVolume: z.string().nullable(),
});

export const marketAssetVenueSchema = z.object({
  id: z.string(),
  name: z.string(),
  iconUrl: z.string(),
  url: z.string(),
  supportedChainIds: z.array(nonNegativeInteger),
  venueType: z.string(),
  displayOrder: z.number().int().nullable(),
});

export const marketAssetHoldingSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  weightPercent: z.string(),
  updatedAt: timestamp,
});

export const marketAssetDividendSchema = z.object({
  dividendYieldPercent: z.string().nullable(),
  lastCashAmountUsd: z.string().nullable(),
  lastPaymentDate: z.string().nullable(),
  payoutFrequency: z.string().nullable(),
  ticker: z.string().nullable(),
});

export const marketAssetRelatedAssetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  tokenName: z.string(),
  underlyingName: z.string(),
  description: z.string().nullable(),
  iconUrl: z.string(),
  minimumAmountUsd: z.string().nullable(),
  globalDailyLimitUsd: z.string().nullable(),
  createdAt: timestamp,
  tags: z.array(marketAssetTagSchema),
});

export const marketAssetSessionLimitSchema = z.object({
  tradable: z.boolean(),
  maxAttestationCount: z.string(),
  maxActiveNotionalValueUsd: z.string(),
});

export const marketAssetSessionLimitsSchema = z.object({
  premarket: marketAssetSessionLimitSchema.nullable(),
  regular: marketAssetSessionLimitSchema.nullable(),
  postmarket: marketAssetSessionLimitSchema.nullable(),
  overnight: marketAssetSessionLimitSchema.nullable(),
  offhours: marketAssetSessionLimitSchema.nullable(),
});

export const marketAssetDetailsSchema = z.object({
  asset: marketAssetSummarySchema,
  detailsAvailable: z.boolean(),
  providerAssetId: z.string().nullable(),
  isin: z.string().nullable(),
  underlyingIsin: z.string().nullable(),
  tradingHoursMode: z.string().nullable(),
  tokenName: z.string().nullable(),
  underlyingName: z.string().nullable(),
  description: z.string().nullable(),
  networks: z.array(marketAssetNetworkSchema),
  tradingStatus: marketAssetTradingStatusSchema.nullable(),
  documents: z.array(marketAssetDocumentSchema),
  primaryMarket: marketAssetDetailPrimaryMarketSchema.nullable(),
  underlyingMarket: marketAssetDetailUnderlyingMarketSchema.nullable(),
  supportedPaymentMethods: z.array(z.string()),
  minimumAmountUsd: z.string().nullable(),
  venues: z.array(marketAssetVenueSchema),
  topHoldings: z.array(marketAssetHoldingSchema),
  dividend: marketAssetDividendSchema.nullable(),
  relatedAssets: z.array(marketAssetRelatedAssetSchema),
  legalNoticeUrl: z.string().nullable(),
  sessionLimits: marketAssetSessionLimitsSchema.nullable(),
  detailRefreshedAt: timestamp.nullable(),
});

export const marketAssetQuoteSideSchema = z.enum(["buy", "sell"]);

export const marketAssetQuoteSchema = z.object({
  symbol: z.string(),
  side: marketAssetQuoteSideSchema,
  inputAsset: z.string(),
  inputAmount: z.string(),
  outputAsset: z.string(),
  outputAmount: z.string(),
  unitPriceUsd: z.string(),
  paymentAsset: z.literal("USDC"),
  network: z.string(),
  chainId: nonNegativeInteger,
  tokenAddress: z.string(),
  indicative: z.literal(true),
  expiresAt: timestamp,
});

const positiveDecimalString = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/u)
  .refine((value) => Number(value) > 0, "Amount must be greater than zero.");

export const marketAssetFirmQuoteRequestSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/u),
  side: marketAssetQuoteSideSchema,
  amount: positiveDecimalString,
});

export const marketAssetFirmQuoteSchema = z.object({
  symbol: z.string(),
  side: marketAssetQuoteSideSchema,
  chainId: z.literal(1),
  assetAddress: z.string(),
  tokenAmount: positiveDecimalString,
  notionalValue: positiveDecimalString,
  price: positiveDecimalString,
  quotePrice: positiveDecimalString,
  appliedGasFee: z.string().regex(/^\d+(?:\.\d+)?$/u),
  volatilityAllowance: z.string().regex(/^\d+(?:\.\d+)?$/u),
  expiresAt: timestamp,
});

export const marketAssetHistoryRangeSchema = z.enum([
  "1day",
  "1week",
  "1month",
  "3month",
  "1year",
  "all",
]);

export const marketAssetHistoryPointSchema = z.object({
  timestamp,
  valueUsd: z.string(),
  openUsd: z.string().nullable(),
  highUsd: z.string().nullable(),
  lowUsd: z.string().nullable(),
  closeUsd: z.string().nullable(),
});

export const marketAssetHistorySchema = z.object({
  symbol: z.string(),
  range: marketAssetHistoryRangeSchema,
  available: z.boolean(),
  primaryMarketPrice: z.array(marketAssetHistoryPointSchema).max(20_000),
  underlyingMarketPrice: z.array(marketAssetHistoryPointSchema).max(20_000),
  refreshedAt: timestamp.nullable(),
});

export type MarketAssetTag = z.infer<typeof marketAssetTagSchema>;
export type MarketPricePoint = z.infer<typeof marketPricePointSchema>;
export type PrimaryMarket = z.infer<typeof primaryMarketSchema>;
export type UnderlyingMarket = z.infer<typeof underlyingMarketSchema>;
export type MarketAssetSummary = z.infer<typeof marketAssetSummarySchema>;
export type MarketAssetList = z.infer<typeof marketAssetListSchema>;
export type MarketAssetStablecoin = z.infer<typeof marketAssetStablecoinSchema>;
export type MarketAssetNetwork = z.infer<typeof marketAssetNetworkSchema>;
export type MarketAssetTradingStatus = z.infer<typeof marketAssetTradingStatusSchema>;
export type MarketAssetDocument = z.infer<typeof marketAssetDocumentSchema>;
export type MarketAssetDetailPrimaryMarket = z.infer<typeof marketAssetDetailPrimaryMarketSchema>;
export type MarketAssetDetailUnderlyingMarket = z.infer<
  typeof marketAssetDetailUnderlyingMarketSchema
>;
export type MarketAssetVenue = z.infer<typeof marketAssetVenueSchema>;
export type MarketAssetHolding = z.infer<typeof marketAssetHoldingSchema>;
export type MarketAssetDividend = z.infer<typeof marketAssetDividendSchema>;
export type MarketAssetRelatedAsset = z.infer<typeof marketAssetRelatedAssetSchema>;
export type MarketAssetSessionLimit = z.infer<typeof marketAssetSessionLimitSchema>;
export type MarketAssetSessionLimits = z.infer<typeof marketAssetSessionLimitsSchema>;
export type MarketAssetDetails = z.infer<typeof marketAssetDetailsSchema>;
export type MarketAssetQuoteSide = z.infer<typeof marketAssetQuoteSideSchema>;
export type MarketAssetQuote = z.infer<typeof marketAssetQuoteSchema>;
export type MarketAssetFirmQuoteRequest = z.infer<typeof marketAssetFirmQuoteRequestSchema>;
export type MarketAssetFirmQuote = z.infer<typeof marketAssetFirmQuoteSchema>;
export type MarketAssetHistorySourceRange = z.infer<typeof marketAssetHistoryRangeSchema>;
export type MarketAssetHistoryPoint = z.infer<typeof marketAssetHistoryPointSchema>;
export type MarketAssetHistory = z.infer<typeof marketAssetHistorySchema>;

export function rwasSchemaFor(path: string): z.ZodType | null {
  if (path === "market-assets") return marketAssetListSchema;
  if (/^market-assets\/[^/]+\/history$/u.test(path)) return marketAssetHistorySchema;
  if (/^market-assets\/[^/]+\/quote$/u.test(path)) return marketAssetQuoteSchema;
  if (/^market-assets\/[^/]+$/u.test(path)) return marketAssetDetailsSchema;
  return null;
}
