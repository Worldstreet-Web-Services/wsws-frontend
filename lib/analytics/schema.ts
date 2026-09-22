// The event catalog as data, so it can be checked at runtime.
//
// ./events is the catalog as types. TypeScript enforces it at every call site,
// which is most of the job, but it stops at the boundary where a value's type
// is asserted rather than known: a figure parsed out of an API response, a
// number that arrived as a decimal string, anything cast on the way in. Those
// reach Mixpanel looking exactly like a violation of the spec, and nothing
// fails until someone tries to sum a column of quoted numbers weeks later.
//
// So the shapes are restated here as data and checked against what actually
// goes on the wire. Two things keep this from drifting away from ./events:
//
//   - EVENT_SCHEMA is typed Record<AnalyticsEventName, ...>, so an event added
//     to the catalog without a shape here does not compile.
//   - The suite validates the catalog and rejects a deliberately malformed
//     event, so CI fails rather than the data quietly rotting.
//
// This is what makes the spec enforceable instead of merely written down.

import type { AnalyticsEventName } from "@/lib/analytics/events";
import {
  AUTH_FAILURE,
  DEPOSIT_FAILURE,
  KASH_FAILURE,
  PERP_FAILURE,
  PREDICTION_FAILURE,
  TRADE_FAILURE,
  WITHDRAW_FAILURE,
} from "@/lib/analytics/failure-reason";

export type PropType = "number" | "string" | "boolean";

export interface Shape {
  props: Record<string, PropType>;
  required: readonly string[];
}

// One shape, or one per variant for an event whose properties depend on a
// discriminant (the withdrawal rail). A payload is valid if it matches any of
// them, which is `oneOf` in JSON Schema terms.
export type EventSchema = readonly Shape[];

export interface Violation {
  property?: string;
  message: string;
}

/**
 * Declares a shape. A key ending in `?` is optional; every other key is
 * required. Written this way because a shape reads as one line per event
 * rather than as two parallel lists that can disagree with each other.
 */
function shape(spec: Record<string, PropType>): Shape {
  const props: Record<string, PropType> = {};
  const required: string[] = [];
  for (const [key, type] of Object.entries(spec)) {
    const optional = key.endsWith("?");
    const name = optional ? key.slice(0, -1) : key;
    props[name] = type;
    if (!optional) required.push(name);
  }
  return { props, required };
}

// An event that carries nothing. Anything sent with it is a violation.
const NOTHING: EventSchema = [shape({})];

// What an event about a settled record carries to be counted once. See
// SettledRecord in ./events.
const SETTLED_RECORD: Record<string, PropType> = {
  "tx_hash?": "string",
  "time?": "number",
  "$insert_id?": "string",
};

// What a game event carries alongside its older property names. See the
// Arkade section of ./events.
const GAME_MONEY: Record<string, PropType> = {
  "amount_usd?": "number",
  "game_id?": "string",
};

// What a trade event says about the order at any stage. See TradeIntent.
const TRADE_INTENT: Record<string, PropType> = {
  vertical: "string",
  asset: "string",
  side: "string",
  amount_usd: "number",
  "token_quantity?": "number",
  "fill_price_usd?": "number",
  "token_address?": "string",
  "chain_id?": "number",
  "network?": "string",
};

// The same, minus the dollar value, for the one event that may not know it.
const TRADE_INTENT_NO_AMOUNT: Record<string, PropType> = Object.fromEntries(
  Object.entries(TRADE_INTENT).filter(([key]) => key !== "amount_usd")
);

// What an order says about itself, at submission and once open. See PerpOrder.
const PERP_ORDER: Record<string, PropType> = {
  pair: "string",
  "market_type?": "string",
  direction: "string",
  leverage: "number",
  margin_mode: "string",
  collateral_usd: "number",
  notional_usd: "number",
  order_type: "string",
  "limit_price?": "number",
  "take_profit?": "number",
  "stop_loss?": "number",
  "venue?": "string",
};

// What every slip event reports. See PredictionSlip.
const PREDICTION_SLIP: Record<string, PropType> = {
  "slip_id?": "string",
  leg_count: "number",
  stake_usd: "number",
  "combined_odds?": "number",
  "potential_payout_usd?": "number",
};

/**
 * Properties whose value must come from a fixed list.
 *
 * `reason` is the data team's vocabulary, and each domain has its own: before
 * this, the same failure arrived as "order_failed", "trade_failed" or "failed"
 * depending on the desk. A withdrawal reason on a trade event now fails here.
 */
const ALLOWED_VALUES: Partial<Record<AnalyticsEventName, Record<string, readonly string[]>>> = {
  signup_failed: { reason: AUTH_FAILURE.reasons },
  login_failed: { reason: AUTH_FAILURE.reasons },
  kyc_failed: { reason: AUTH_FAILURE.reasons },
  deposit_address_failed: { reason: DEPOSIT_FAILURE.reasons },
  bank_account_failed: { reason: DEPOSIT_FAILURE.reasons },
  deposit_failed: { reason: DEPOSIT_FAILURE.reasons },
  withdraw_failed: { reason: WITHDRAW_FAILURE.reasons },
  kash_failed: { reason: KASH_FAILURE.reasons },
  trade_failed: { reason: TRADE_FAILURE.reasons },
  prediction_bet_failed: { reason: PREDICTION_FAILURE.reasons },
  perp_trade_failed: { reason: PERP_FAILURE.reasons },
};

/**
 * Properties an event must carry when another property has a given value,
 * which a flat shape cannot say.
 *
 * A sell must carry `token_quantity`. Sells once reported the token count as
 * `amount_usd`; requiring the quantity separately means a desk that has not
 * worked out the dollar value fails here, in development and CI, instead of
 * shipping tokens as dollars.
 */
const REQUIRED_WHEN: Partial<
  Record<AnalyticsEventName, { when: [string, string]; requires: string[] }[]>
> = {
  trade_completed: [{ when: ["side", "sell"], requires: ["token_quantity"] }],
  trade_previewed: [{ when: ["side", "sell"], requires: ["token_quantity"] }],
  trade_submitted: [{ when: ["side", "sell"], requires: ["token_quantity"] }],
};

export const EVENT_SCHEMA: Record<AnalyticsEventName, EventSchema> = {
  // 1. Landing
  page_view: [
    shape({
      "page?": "string",
      path: "string",
      "referrer?": "string",
      "utm_source?": "string",
      "utm_medium?": "string",
      "utm_campaign?": "string",
      "utm_content?": "string",
    }),
  ],
  get_started_clicked: [shape({ placement: "string" })],

  // 2. Auth
  auth_started: [shape({ intent: "string" })],
  auth_method_selected: [shape({ method: "string" })],
  signup_completed: [shape({ method: "string", "referral_code?": "string" })],
  signup_failed: [shape({ method: "string", reason: "string", "reason_detail?": "string" })],
  login_completed: [shape({ method: "string" })],
  login_failed: [shape({ method: "string", reason: "string", "reason_detail?": "string" })],
  passkey_added: NOTHING,
  passkey_skipped: [shape({ supported: "boolean" })],
  kyc_started: [shape({ "kyc_type?": "string" })],
  kyc_completed: NOTHING,
  kyc_failed: [shape({ reason: "string", "reason_detail?": "string" })],

  // 3. Add funds
  add_funds_opened: NOTHING,
  fund_method_selected: [shape({ method: "string" })],
  deposit_network_selected: [shape({ network: "string" })],
  deposit_address_generated: [shape({ network: "string", asset: "string" })],
  deposit_address_failed: [
    shape({ network: "string", reason: "string", "reason_detail?": "string" }),
  ],
  bank_account_requested: [
    shape({
      provider: "string",
      "amount_ngn?": "number",
      "fx_rate?": "number",
      "reused?": "boolean",
    }),
  ],
  bank_account_generated: [shape({ provider: "string", bank: "string" })],
  bank_account_failed: [
    shape({ provider: "string", reason: "string", "reason_detail?": "string" }),
  ],
  deposit_completed: [
    shape({
      amount_usd: "number",
      network: "string",
      asset: "string",
      "token_address?": "string",
      "chain_id?": "number",
      "order_id?": "string",
      ...SETTLED_RECORD,
    }),
  ],
  bank_transfer_completed: [
    shape({
      amount_usd: "number",
      amount_ngn: "number",
      fx_rate: "number",
      provider: "string",
      "order_id?": "string",
      "fee_ngn?": "number",
      ...SETTLED_RECORD,
    }),
  ],
  deposit_failed: [
    shape({
      method: "string",
      reason: "string",
      "reason_detail?": "string",
      "amount_usd?": "number",
      "network?": "string",
      "asset?": "string",
    }),
  ],

  // 4. Withdraw
  withdraw_opened: NOTHING,
  withdraw_method_selected: [shape({ method: "string" })],
  withdraw_completed: [
    shape({
      method: "string",
      asset: "string",
      amount_usd: "number",
      "network?": "string",
      "recipient_address?": "string",
      "order_id?": "string",
      ...SETTLED_RECORD,
    }),
    shape({
      method: "string",
      asset: "string",
      amount_usd: "number",
      amount_ngn: "number",
      fx_rate: "number",
      bank: "string",
      "provider?": "string",
      "fee_ngn?": "number",
      "order_id?": "string",
      ...SETTLED_RECORD,
    }),
  ],
  withdraw_failed: [
    shape({
      method: "string",
      reason: "string",
      "reason_detail?": "string",
      "amount_usd?": "number",
      "order_id?": "string",
    }),
  ],

  // 5. Kash
  kash_bought: [
    shape({
      amount_usd: "number",
      kash_amount: "number",
      "rate?": "number",
      "order_id?": "string",
      "tx_hash?": "string",
    }),
  ],
  kash_sold: [
    shape({
      amount_usd: "number",
      kash_amount: "number",
      "rate?": "number",
      "order_id?": "string",
      "tx_hash?": "string",
    }),
  ],
  kash_failed: [
    shape({
      side: "string",
      reason: "string",
      "reason_detail?": "string",
      "amount_usd?": "number",
      "kash_amount?": "number",
    }),
  ],
  kash_earned: [shape({ "source?": "string", kash_amount: "number" })],

  // 6. Trading
  market_viewed: [
    shape({
      vertical: "string",
      asset: "string",
      "token_address?": "string",
      "chain_id?": "number",
    }),
  ],
  trade_previewed: [shape({ ...TRADE_INTENT })],
  trade_submitted: [shape({ ...TRADE_INTENT, order_id: "string" })],
  trade_completed: [
    shape({
      ...TRADE_INTENT,
      amount_source: "string",
      "order_id?": "string",
      "tx_hash?": "string",
      "fee_usd?": "number",
      "price_impact_pct?": "number",
      "recorded?": "string",
      "slippage_pct?": "number",
      "risk_label?": "string",
      "mode?": "string",
      "apy?": "number",
      "category?": "string",
      "issuer?": "string",
    }),
  ],
  trade_failed: [
    shape({
      ...TRADE_INTENT_NO_AMOUNT,
      "amount_usd?": "number",
      reason: "string",
      "reason_detail?": "string",
      "order_id?": "string",
    }),
  ],
  trade_recording_mismatch: [
    shape({
      vertical: "string",
      asset: "string",
      swap_id: "string",
      recorded: "string",
      "request_id?": "string",
      "tx_hash?": "string",
    }),
  ],

  // 7. Prediction
  prediction_market_viewed: [
    shape({
      market_id: "string",
      "category?": "string",
      "odds?": "number",
      "scope?": "string",
    }),
  ],
  prediction_selection_added: [
    shape({ market_id: "string", outcome: "string", "odds?": "number", slip_size: "number" }),
  ],
  prediction_selection_removed: [shape({ market_id: "string", slip_size: "number" })],
  prediction_slip_submitted: [shape({ ...PREDICTION_SLIP, market_ids: "string" })],
  prediction_bet_placed: [shape({ ...PREDICTION_SLIP })],
  prediction_bet_failed: [
    shape({
      "slip_id?": "string",
      leg_count: "number",
      stake_usd: "number",
      reason: "string",
      "reason_detail?": "string",
    }),
  ],
  prediction_bet_settled: [
    shape({
      "slip_id?": "string",
      outcome: "string",
      stake_usd: "number",
      payout_usd: "number",
    }),
  ],
  prediction_market_created: [
    shape({
      market_type: "string",
      "category?": "string",
      seed_usd: "number",
      "closes_in?": "string",
      num_outcomes: "number",
    }),
  ],
  prediction_liquidity_provided: [shape({ market_id: "string", amount_usd: "number" })],
  prediction_market_resolved: [
    shape({ market_id: "string", outcome: "string", num_outcomes: "number" }),
  ],
  prediction_payout_claimed: [
    shape({ "market_id?": "string", "scope?": "string", "amount_usd?": "number" }),
  ],

  // 8. Perps
  perp_market_viewed: [shape({ pair: "string", "market_type?": "string", "venue?": "string" })],
  perp_order_submitted: [shape({ ...PERP_ORDER, "order_id?": "string" })],
  perp_trade_opened: [
    shape({
      ...PERP_ORDER,
      "order_id?": "string",
      "position_id?": "string",
      "entry_price?": "number",
      "fee_usd?": "number",
      "execution_fee_eth?": "number",
      "amount_source?": "string",
    }),
  ],
  perp_trade_closed: [
    shape({
      pair: "string",
      direction: "string",
      "position_id?": "string",
      close_type: "string",
      close_reason: "string",
      "exit_price?": "number",
      pnl_usd: "number",
      notional_usd: "number",
      "fee_usd?": "number",
      "order_id?": "string",
      "venue?": "string",
      "amount_source?": "string",
    }),
  ],
  perp_trade_failed: [
    shape({
      pair: "string",
      direction: "string",
      reason: "string",
      "reason_detail?": "string",
      "leverage?": "number",
      "margin_mode?": "string",
      "collateral_usd?": "number",
      "order_id?": "string",
    }),
  ],
  perp_tpsl_set: [shape({ pair: "string", "take_profit?": "number", "stop_loss?": "number" })],
  perp_margin_adjusted: [shape({ pair: "string", action: "string", amount_usd: "number" })],

  // Earn marketplace
  earn_listing_viewed: [shape({ listing_id: "string", "type?": "string" })],
  earn_application_started: [shape({ listing_id: "string", "type?": "string" })],
  earn_application_submitted: [shape({ listing_id: "string", "type?": "string" })],
  earn_company_created: NOTHING,
  earn_listing_published: [
    shape({
      type: "string",
      reward_amount: "number",
      token: "string",
      "region?": "string",
      "who_can_apply?": "string",
    }),
  ],

  // 9. Arkade
  game_opened: [shape({ game: "string" })],
  game_wallet_funded: [shape({ game: "string", amount_usd: "number" })],
  chess_game_created: [
    shape({ clock_min: "number", stake_usd: "number", mode: "string", ...GAME_MONEY }),
  ],
  chess_challenge_accepted: [shape({ stake_usd: "number", clock_min: "number", ...GAME_MONEY })],
  chess_challenge_declined: NOTHING,
  chess_game_started: [shape({ stake_usd: "number", ...GAME_MONEY })],
  game_result: [
    shape({
      game: "string",
      result: "string",
      reason: "string",
      stake_usd: "number",
      payout_usd: "number",
      fee_usd: "number",
      ...GAME_MONEY,
    }),
  ],
  game_watched: [shape({ game: "string", match_id: "string" })],
  spectator_bet_placed: [
    shape({
      game: "string",
      match_id: "string",
      side: "string",
      amount_usd: "number",
      "odds?": "number",
      "game_id?": "string",
    }),
  ],
  game_staked: [shape({ game: "string", amount_usd: "number", "game_id?": "string" })],
  last_man_played: [shape({ cost_usd: "number", ...GAME_MONEY })],
  last_man_won: [
    shape({ pot_usd: "number", winnings_usd: "number", started_it: "boolean", ...GAME_MONEY }),
  ],
  tournament_joined: [
    shape({
      game: "string",
      entry_usd: "number",
      "amount_usd?": "number",
      "tournament_id?": "string",
    }),
  ],

  // Cross-border
  send_money_opened: NOTHING,
  send_destination_selected: [shape({ country: "string", currency: "string" })],
  send_completed: [
    shape({
      corridor: "string",
      amount_usd: "number",
      amount_local: "number",
      "fee_usd?": "number",
      "fee_local?": "number",
      "fee_currency?": "string",
    }),
  ],

  // 11. Arkivity
  arktivity_tx_opened: [
    shape({
      "tx_type?": "string",
      "asset?": "string",
      "network?": "string",
      "amount_usd?": "number",
      "tx_hash?": "string",
      direction: "string",
    }),
  ],

  // Engagement
  currency_switched: [shape({ currency: "string" })],
  referral_completed: NOTHING,
};

function typeOf(value: unknown): PropType | "other" {
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  return "other";
}

function checkShape(shp: Shape, props: Record<string, unknown>): Violation[] {
  const found: Violation[] = [];

  for (const key of shp.required) {
    if (!(key in props)) {
      found.push({ property: key, message: `missing required property "${key}"` });
    }
  }

  for (const [key, value] of Object.entries(props)) {
    const expected = shp.props[key];
    if (!expected) {
      // The catalog is the taxonomy. A property nobody declared is either a
      // typo or a shape that was never agreed, and both are how a catalog
      // stops describing what is actually being sent.
      found.push({ property: key, message: `unknown property "${key}"` });
      continue;
    }
    const actual = typeOf(value);
    if (actual === expected) continue;
    if (expected === "number" && actual === "string") {
      // Called out separately because it is the failure that survives review:
      // Mixpanel coerces on read, so a quoted number looks correct in the UI
      // and only breaks sums and numeric filters later.
      found.push({
        property: key,
        message: `"${key}" must be an unquoted number, got the string ${JSON.stringify(value)}`,
      });
      continue;
    }
    found.push({
      property: key,
      message: `"${key}" must be a ${expected}, got ${actual === "other" ? JSON.stringify(value) : actual}`,
    });
  }

  return found;
}

/**
 * What is wrong with `props` as a payload for `name`, or an empty list if
 * nothing is.
 *
 * An event with several shapes is valid if it matches any one of them. When it
 * matches none, the complaints reported are those of the closest shape, so the
 * message names the properties the developer actually got wrong rather than
 * every difference from every variant.
 */
export function validateEvent(
  name: AnalyticsEventName,
  props: Record<string, unknown>
): Violation[] {
  const shapes = EVENT_SCHEMA[name];
  if (!shapes) return [{ message: `"${name}" is not in the event catalog` }];

  const conditional: Violation[] = [];
  for (const [property, allowed] of Object.entries(ALLOWED_VALUES[name] ?? {})) {
    const value = props[property];
    if (typeof value === "string" && !allowed.includes(value)) {
      conditional.push({
        property,
        message: `"${property}" must be one of ${allowed.join(", ")}, got "${value}"`,
      });
    }
  }
  for (const { when, requires } of REQUIRED_WHEN[name] ?? []) {
    const [property, value] = when;
    if (props[property] !== value) continue;
    for (const key of requires) {
      if (!(key in props)) {
        conditional.push({
          property: key,
          message: `"${key}" is required when ${property} is "${value}"`,
        });
      }
    }
  }

  let closest: Violation[] | null = null;
  for (const shp of shapes) {
    const found = checkShape(shp, props);
    if (found.length === 0) return conditional;
    if (closest === null || found.length < closest.length) closest = found;
  }
  return [...(closest ?? []), ...conditional];
}
