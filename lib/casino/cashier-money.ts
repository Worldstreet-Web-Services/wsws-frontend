// Money for the chess cashier: Base USDC, six decimals.
//
// Deliberately separate from lib/casino/money.ts, whose STAKE_DECIMALS is 18
// because the draw and spectator betting settle in ETH. Using that here would
// inflate every amount by a factor of a trillion.
//
// The service speaks decimal strings at its boundary ("10", "9.5") and
// micro-USDC internally. This mirrors that: parse to bigint on arrival, do
// every comparison and sum on the integer, and format back to a decimal string
// only in a request body. No float touches a stake, a fee or a balance.

import { fromBaseUnits, toBaseUnits } from "@/lib/trade/math";

export const USDC_DECIMALS = 6;

const DECIMAL_INPUT = /^\d*\.?\d*$/;

// Parses an amount the service sent, or one the user typed. Returns null rather
// than zero on anything unreadable: a balance that failed to parse must not
// render as "0 available", which would read as a real, empty balance.
export function parseUsdc(value: string | null | undefined): bigint | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned === "." || !DECIMAL_INPUT.test(cleaned)) return null;
  const [, fraction = ""] = cleaned.split(".");
  // More precision than USDC has would be silently truncated, and a stake is
  // not a place to round somebody's money down without telling them.
  if (fraction.length > USDC_DECIMALS) return null;
  return toBaseUnits(cleaned, USDC_DECIMALS);
}

// Parses a user-typed amount, throwing so a form can show why it was refused.
export function requireUsdc(value: string): bigint {
  const parsed = parseUsdc(value);
  if (parsed === null) throw new Error(`Enter an amount with at most ${USDC_DECIMALS} decimals.`);
  if (parsed <= 0n) throw new Error("Enter an amount greater than zero.");
  return parsed;
}

// The decimal string the service expects back.
export function usdcToApi(micro: bigint): string {
  return fromBaseUnits(micro, USDC_DECIMALS);
}

// Display form, grouped and without a pointless decimal tail.
export function formatUsdc(micro: bigint | null): string {
  if (micro === null) return "—";
  const units = fromBaseUnits(micro, USDC_DECIMALS);
  const [whole, fraction] = units.split(".");
  const grouped = Number(whole).toLocaleString("en-US");
  // Money reads better at two places, but never invent precision that would
  // round a figure up to more than the user actually has.
  const trimmed = (fraction ?? "").slice(0, 2).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export function formatUsdcWithSymbol(micro: bigint | null): string {
  return micro === null ? "—" : `${formatUsdc(micro)} USDC`;
}

export interface PotBreakdown {
  // Both stakes together.
  potMicro: bigint;
  // The platform's cut, taken from the pot on settlement.
  feeMicro: bigint;
  // What the winner actually receives.
  payoutMicro: bigint;
}

// What a head-to-head stake pays out. `feeBps` comes from the service's cashier
// config and is never hardcoded here: the fee is the service's to set, and a
// stale copy in the UI would quote a payout the player does not get.
//
// The fee is floored, so any rounding remainder stays with the winner rather
// than with the house, and fee + payout always equals the pot exactly.
export function potBreakdown(stakeMicro: bigint, feeBps: number): PotBreakdown {
  const potMicro = stakeMicro * 2n;
  const bps = Number.isFinite(feeBps) && feeBps > 0 ? BigInt(Math.floor(feeBps)) : 0n;
  const feeMicro = (potMicro * bps) / 10_000n;
  return { potMicro, feeMicro, payoutMicro: potMicro - feeMicro };
}

// What the winner of a paid swiss takes home: the whole pot of entry fees minus
// the same platform cut.
export function swissPotBreakdown(
  entryFeeMicro: bigint,
  entrants: number,
  feeBps: number
): PotBreakdown {
  const count = Number.isInteger(entrants) && entrants > 0 ? BigInt(entrants) : 0n;
  const potMicro = entryFeeMicro * count;
  const bps = Number.isFinite(feeBps) && feeBps > 0 ? BigInt(Math.floor(feeBps)) : 0n;
  const feeMicro = (potMicro * bps) / 10_000n;
  return { potMicro, feeMicro, payoutMicro: potMicro - feeMicro };
}

// A transaction hash, checked before it is offered to the service as proof of a
// deposit. Nothing else in the app parses one, so the shape lives here.
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export function isTxHash(value: string): boolean {
  return TX_HASH.test(value.trim());
}
