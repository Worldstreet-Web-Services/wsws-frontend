// Display helpers for the prediction market. These convert the bigint money
// model into numbers/strings for rendering only. Floats appear here, at the leaf,
// never on the money path (quotes, guards, and calldata stay bigint).

import { PRICE_SCALE, USDC_DECIMALS, type Side } from "@/lib/prediction/types";
import { fromBaseUnits } from "@/lib/trade/math";

// A 6-dec USDC/share amount as a display number.
export function toNumber(raw: bigint, decimals = USDC_DECIMALS): number {
  return Number(fromBaseUnits(raw, decimals));
}

// A 0..1e6 price as whole cents, e.g. 625123 -> "63¢".
export function priceToCents(price: bigint): string {
  const cents = Math.round((Number(price) / Number(PRICE_SCALE)) * 100);
  return `${cents}¢`;
}

// A 0..1e6 price as a percentage 0..100 for a progress bar.
export function priceToPct(price: bigint): number {
  return (Number(price) / Number(PRICE_SCALE)) * 100;
}

// A 0..1e6 price as a probability fraction 0..1, for the chart series.
export function priceToFraction(price: bigint): number {
  return Number(price) / Number(PRICE_SCALE);
}

// Compact USD for market stats, e.g. 1_200_000_000000n -> "$1.2M".
export function compactUsd(raw: bigint): string {
  const n = toNumber(raw);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)}`;
}

export function sideLabel(side: Side): "Yes" | "No" {
  return side === "yes" ? "Yes" : "No";
}
