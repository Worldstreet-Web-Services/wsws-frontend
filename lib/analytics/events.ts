// The product analytics catalog. Every event the app sends is named here, with
// the properties it carries, so a screen cannot invent a name, misspell one, or
// drift from the agreed shape without failing the build.
//
// Sections 1 to 8 of management's catalog (landing, auth, add funds, withdraw,
// Kash, trading, prediction, perps) are implemented here. Sections 9 to 11
// (Arkade, Square, Arkivity) are a second pass: the Arkade events below are the
// ones already in the app, not yet the catalog's. See
// docs/adr/ADR-2026-09-22-mixpanel-management-catalog.md.
//
// Conventions, enforced by the types below and by `track`:
//   - event names are snake_case and past tense: `trade_completed`
//   - property names are snake_case
//   - money is always a number, never a string. `amount_usd` is dollars on
//     every event that has it; `amount_ngn` is naira
//   - a property with no value is omitted, never sent as null, "" or "N/A"
//     (see `track` in ./mixpanel)
//   - one action is one event; variants are a property (`vertical`, `method`),
//     not a second event name
//
// Never add a property here that could carry a NIN, BVN, bank account or
// virtual account number, transfer reference, OTP, passkey or key material.
// Those are identity-theft and account-drainage grade, and NIN/BVN are NDPR
// crown jewels. Contact details (email, name) are governed profile fields set
// once on identify, never event properties.

import type { AmountSource } from "@/lib/analytics/trade-amounts";
import type {
  AUTH_FAILURE,
  DEPOSIT_FAILURE,
  KASH_FAILURE,
  PERP_FAILURE,
  PREDICTION_FAILURE,
  TRADE_FAILURE,
  WITHDRAW_FAILURE,
  Vocabulary,
} from "@/lib/analytics/failure-reason";

/** The reason type a domain's vocabulary permits. */
type ReasonOf<V> = V extends Vocabulary<infer R> ? R : never;

export type AuthReason = ReasonOf<typeof AUTH_FAILURE>;
export type DepositReason = ReasonOf<typeof DEPOSIT_FAILURE>;
export type WithdrawReason = ReasonOf<typeof WITHDRAW_FAILURE>;
export type KashReason = ReasonOf<typeof KASH_FAILURE>;
export type TradeReason = ReasonOf<typeof TRADE_FAILURE>;
export type PredictionReason = ReasonOf<typeof PREDICTION_FAILURE>;
export type PerpReason = ReasonOf<typeof PERP_FAILURE>;

/**
 * The trading verticals. `rwa` is the catalog's word for real-world assets; the
 * app's own slice is still called `rwa` too, so the two agree.
 */
export type Vertical = "spot" | "memecoin" | "rwa";
export type Side = "buy" | "sell";
export type Direction = "long" | "short";
export type MarginMode = "cross" | "isolated";
export type FundMethod = "crypto" | "bank";
export type WithdrawMethod = "bank" | "wallet";
export type Game = "chess" | "last_man" | "checkers";
export type KycStatus = "none" | "pending" | "verified";
export type UserTier = "new" | "activated" | "power";

/**
 * How someone signed in. The catalog lists email, google, x, apple and wallet;
 * `passkey` and `kingschat` are ours, because Privy offers both here and
 * reporting them as something else would be a lie about how people get in.
 */
export type AuthMethod = "email" | "google" | "x" | "apple" | "wallet" | "passkey" | "kingschat";

/**
 * The page a `page_view` is about, as a name rather than a URL.
 *
 * Closed on purpose: a report groups on this, and a raw pathname would split
 * one page into a row per id. The path rides alongside on every event, so a
 * route that has not been named here is still visible in the data, just not
 * grouped. Add the name when you add the route.
 */
export type PageName =
  | "landing"
  | "welcome"
  | "auth"
  | "interests"
  | "vault"
  | "privacy"
  | "terms"
  | "portfolio"
  | "spot"
  | "spot_asset"
  | "perpetuals"
  | "memecoins"
  | "real_assets"
  | "prediction"
  | "prediction_market"
  | "earn"
  | "earn_listing"
  | "arkade"
  | "arkade_chess"
  | "arkade_checkers"
  | "arkade_last_man"
  | "arkade_arkball"
  | "arkade_arkjet"
  | "arkade_chicken"
  | "arktivity"
  | "market_square";

/** The campaign tags a landing URL carries. Absent ones are omitted. */
export interface CampaignTags {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

/**
 * Event name -> its properties. `void` means the event takes none.
 *
 * Two names predate this catalog and are already live on the site,
 * `login_completed` and `page_view`. They keep their exact spelling, and the
 * catalog agrees with both.
 */
export interface AnalyticsEvents {
  // 1. Landing
  /**
   * Every page, on first load and on every client-side navigation. `page` names
   * it, `path` is the raw pathname, and the campaign tags are read off the URL
   * so a link landed on mid-session is attributed too.
   */
  page_view: CampaignTags & {
    page?: PageName;
    path: string;
    referrer?: string;
  };
  get_started_clicked: { placement: string };

  // 2. Auth
  /** `intent` is which door the visitor came through, not what they end up doing. */
  auth_started: { intent: "signup" | "login" };
  auth_method_selected: { method: AuthMethod };
  /**
   * Sent from the browser once the account is identified. The catalog asks for
   * this to come from the server when the account row is written; that belongs
   * to the outbox work in docs/mixpanel-server-events-integration.md.
   */
  signup_completed: { method: AuthMethod; referral_code?: string };
  signup_failed: { method: AuthMethod; reason: AuthReason; reason_detail?: string };
  login_completed: { method: AuthMethod };
  login_failed: { method: AuthMethod; reason: AuthReason; reason_detail?: string };
  passkey_added: void;
  // `supported` is false where the device cannot make a passkey at all, and
  // the only way on was "Continue": not a choice to skip.
  passkey_skipped: { supported: boolean };

  // KYC. The identity check itself is the only thing recorded: which document
  // type was used, and whether it passed. Never the number behind it.
  kyc_started: { kyc_type?: "nin" | "bvn" };
  kyc_completed: void;
  kyc_failed: { reason: AuthReason; reason_detail?: string };

  // 3. Add funds
  add_funds_opened: void;
  fund_method_selected: { method: FundMethod };
  deposit_network_selected: { network: string };
  deposit_address_generated: { network: string; asset: string };
  deposit_address_failed: { network: string; reason: DepositReason; reason_detail?: string };
  /**
   * A virtual account was asked for. `provider` is the rail. The amounts and
   * the rate quoted at request time ride along where the screen knows them: the
   * gap between this rate and the one on `bank_transfer_completed` is the
   * spread the naira rail charges. Never the account number itself.
   */
  bank_account_requested: {
    provider: string;
    amount_ngn?: number;
    fx_rate?: number;
    reused?: boolean;
  };
  bank_account_generated: { provider: string; bank: string };
  bank_account_failed: { provider: string; reason: DepositReason; reason_detail?: string };
  /**
   * A crypto deposit credited to the balance. Reported from the arrival, never
   * on intent. Naira deposits are `bank_transfer_completed`, a separate event:
   * the two rails are disjoint, so nothing fires both and nothing is counted
   * twice.
   */
  deposit_completed: SettledRecord & {
    amount_usd: number;
    network: string;
    asset: string;
    token_address?: string;
    chain_id?: number;
    order_id?: string;
  };
  /** A naira deposit settled. `fx_rate` is what was actually applied at settlement. */
  bank_transfer_completed: SettledRecord & {
    amount_usd: number;
    amount_ngn: number;
    fx_rate: number;
    provider: string;
    order_id?: string;
    // Only when the provider actually charged one, rather than a zero nobody paid.
    fee_ngn?: number;
  };
  deposit_failed: {
    method: FundMethod;
    reason: DepositReason;
    reason_detail?: string;
    amount_usd?: number;
    network?: string;
    asset?: string;
  };

  // 4. Withdraw
  withdraw_opened: void;
  withdraw_method_selected: { method: WithdrawMethod };
  withdraw_completed: WithdrawCompleted;
  withdraw_failed: {
    method: WithdrawMethod;
    reason: WithdrawReason;
    reason_detail?: string;
    amount_usd?: number;
    order_id?: string;
  };

  // 5. Kash
  kash_bought: KashTrade;
  kash_sold: KashTrade;
  kash_failed: {
    side: Side;
    reason: KashReason;
    reason_detail?: string;
    amount_usd?: number;
    kash_amount?: number;
  };
  // `source` is omitted when points are settled in bulk: a weekly claim mixes
  // trading, games and referral activity, and the engine does not break the
  // total down, so naming one would be a guess.
  kash_earned: { source?: "trading" | "games" | "referral"; kash_amount: number };

  // 6. Trading: spot, memecoin, rwa. One set of events across the verticals.
  market_viewed: { vertical: Vertical; asset: string; token_address?: string; chain_id?: number };
  /**
   * `amount_usd` is the trade's value in dollars on both sides, never the token
   * count. A sell carries `token_quantity` as well, and the validator refuses
   * one without it. See ./trade-amounts.
   */
  trade_previewed: TradeIntent;
  /** The order was sent and the venue accepted it. `order_id` is required: it is
   * what joins this to its completion or its failure, so a retry reads as the
   * same order rather than a second trade. */
  trade_submitted: TradeIntent & { order_id: string };
  trade_completed: TradeCompleted;
  // `amount_usd` is optional here alone: a trade that failed before it was
  // sized has no dollar value, and a zero would read as a real trade of
  // nothing rather than as a figure we do not have.
  trade_failed: Omit<TradeIntent, "amount_usd"> & {
    amount_usd?: number;
    reason: TradeReason;
    reason_detail?: string;
    order_id?: string;
  };
  // The wallet's balance proved the trade, but the trade service recorded it
  // as something else. An ops signal, never shown to the user as a failure.
  trade_recording_mismatch: {
    vertical: Vertical;
    asset: string;
    swap_id: string;
    recorded: string;
    request_id?: string;
    tx_hash?: string;
  };

  // 7. Prediction. A slip is a set of legs; the house takes a minimum of three,
  // so `leg_count` rides on every slip event.
  prediction_market_viewed: {
    market_id: string;
    category?: string;
    odds?: number;
    scope?: PredictionScope;
  };
  prediction_selection_added: {
    market_id: string;
    outcome: string;
    odds?: number;
    slip_size: number;
  };
  prediction_selection_removed: { market_id: string; slip_size: number };
  // `market_ids` is the slip's markets joined by a comma. Mixpanel takes a
  // list property, but a list cannot be grouped or filtered the way a report
  // needs, and the leg detail is already on prediction_selection_added.
  prediction_slip_submitted: PredictionSlip & { market_ids: string };
  prediction_bet_placed: PredictionSlip;
  prediction_bet_failed: {
    slip_id?: string;
    leg_count: number;
    stake_usd: number;
    reason: PredictionReason;
    reason_detail?: string;
  };
  prediction_bet_settled: {
    slip_id?: string;
    outcome: "won" | "lost" | "void";
    stake_usd: number;
    payout_usd: number;
  };
  // Making a market and seeding it is a different act from betting on one, and
  // the catalog's slip events have nothing to say about it.
  prediction_market_created: {
    market_type: "single" | "multi";
    category?: string;
    seed_usd: number;
    closes_in?: string;
    num_outcomes: number;
  };
  prediction_liquidity_provided: { market_id: string; amount_usd: number };
  prediction_market_resolved: { market_id: string; outcome: "yes" | "no"; num_outcomes: number };
  // The contract pays every settled position in one call, so a claim cannot
  // always name a single market or amount. Both are omitted rather than
  // reported as an empty string and a zero, which would read as a real $0 claim.
  prediction_payout_claimed: { market_id?: string; scope?: PredictionScope; amount_usd?: number };

  // 8. Perps
  perp_market_viewed: { pair: string; market_type?: MarketType; venue?: PerpVenue };
  perp_order_submitted: PerpOrder & { order_id?: string };
  perp_trade_opened: PerpOrder & {
    order_id?: string;
    position_id?: string;
    /** The price the position actually opened at. A resting order has none yet. */
    entry_price?: number;
    fee_usd?: number;
    execution_fee_eth?: number;
    amount_source?: AmountSource;
  };
  perp_trade_closed: {
    pair: string;
    direction: Direction;
    position_id?: string;
    close_type: "full" | "partial";
    /**
     * What ended the position. Only a close the user asked for reaches this
     * app: a stop, a take profit and a liquidation are all executed on chain by
     * the keeper, with nothing to report from the browser. Those three are in
     * the union so the field does not have to change shape when the backend can
     * report them, but today every event from here carries "manual".
     */
    close_reason: "manual" | "take_profit" | "stop_loss" | "liquidation";
    exit_price?: number;
    pnl_usd: number;
    notional_usd: number;
    fee_usd?: number;
    order_id?: string;
    venue?: PerpVenue;
    amount_source?: AmountSource;
  };
  // An order the desk could not place. The exchange's own rejection of a
  // TP/SL leg is not this: the entry stands, and perp_trade_opened says so.
  perp_trade_failed: {
    pair: string;
    direction: Direction;
    reason: PerpReason;
    reason_detail?: string;
    leverage?: number;
    margin_mode?: MarginMode;
    collateral_usd?: number;
    order_id?: string;
  };
  perp_tpsl_set: { pair: string; take_profit?: number; stop_loss?: number };
  perp_margin_adjusted: { pair: string; action: "add" | "remove"; amount_usd: number };

  // Earn marketplace. `earn_company_created` deliberately carries nothing: the
  // form it fires from collects a legal entity name, which must not be sent.
  earn_listing_viewed: { listing_id: string; type?: EarnListingType };
  earn_application_started: { listing_id: string; type?: EarnListingType };
  earn_application_submitted: { listing_id: string; type?: EarnListingType };
  earn_company_created: void;
  earn_listing_published: {
    type: EarnListingType;
    reward_amount: number;
    token: string;
    region?: string;
    who_can_apply?: string;
  };

  // 9. Arkade. Still the app's current events: the catalog's five-game section
  // is the second pass. `amount_usd` and `game_id` ride alongside the older
  // names (`stake_usd`, `entry_usd`, `cost_usd`, `winnings_usd`, `payout_usd`,
  // `match_id`) rather than replacing them, so reports built on those keep
  // working.
  game_opened: { game: Game };
  game_wallet_funded: { game: Game; amount_usd: number };
  chess_game_created: {
    clock_min: number;
    stake_usd: number;
    mode: "invite" | "quick" | "tournament";
    amount_usd?: number;
    game_id?: string;
  };
  chess_challenge_accepted: {
    stake_usd: number;
    clock_min: number;
    amount_usd?: number;
    game_id?: string;
  };
  chess_challenge_declined: void;
  // Sent by each player when their game starts, whichever seat they took.
  chess_game_started: { stake_usd: number; amount_usd?: number; game_id?: string };
  // `fee_usd` is the platform's 5% cut of the winnings. `amount_usd` is the payout.
  game_result: {
    game: Game;
    result: "win" | "loss" | "draw";
    // "no_moves" covers a draughts side that is blocked or wiped out, which is
    // the game's equivalent of checkmate and has no chess name.
    reason: "checkmate" | "no_moves" | "resign" | "timeout" | "abandoned" | "draw";
    stake_usd: number;
    payout_usd: number;
    fee_usd: number;
    amount_usd?: number;
    game_id?: string;
  };
  game_watched: { game: Game; match_id: string };
  spectator_bet_placed: {
    game: Game;
    match_id: string;
    side: "white" | "draw" | "black";
    amount_usd: number;
    odds?: number;
    game_id?: string;
  };
  game_staked: { game: Game; amount_usd: number; game_id?: string };
  last_man_played: { cost_usd: number; amount_usd?: number; game_id?: string };
  // What the round paid the winner, which is their share of the pot, not the
  // pot; started_it says the starter's share is in it too.
  last_man_won: {
    pot_usd: number;
    winnings_usd: number;
    started_it: boolean;
    amount_usd?: number;
    game_id?: string;
  };
  tournament_joined: {
    game: Game;
    entry_usd: number;
    amount_usd?: number;
    tournament_id?: string;
  };

  // Cross-border
  send_money_opened: void;
  send_destination_selected: { country: string; currency: string };
  send_completed: {
    corridor: string;
    amount_usd: number;
    amount_local: number;
    /**
     * The rail quotes its fee in the currency being received, not in dollars,
     * and only quotes one at all some of the time. All three are omitted when
     * no fee was quoted, rather than reported as a zero the user did not pay.
     */
    fee_usd?: number;
    fee_local?: number;
    fee_currency?: string;
  };

  // 11. Arkivity. The rest of the section is the second pass.
  arktivity_tx_opened: {
    tx_type?: ArkivityTxType;
    asset?: string;
    network?: string;
    amount_usd?: number;
    tx_hash?: string;
    direction: "in" | "out";
  };

  // Engagement
  currency_switched: { currency: string };
  referral_completed: void;
}

/** What a trade event says about the order, whatever stage it is at. */
export interface TradeIntent {
  vertical: Vertical;
  asset: string;
  side: Side;
  amount_usd: number;
  token_quantity?: number;
  /**
   * What one token cost in dollars. Derived from the two amounts, so it agrees
   * with them by construction, and it follows `amount_source`: the filled price
   * on a completion, the quoted one on a preview.
   */
  fill_price_usd?: number;
  token_address?: string;
  /**
   * The EVM chain id. Omitted on Solana, which has no id our services agree on
   * (the swap engine says 101, the bridge 792703809); `network` names it.
   */
  chain_id?: number;
  network?: string;
}

/**
 * A filled trade. One flat shape across the verticals, with each vertical's own
 * extras optional, so a report does not have to know which desk a row came from
 * to read its money.
 */
export type TradeCompleted = TradeIntent & {
  order_id?: string;
  tx_hash?: string;
  fee_usd?: number;
  price_impact_pct?: number;
  /** Whether the dollar figure is what actually moved or what the quote expected. */
  amount_source: AmountSource;
  /**
   * What the trade service recorded for a swap-engine trade. `delivered` is a
   * swap the receipt proves paid out while the service recorded something
   * else: the money moved, so it is a trade.
   */
  recorded?: "confirmed" | "delivered";
  // Per-vertical extras.
  slippage_pct?: number;
  risk_label?: "low" | "medium" | "critical";
  mode?: "simple" | "pro";
  apy?: number;
  category?: "credit" | "carbon" | "real_estate";
  issuer?: string;
};

/** A Kash purchase or conversion the engine confirmed. */
export interface KashTrade {
  amount_usd: number;
  kash_amount: number;
  /** Kash per dollar, as applied. */
  rate?: number;
  order_id?: string;
  tx_hash?: string;
}

/** What every slip event reports. `leg_count` is on all of them by rule. */
export interface PredictionSlip {
  slip_id?: string;
  leg_count: number;
  stake_usd: number;
  combined_odds?: number;
  potential_payout_usd?: number;
}

/** What an order says about itself, at submission and once it has opened. */
export interface PerpOrder {
  pair: string;
  market_type?: MarketType;
  direction: Direction;
  leverage: number;
  margin_mode: MarginMode;
  collateral_usd: number;
  /** Collateral times leverage: the position's size in dollars. */
  notional_usd: number;
  order_type: "market" | "limit" | "stop";
  /** The trigger level, set only when `order_type` is not "market". */
  limit_price?: number;
  // The exit levels attached at open, in dollars. Omitted when there is none,
  // rather than sent as a zero that reads as an exit at no price.
  take_profit?: number;
  stop_loss?: number;
  venue?: PerpVenue;
}

/**
 * What an event about a settled record carries so it can be counted once.
 *
 * The browser notices a deposit on whichever device is open when it lands,
 * and may notice it again on another. `time` is when it happened, in seconds,
 * and `$insert_id` is derived from the record (see ./insert-id), so Mixpanel
 * treats the two reports as one event. Both are Mixpanel's own reserved names.
 */
export interface SettledRecord {
  tx_hash?: string;
  time?: number;
  $insert_id?: string;
}

/**
 * A withdrawal the rail has paid out.
 *
 * The bank leg carries what actually landed in the user's account and the rate
 * that produced it. Without both, the round-trip cost of the naira rail (in at
 * one rate, out at another) cannot be worked out from the data at all.
 */
export type WithdrawCompleted = SettledRecord & { amount_usd: number; order_id?: string } & (
    | {
        method: "wallet";
        asset: string;
        network?: string;
        /**
         * Where a crypto withdrawal was sent. An on-chain address is public by
         * construction, the same class of value as the wallet address we
         * already use as the distinct_id, and it is what makes a withdrawal
         * traceable to the chain.
         *
         * A bank withdrawal's recipient is an account number, which is on the
         * never-send list, so that rail has no equivalent and sends none.
         */
        recipient_address?: string;
      }
    | {
        method: "bank";
        asset: string;
        // The net naira the user received, and the rate applied at payout.
        amount_ngn: number;
        fx_rate: number;
        /**
         * The user's own bank, receiving the money. Always the customer's
         * institution; the rail is `provider`.
         *
         * Sent as the bank registry's own name rather than the short label the
         * picker shows, so the same bank cannot arrive as both "OPay" and
         * "Opay" and split a breakdown into two rows.
         */
        bank: string;
        /** The payout rail. */
        provider?: string;
        // The difference between gross and net, when the rail charges one.
        fee_ngn?: number;
      }
  );

export type MarketType = "crypto" | "forex" | "commodity" | "equity";
export type PredictionScope = "global" | "local";
export type EarnListingType = "bounty" | "project" | "grant";
export type ArkivityTxType =
  "deposit" | "withdraw" | "trade" | "send" | "receive" | "game" | "kash";

/** Which perps venue an event came from. Hyperliquid replaced the old desk. */
export type PerpVenue = "hyperliquid";

export type AnalyticsEventName = keyof AnalyticsEvents;

// Profile fields Mixpanel keeps a running total of. The client sends the
// delta and the server holds the sum, so two devices cannot race each other
// into a wrong figure.
export type ProfileCounter =
  | "total_deposit_usd"
  | "total_volume_usd"
  | "trade_count"
  | "lifetime_kash_earned"
  | "referral_count";

// Attached to every event, so any of them can be sliced by who sent it without
// each call site having to pass these through.
export interface SuperProperties {
  /** production, preview or development. See ./environment. */
  environment: string;
  kyc_status: KycStatus;
  country?: string;
  has_deposited: boolean;
  user_tier: UserTier;
  platform: "web";
  app_version?: string;
  /**
   * The EVM address lowercased. Now the same string as the distinct_id, which
   * the catalog also specifies lowercase; kept because it is what existing
   * joins to on-chain data are written against.
   */
  wallet_evm?: string;
}

// Set once on identify. The EVM address is already the distinct_id, so it is
// not repeated here. `$email` and `$name` are Mixpanel's reserved contact
// fields: governed, set only here, and never copied onto an event.
export interface UserProfile {
  $email?: string;
  $name?: string;
  sol_address?: string;
  signup_method?: string;
  signup_date?: string;
  country?: string;
  kyc_status?: KycStatus;
  has_deposited?: boolean;
  first_deposit_method?: string;
  first_deposit_date?: string;
  total_deposit_usd?: number;
  total_volume_usd?: number;
  trade_count?: number;
  verticals_used?: string[];
  kash_balance?: number;
  kash_active?: boolean;
  lifetime_kash_earned?: number;
  referral_count?: number;
  portfolio_value_usd?: number;
}
