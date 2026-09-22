// Why something failed, in the data team's vocabulary.
//
// Failure events used to carry whatever the screen had to hand: "order_failed"
// for any memecoin error, "sell_failed", an internal stage name, a provider's
// raw code. The same failure arrived under several names and could not be
// grouped, and a user dismissing their wallet counted as a failed trade. Every
// `_failed` event now reports one of these reasons, with the service's own code
// alongside as `reason_detail` when there is one.
//
// Only codes are ever sent. A provider's message can quote back what the user
// typed, so it never leaves this module.

export const FAILURE_REASONS = [
  "insufficient_balance",
  "address_unavailable",
  "no_route",
  "simulation_failed",
  "slippage_exceeded",
  "rail_rejected",
  "provider_timeout",
  "user_cancelled",
  "unknown",
] as const;

export type FailureReason = (typeof FAILURE_REASONS)[number];

export interface Failure {
  reason: FailureReason;
  /** The service's own code, when it gave one. */
  reason_detail?: string;
}

// The trade service's codes (see TRADE_ERROR_KEYS in lib/errors) and the
// providers' own, where they map onto a reason.
const BY_CODE: Record<string, FailureReason> = {
  INSUFFICIENT_BALANCE: "insufficient_balance",
  NO_SWAP_ROUTE: "no_route",
  NO_ROUTE: "no_route",
  SIMULATION_FAILED: "simulation_failed",
  HIGH_PRICE_IMPACT: "slippage_exceeded",
  INVALID_SLIPPAGE: "slippage_exceeded",
  SLIPPAGE_EXCEEDED: "slippage_exceeded",
  PROVIDER_ERROR: "provider_timeout",
  QUOTE_PROVIDER_ERROR: "provider_timeout",
  SERVICE_UNAVAILABLE: "provider_timeout",
  BAD_RESPONSE: "provider_timeout",
};

// Checked in order when there is no code to go by. The patterns are the ones
// lib/errors uses to choose what to tell the user.
const BY_MESSAGE: [RegExp, FailureReason][] = [
  [
    /(user rejected|user denied|denied the request|rejected the request|user declined|request rejected|cancell?ed|user closed)/,
    "user_cancelled",
  ],
  [
    /insufficient[- ]?balance|amount exceeds balance|exceeds allowance|insufficient funds/,
    "insufficient_balance",
  ],
  [/no route|insufficient liquidity|no liquidity/, "no_route"],
  [/slippage|price impact|too little received/, "slippage_exceeded"],
  [/simulation failed/, "simulation_failed"],
  [
    /failed to fetch|fetch failed|network ?error|timed? ?out|timeout|econn|offline|load failed/,
    "provider_timeout",
  ],
];

// EIP-1193's "user rejected the request".
const USER_REJECTED = 4001;

function codeOf(error: unknown): string | number | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" || typeof code === "number" ? code : null;
}

/** The reason an error represents. Never includes the error's message. */
export function failureReason(error: unknown): Failure {
  const code = codeOf(error);
  if (code === USER_REJECTED) return { reason: "user_cancelled" };

  // A code is only kept when it looks like one, so a provider that puts a
  // sentence in `code` does not smuggle it through.
  const detail = typeof code === "string" && /^[A-Z][A-Z0-9_]*$/.test(code) ? code : undefined;
  if (detail && BY_CODE[detail]) return { reason: BY_CODE[detail], reason_detail: detail };

  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  for (const [pattern, reason] of BY_MESSAGE) {
    if (pattern.test(message)) return detail ? { reason, reason_detail: detail } : { reason };
  }
  return detail ? { reason: "unknown", reason_detail: detail } : { reason: "unknown" };
}

/**
 * The reason for an order a venue ended without filling, reported by its
 * settlement stage (Dextopus says `refunded` or `failed`) rather than by an
 * error. The venue does not say why, so the stage is kept as the detail.
 */
export function failureReasonForStage(stage: string): Failure {
  return { reason: "unknown", reason_detail: stage };
}
