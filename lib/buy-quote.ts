// Dextopus quote + status client for market buys. A buy quotes the user's USDC
// on Base into the chosen destination token/chain, delivered to the user's own
// wallet. Requests go through the /api/dextopus proxy. The live Dextopus
// response shape differs from the (never-wired) deposit types in lib/deposit, so
// it is normalized here against the live fields. Amounts stay in integer base
// units (bigint) so we never lose precision to floating point.

import { apiFetch } from "@/lib/api";
import { toBaseUnits } from "@/lib/trade/math";
import { BUY_ORIGIN, type BuyRoute } from "@/lib/buy";

export interface BuyQuoteInput {
  route: BuyRoute;
  // USDC to spend, in base units (6 decimals).
  amount: bigint;
  // The user's own wallet on the destination chain: where the bought token lands.
  recipient: string;
  // The user's Base wallet, refunded if the bridge cannot complete.
  refundTo: string;
  slippageBps: number;
  // Preview only: quote without minting a deposit address.
  dry?: boolean;
}

export interface BuyQuote {
  // Estimated destination token received, in that token's base units.
  estimatedOutput: bigint;
  // Present only on a real (non-dry) quote: where to send the USDC, and the id
  // to poll status against.
  depositAddress: string | null;
  requestId: string | null;
  expiresAt: string | null;
}

// Build the Dextopus deposit/quote body for a buy. Pure, so it is unit tested.
export function buildBuyQuoteBody(input: BuyQuoteInput) {
  return {
    originChainId: BUY_ORIGIN.chainId,
    originAsset: BUY_ORIGIN.asset,
    destinationChainId: input.route.destinationChainId,
    destinationAsset: input.route.asset,
    amount: input.amount.toString(),
    recipient: input.recipient,
    refundTo: input.refundTo,
    slippageBps: input.slippageBps,
    dry: Boolean(input.dry),
  };
}

interface RawBuyQuote {
  success?: boolean;
  depositAddress?: string;
  requestId?: string;
  estimatedOutput?: string;
  amountOut?: string;
  expiresAt?: string;
}

// Parse an output amount the API may return either as integer base units
// ("1230000") or a human decimal ("1.23"). Base units are the documented shape;
// the decimal branch is a defensive fallback so an unexpected format is not read
// as a wildly wrong integer.
function parseOutput(value: string, decimals: number): bigint {
  const v = value.trim();
  return v.includes(".") ? toBaseUnits(v, decimals) : BigInt(v || "0");
}

// Normalize a raw Dextopus quote. estimatedOutput is the forward-quote field;
// amountOut is the reverse-quote fallback.
export function normalizeBuyQuote(raw: RawBuyQuote, decimals: number): BuyQuote {
  const out = raw.estimatedOutput ?? raw.amountOut;
  if (out == null) throw new Error("The quote returned no output amount.");
  return {
    estimatedOutput: parseOutput(out, decimals),
    depositAddress: raw.depositAddress ?? null,
    requestId: raw.requestId ?? null,
    expiresAt: raw.expiresAt ?? null,
  };
}

export async function fetchBuyQuote(input: BuyQuoteInput): Promise<BuyQuote> {
  const res = await apiFetch("/api/dextopus/deposit/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildBuyQuoteBody(input)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.message === "string" ? data.message : "Couldn't get a buy quote.";
    throw new Error(message);
  }
  return normalizeBuyQuote(data, input.route.decimals);
}

export interface BuyStatus {
  status: string;
  progress: { deposited: boolean; bridged: boolean; settled: boolean };
  destinationTxHash: string | null;
}

export async function fetchBuyStatus(requestId: string): Promise<BuyStatus> {
  const res = await apiFetch(
    `/api/dextopus/deposit/status?requestId=${encodeURIComponent(requestId)}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Couldn't check buy status.");
  const p = (data.progress ?? {}) as Record<string, unknown>;
  return {
    status: typeof data.status === "string" ? data.status : "",
    progress: {
      deposited: Boolean(p.deposited),
      bridged: Boolean(p.bridged),
      settled: Boolean(p.settled),
    },
    destinationTxHash: typeof data.destinationTxHash === "string" ? data.destinationTxHash : null,
  };
}

// Map the live status into the shared deposit stage strings so depositProgress
// and the DepositStatus component can render a buy the same way as a deposit.
export function buyStatusStrings(s: BuyStatus): { status: string; executionStatus: string } {
  const exec = s.progress.settled
    ? "settled"
    : s.progress.bridged
      ? "processing"
      : s.progress.deposited
        ? "detected"
        : "";
  return { status: s.status, executionStatus: exec };
}
