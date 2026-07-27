// Pure presentation logic for a prediction "bet slip": the detail view of an
// open position. Polymarket position fields are read defensively (they arrive as
// strings or numbers, and the SDK schema can change), so every field is optional
// and coerced. No framework imports, so this is unit tested.

// The subset of a Polymarket position the slip reads. Every field is optional
// and nullable: the SDK types many of them as `string | null` and the values
// arrive as strings or numbers, so the coercers below tolerate all of it.
type Str = string | null | undefined;
type Num = string | number | null | undefined;

export interface RawPosition {
  title?: Str;
  outcome?: Str;
  size?: Num;
  avgPrice?: Num;
  curPrice?: Num;
  initialValue?: Num;
  currentValue?: Num;
  cashPnl?: Num;
  percentPnl?: Num;
  redeemable?: boolean | null;
  conditionId?: Str;
  endDate?: Str;
  icon?: Str;
}

export interface BetSlip {
  market: string;
  outcome: string;
  // Shares held. Each winning share settles at $1, so this is also the payout if
  // the position wins.
  shares: number;
  // Average price paid per share, 0..1 (a probability, shown as cents).
  avgPrice: number;
  // Dollars staked to open the position.
  staked: number;
  // What the position is worth now.
  currentValue: number;
  // Payout if this outcome wins (shares x $1).
  payoutIfWins: number;
  // Profit or loss so far, in dollars, and as a percent of the stake.
  pnl: number;
  pnlPct: number;
  redeemable: boolean;
  conditionId: string | null;
  // Market resolution date as an ISO string, when known.
  resolvesAt: string | null;
  icon: string | null;
}

function num(v: string | number | undefined | null): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

// Derive the slip figures from a raw position. Prefers the provider's own
// initial/current/pnl values and falls back to deriving them from shares and
// prices, so a slip renders even when only part of the data is present.
export function betSlip(raw: RawPosition): BetSlip {
  const shares = num(raw.size);
  const avgPrice = num(raw.avgPrice);
  const curPrice = num(raw.curPrice);

  const staked = num(raw.initialValue) || shares * avgPrice;
  const currentValue = num(raw.currentValue) || shares * curPrice;
  const payoutIfWins = shares;

  const pnl = raw.cashPnl != null ? num(raw.cashPnl) : currentValue - staked;
  const pnlPct =
    raw.percentPnl != null ? num(raw.percentPnl) : staked > 0 ? (pnl / staked) * 100 : 0;

  return {
    market: raw.title?.trim() || "Market",
    outcome: raw.outcome?.trim() || "—",
    shares,
    avgPrice,
    staked,
    currentValue,
    payoutIfWins,
    pnl,
    pnlPct,
    redeemable: raw.redeemable === true,
    conditionId: raw.conditionId ?? null,
    resolvesAt: raw.endDate ?? null,
    icon: raw.icon ?? null,
  };
}

// A share price of 0..1 shown as whole cents, e.g. 0.68 -> "68¢".
export function priceCents(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "—";
  return `${Math.round(price * 100)}¢`;
}

// A dollar figure, always two decimals: 12.5 -> "$12.50". Negative values keep
// the sign inside: -3 -> "-$3.00".
export function formatMoney(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// A signed P&L amount for display, e.g. "+$4.20" or "-$1.10".
export function formatSignedMoney(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`;
}

// The market resolution date as a short, human date. Empty string when unknown
// or unparseable, so the caller can hide the row.
export function formatResolveDate(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Whether a market's end date has passed, so the slip reads "Ended" instead of
// "Resolves". `now` is injectable for deterministic tests.
export function hasEnded(iso: string | null, now: number = Date.now()): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t < now;
}
