import "server-only";

import { z } from "zod";

import {
  marketAssetDetailsSchema,
  marketAssetFirmQuoteSchema,
  type MarketAssetFirmQuote,
  type MarketAssetFirmQuoteRequest,
} from "@/lib/api/schemas/rwas";
import { requestRwas } from "@/lib/server/rwas";

const ONDO_FIRM_QUOTE_URL = "https://app.ondo.finance/api/v2/limit_order/soft";
const QUOTE_TIMEOUT_MS = 8_000;
const QUOTE_TTL_MS = 10_000;

const providerQuoteSchema = z.object({
  tokenAmount: z.string(),
  notionalValue: z.string(),
  price: z.string(),
  quotePrice: z.string(),
  appliedGasFee: z.string(),
  volatilityAllowance: z.string(),
  assetAddress: z.string(),
});

const PROVIDER_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  INVALID_NOTIONAL_VALUE: {
    status: 400,
    code: "INVALID_NOTIONAL_VALUE",
    message: "The USDC amount is not valid for this asset.",
  },
  INVALID_TOKEN_AMOUNT: {
    status: 400,
    code: "INVALID_TOKEN_AMOUNT",
    message: "The token amount is not valid for this asset.",
  },
  SESSION_LIMIT_REACHED: {
    status: 409,
    code: "SESSION_LIMIT_REACHED",
    message: "This asset has reached its current session limit.",
  },
  GAS_FEE_EXCEEDS_ORDER_VALUE: {
    status: 400,
    code: "ORDER_TOO_SMALL",
    message: "The order is too small after provider execution costs.",
  },
  MARKET_CLOSED: {
    status: 409,
    code: "MARKET_CLOSED",
    message: "The market is closed for this asset.",
  },
  ASSET_CLOSED_FOR_SESSION: {
    status: 409,
    code: "MARKET_CLOSED",
    message: "This asset is closed for the current trading session.",
  },
  MARKET_PAUSED: {
    status: 409,
    code: "MARKET_PAUSED",
    message: "Trading is temporarily paused for this market.",
  },
  ASSET_PAUSED: {
    status: 409,
    code: "ASSET_PAUSED",
    message: "Trading is temporarily paused for this asset.",
  },
};

export class OndoOrderError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "OndoOrderError";
  }
}

function providerError(value: string): OndoOrderError {
  const normalized = value.trim().replace(/^"|"$/gu, "");
  const known = PROVIDER_ERRORS[normalized];
  if (known) return new OndoOrderError(known.status, known.code, known.message);
  return new OndoOrderError(502, "QUOTE_UNAVAILABLE", "An executable quote is unavailable.");
}

async function ethereumAsset(symbol: string, requestId: string) {
  const response = await requestRwas(
    `market-assets/${encodeURIComponent(symbol)}`,
    new URLSearchParams(),
    requestId
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new OndoOrderError(
      response.status === 404 ? 404 : 502,
      response.status === 404 ? "NOT_FOUND" : "ASSET_UNAVAILABLE",
      response.status === 404 ? "The market asset was not found." : "Asset details are unavailable."
    );
  }

  const envelope = z
    .object({ success: z.literal(true), data: marketAssetDetailsSchema })
    .safeParse(payload);
  if (!envelope.success) {
    throw new OndoOrderError(502, "UPSTREAM_CONTRACT", "Asset details are invalid.");
  }
  const detail = envelope.data.data;
  const deployment = detail.networks.find((network) => network.chainId === 1);
  if (!deployment) {
    throw new OndoOrderError(
      409,
      "ETHEREUM_UNAVAILABLE",
      "This asset is not available on Ethereum."
    );
  }
  if (detail.asset.tradingPaused || detail.tradingStatus?.tradeable === false) {
    throw new OndoOrderError(
      409,
      "ASSET_PAUSED",
      "Trading is temporarily unavailable for this asset."
    );
  }
  return { detail, deployment };
}

export async function requestOndoFirmQuote(
  input: MarketAssetFirmQuoteRequest,
  requestId: string
): Promise<MarketAssetFirmQuote> {
  const { detail, deployment } = await ethereumAsset(input.symbol, requestId);
  const response = await fetch(ONDO_FIRM_QUOTE_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-request-id": requestId,
    },
    body: JSON.stringify({
      chainId: 1,
      symbol: detail.asset.symbol,
      side: input.side,
      ...(input.side === "buy" ? { notionalValue: input.amount } : { tokenAmount: input.amount }),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS),
  });

  if (!response.ok) throw providerError(await response.text());
  const parsed = providerQuoteSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new OndoOrderError(502, "UPSTREAM_CONTRACT", "The executable quote is invalid.");
  }
  if (parsed.data.assetAddress.toLowerCase() !== deployment.address.toLowerCase()) {
    throw new OndoOrderError(
      502,
      "ASSET_MISMATCH",
      "The executable quote does not match this asset."
    );
  }

  return marketAssetFirmQuoteSchema.parse({
    ...parsed.data,
    symbol: detail.asset.symbol,
    side: input.side,
    chainId: 1,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  });
}
