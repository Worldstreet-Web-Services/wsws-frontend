// Normalization seam: raw prediction-market API payloads (6-dec integer strings,
// unix-second numbers, string enums) mapped into the numeric domain model. No
// framework imports. Components never see a raw payload; they only ever get the
// types in ./types. Malformed input throws a typed error rather than coercing
// silently, so a bad field surfaces at the seam instead of corrupting money math
// downstream.

import {
  PRICE_SCALE,
  type ChartPoint,
  type LpPosition,
  type Market,
  type MarketStatus,
  type Outcome,
  type Position,
  type PricePoint,
  type Side,
  type Trade,
} from "@/lib/prediction/types";

export class PredictionApiError extends Error {
  code: string;
  status: number;
  // Optional error.details from the envelope (e.g. { reason: "not_configured" }
  // on the image endpoint), so callers can degrade gracefully.
  details?: unknown;
  constructor(code: string, message: string, status = 0, details?: unknown) {
    super(message);
    this.name = "PredictionApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Whether an image-upload failure is because Cloudinary isn't configured on the
// deployment (a 502 with details.reason === "not_configured"), which the create
// flow treats as "attach no image" rather than a hard error.
export function isImageNotConfigured(error: unknown): boolean {
  if (!(error instanceof PredictionApiError)) return false;
  const details = error.details;
  return (
    !!details &&
    typeof details === "object" &&
    (details as { reason?: unknown }).reason === "not_configured"
  );
}

const MALFORMED = "MALFORMED_RESPONSE";

// A non-negative integer string or JS integer to bigint. The API sends money,
// reserves, shares, and prices as already-scaled integer strings.
function toBig(value: unknown, field: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new PredictionApiError(MALFORMED, `Field "${field}" is not a valid integer.`);
    }
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  throw new PredictionApiError(MALFORMED, `Field "${field}" is not a valid amount.`);
}

// A finite non-negative unix-seconds timestamp.
function toUnixSeconds(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new PredictionApiError(MALFORMED, `Field "${field}" is not a valid timestamp.`);
  }
  return Math.floor(value);
}

function toNullableStr(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

const STATUSES: readonly MarketStatus[] = ["Open", "Closed", "Resolved", "Invalid"];
const OUTCOMES: readonly Outcome[] = ["Unresolved", "Yes", "No"];

function toStatus(value: unknown): MarketStatus {
  if (typeof value === "string" && (STATUSES as readonly string[]).includes(value)) {
    return value as MarketStatus;
  }
  throw new PredictionApiError(MALFORMED, `Unknown market status "${String(value)}".`);
}

function toOutcome(value: unknown): Outcome {
  if (typeof value === "string" && (OUTCOMES as readonly string[]).includes(value)) {
    return value as Outcome;
  }
  throw new PredictionApiError(MALFORMED, `Unknown market outcome "${String(value)}".`);
}

function toSide(value: unknown): Side {
  if (value === "yes" || value === "no") return value;
  throw new PredictionApiError(MALFORMED, `Unknown side "${String(value)}".`);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value == null || typeof value !== "object") {
    throw new PredictionApiError(MALFORMED, "Expected an object.");
  }
  return value as Record<string, unknown>;
}

export function normalizeMarket(raw: unknown): Market {
  const m = asRecord(raw);
  const priceYes = toBig(m.priceYes, "priceYes");
  return {
    marketId: toBig(m.marketId, "marketId"),
    // Creator can be empty on markets not yet fully indexed; don't reject those.
    creator: typeof m.creator === "string" ? m.creator : "",
    question: toNullableStr(m.question),
    category: toNullableStr(m.category),
    imageUrl: toNullableStr(m.imageUrl),
    status: toStatus(m.status),
    outcome: toOutcome(m.outcome),
    closeTime: toUnixSeconds(m.closeTime, "closeTime"),
    feeBps: Number(toBig(m.feeBps, "feeBps")),
    priceYes,
    // Single source of truth: derive priceNo from priceYes even when the API
    // supplies it, so the two can never disagree.
    priceNo: PRICE_SCALE - priceYes,
    rYes: toBig(m.rYes, "rYes"),
    rNo: toBig(m.rNo, "rNo"),
    totalLp: toBig(m.totalLp, "totalLp"),
    collateral: toBig(m.collateral, "collateral"),
    volumeUsdc: toBig(m.volumeUsdc, "volumeUsdc"),
  };
}

// Normalizes a list, skipping any entry that fails rather than throwing the
// whole list away. A single malformed row from the indexer must never blank an
// entire view; the bad row is dropped and logged.
function mapValid<T>(raw: unknown, one: (item: unknown) => T, label: string): T[] {
  if (!Array.isArray(raw)) throw new PredictionApiError(MALFORMED, `Expected a ${label} list.`);
  const out: T[] = [];
  for (const item of raw) {
    try {
      out.push(one(item));
    } catch (error) {
      console.warn(`[prediction] skipping malformed ${label}`, error);
    }
  }
  return out;
}

export function normalizeMarkets(raw: unknown): Market[] {
  return mapValid(raw, normalizeMarket, "market");
}

export function normalizeTrade(raw: unknown): Trade {
  const t = asRecord(raw);
  return {
    txHash: typeof t.txHash === "string" ? t.txHash : "",
    trader: typeof t.trader === "string" ? t.trader : "",
    buy: Boolean(t.buy),
    side: toSide(t.side),
    usdcAmount: toBig(t.usdcAmount, "usdcAmount"),
    shareAmount: toBig(t.shareAmount, "shareAmount"),
    priceYes: toBig(t.priceYes, "priceYes"),
    block: Number(toBig(t.block, "block")),
  };
}

export function normalizeTrades(raw: unknown): Trade[] {
  return mapValid(raw, normalizeTrade, "trade");
}

export function normalizeChartPoint(raw: unknown): ChartPoint {
  const p = asRecord(raw);
  return {
    t: toUnixSeconds(p.t, "t"),
    yes: toBig(p.yes, "yes"),
    no: toBig(p.no, "no"),
  };
}

export function normalizeChart(raw: unknown): ChartPoint[] {
  return mapValid(raw, normalizeChartPoint, "chart point");
}

export function normalizePricePoint(raw: unknown): PricePoint {
  const p = asRecord(raw);
  return {
    block: Number(toBig(p.block, "block")),
    priceYes: toBig(p.priceYes, "priceYes"),
  };
}

export function normalizePrices(raw: unknown): PricePoint[] {
  return mapValid(raw, normalizePricePoint, "price point");
}

// Positions from the list endpoint carry marketId; the per-market endpoint omits
// it, so the caller supplies it.
export function normalizePosition(raw: unknown, marketId?: bigint): Position {
  const p = asRecord(raw);
  return {
    marketId: marketId ?? toBig(p.marketId, "marketId"),
    side: toSide(p.side),
    shares: toBig(p.shares, "shares"),
    costUsdc: toBig(p.costUsdc, "costUsdc"),
  };
}

export function normalizePositions(raw: unknown, marketId?: bigint): Position[] {
  return mapValid(raw, (item) => normalizePosition(item, marketId), "position");
}

export function normalizeLpPosition(raw: unknown): LpPosition {
  const l = asRecord(raw);
  return {
    marketId: toBig(l.marketId, "marketId"),
    lpShares: toBig(l.lpShares, "lpShares"),
  };
}

export function normalizeLpPositions(raw: unknown): LpPosition[] {
  return mapValid(raw, normalizeLpPosition, "LP position");
}
