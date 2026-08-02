"use client";

import { apiFetch } from "@/lib/api";
import {
  PredictionApiError,
  normalizeChart,
  normalizeLpPositions,
  normalizeMarket,
  normalizeMarkets,
  normalizePositions,
  normalizePrices,
  normalizeTrades,
} from "@/lib/prediction/normalize";
import type {
  ChartInterval,
  ChartPoint,
  LpPosition,
  Market,
  MarketStatus,
  Position,
  PricePoint,
  Trade,
} from "@/lib/prediction/types";

// Typed client for the prediction-market read + metadata service, through the
// /api/prediction proxy. Reads are public; writes only attach off-chain
// metadata. Every function normalizes the raw envelope into domain types before
// returning, so nothing downstream ever touches a raw payload. The money path
// (create/trade/redeem) is on-chain and lives in the action hooks, not here.

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: unknown };
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const res = await apiFetch(`/api/prediction${path}`, init, { requireAuth: auth });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success) {
    throw new PredictionApiError(
      body?.error?.code ?? "SERVICE_UNAVAILABLE",
      body?.error?.message ?? "Prediction markets are unavailable right now.",
      res.status,
      body?.error?.details
    );
  }
  return body.data as T;
}

function post<T>(path: string, payload: unknown, idempotencyKey?: string): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      headers: idempotencyKey
        ? { "Idempotency-Key": idempotencyKey, "x-idem-key": idempotencyKey }
        : undefined,
      body: JSON.stringify(payload),
    },
    false
  );
}

// The gateway filters by `status` only (per the OpenAPI spec). Category is not a
// server parameter, so callers filter by category client-side.
export async function listMarkets(status?: MarketStatus): Promise<Market[]> {
  const query = status ? `?status=${status}` : "";
  const raw = await request<unknown>(`/markets${query}`);
  return normalizeMarkets(raw);
}

// Markets this wallet created (matched on the on-chain creator), so a creator can
// find their own markets to resolve them.
export async function getMyMarkets(wallet: string): Promise<Market[]> {
  return normalizeMarkets(await request<unknown>(`/markets/mine?wallet=${wallet}`));
}

export async function getMarket(id: string): Promise<Market> {
  return normalizeMarket(await request<unknown>(`/markets/${id}`));
}

export async function getMarketChart(id: string, interval: ChartInterval): Promise<ChartPoint[]> {
  return normalizeChart(await request<unknown>(`/markets/${id}/chart?interval=${interval}`));
}

export async function getMarketPrices(id: string): Promise<PricePoint[]> {
  return normalizePrices(await request<unknown>(`/markets/${id}/prices`));
}

export async function getMarketTrades(id: string): Promise<Trade[]> {
  return normalizeTrades(await request<unknown>(`/markets/${id}/trades`));
}

export async function getCategories(): Promise<string[]> {
  const raw = await request<unknown>("/categories");
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === "string");
}

export async function getPositions(wallet: string): Promise<Position[]> {
  const raw = await request<unknown>(`/positions?wallet=${wallet}`);
  return normalizePositions(raw);
}

export async function getPositionsForMarket(id: string, wallet: string): Promise<Position[]> {
  const raw = await request<unknown>(`/positions/${id}?wallet=${wallet}`);
  return normalizePositions(raw, BigInt(id));
}

export async function getLpPositions(wallet: string): Promise<LpPosition[]> {
  const raw = await request<unknown>(`/lp?wallet=${wallet}`);
  return normalizeLpPositions(raw);
}

export interface MarketMetadata {
  question?: string;
  category?: string;
  imageUrl?: string;
}

export function attachMetadata(
  id: string,
  metadata: MarketMetadata,
  idempotencyKey: string
): Promise<{ marketId: string; question?: string; category?: string }> {
  return post(`/markets/${id}/metadata`, metadata, idempotencyKey);
}

// Uploads a base64 data-URL image; the service hosts it on Cloudinary and
// returns the hosted URL. A 503 (image hosting unconfigured) surfaces as a
// typed error the create flow treats as non-fatal.
export function uploadImage(
  id: string,
  dataUrl: string,
  idempotencyKey: string
): Promise<{ marketId: string; imageUrl: string }> {
  return post(`/markets/${id}/image`, { image: dataUrl }, idempotencyKey);
}

// UUID v4 for idempotency keys. crypto.randomUUID only exists in secure
// contexts (https/localhost), so LAN-IP dev falls back to getRandomValues.
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
