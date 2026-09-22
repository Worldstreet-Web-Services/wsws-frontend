// The product analytics catalog. Every event the app sends is named here, with
// the properties it carries, so a screen cannot invent a name, misspell one, or
// drift from the agreed shape without failing the build.
//
// Conventions, enforced by the types below and by `track`:
//   - event names are snake_case and past tense: `trade_completed`
//   - property names are snake_case
//   - numbers go unquoted; a property with no value is omitted, never sent as
//     null, "" or "N/A" (see `track` in ./mixpanel)
//   - one action is one event; variants are a property (`vertical`, `scope`),
//     not a second event name
//
// Never add a property here that could carry a NIN, BVN, bank account or
// virtual account number, transfer reference, OTP, passkey or key material.
// Those are identity-theft and account-drainage grade, and NIN/BVN are NDPR
// crown jewels. Contact details (email, name) are governed profile fields set
// once on identify, never event properties.

import type { AmountSource } from "@/lib/analytics/trade-amounts";
import type { FailureReason } from "@/lib/analytics/failure-reason";

export type Vertical = "spot" | "memecoin" | "real_asset";
export type SignupMethod = "google" | "x" | "email" | "passkey" | "kingschat";
export type Side = "buy" | "sell";
export type Game = "chess" | "last_man" | "checkers";
export type KycStatus = "none" | "pending" | "verified";
export type UserTier = "new" | "activated" | "power";

// The nav sections `page_view` reports. Kept as a union so a new route has to
// be mapped deliberately rather than leaking a raw pathname into the data.
export type LandingPage = "landing" | "welcome";

export type PageName =
  | "portfolio"
  | "spot"
  | "perpetuals"
  | "memecoins"
  | "real_assets"
  | "prediction"
  | "earn"
  | "arkade"
  | "arktivity"
  | "market_square";

/**
 * Event name -> its properties. `void` means the event takes none.
 *
 * Two names here predate this catalog and are already live on the site,
 * `login_completed` and `page_view`. They keep their exact spelling rather
 * than being renamed to match the `_completed` pattern, so existing reports
 * do not break.
 */
export interface AnalyticsEvents {
  // Auth and onboarding
  auth_started: void;
  signup_completed: { method: SignupMethod };
  login_completed: { method: string };
  passkey_added: void;
  // `supported` is false where the device cannot make a passkey at all, and
  // the only way on was "Continue": not a choice to skip.
  passkey_skipped: { supported: boolean };

  // KYC. The identity check itself is the only thing recorded: which document
  // type was used, and whether it passed. Never the number behind it.
  kyc_started: { kyc_type: "nin" | "bvn" };
  kyc_completed: void;
  kyc_failed: { reason: string };

  // Funding
  add_funds_opened: void;
  fund_method_selected: { method: "crypto" | "bank" };
  deposit_network_selected: { network: string };
  // One event for both funding rails, told apart by `method`. There used to be
  // a second name for the bank rail, `bank_transfer_completed`, and every Naira
  // deposit fired both: the same money counted twice in the dollar totals. See
  // DepositCompleted for why no other property can tell the rails apart.
  deposit_completed: DepositCompleted;
  // The amounts and the rate the user was quoted, never the account number they
  // were given. This rate is the one offered at request time; the rate actually
  // applied at settlement rides on `deposit_completed`, and the gap between the
  // two is the spread the Naira rail charges.
  bank_account_requested: { amount_ngn: number; fx_rate: number; reused: boolean };
  // `network` and `asset` are what a crypto deposit was attempting, so an
  // address that could not be made can be traced to the pair that failed.
  deposit_failed: {
    method: "crypto" | "bank";
    reason: FailureReason;
    reason_detail?: string;
    network?: string;
    asset?: string;
  };

  // Trading. One event across the verticals, told apart by `vertical`.
  market_viewed: { vertical: Vertical; asset: string };
  // A sell carries `token_quantity`: the validator refuses one without it, so
  // `amount_usd` can never again be a token count. See ./trade-amounts.
  trade_previewed: {
    vertical: Vertical;
    asset: string;
    side: Side;
    amount_usd: number;
    token_quantity?: number;
  };
  // The order was sent and the venue accepted it. `order_id` is the one its
  // trade_completed or trade_failed will carry, so a retry reads as the same
  // order rather than a second trade.
  trade_submitted: {
    vertical: Vertical;
    asset: string;
    side: Side;
    amount_usd: number;
    token_quantity?: number;
    order_id: string;
  };
  trade_completed: TradeCompleted;
  // One vocabulary for why (see ./failure-reason); `amount_usd` sizes what the
  // failure cost when it is known.
  trade_failed: {
    vertical: Vertical;
    asset: string;
    reason: FailureReason;
    reason_detail?: string;
    side?: Side;
    amount_usd?: number;
    order_id?: string;
  };
  // The wallet's balance proved the trade, but the trade service recorded it
  // as something else. An ops signal, never shown to the user as a failure.
  trade_recording_mismatch: {
    vertical: Vertical;
    asset: string;
    swap_id: string;
    recorded: string;
    // The trade service's request id and the on-chain hash, when known: what
    // the trade team needs to find the swap it recorded wrongly.
    request_id?: string;
    hash?: string;
  };

  // Perpetuals
  perp_market_viewed: { market: string; market_type?: MarketType; venue?: PerpVenue };
  perp_trade_opened: PerpTradeOpened;
  perp_trade_closed: {
    market: string;
    close_type: "full" | "partial";
    /**
     * What ended the position. Only a close the user asked for reaches this
     * app: a stop, a take profit and a liquidation are all executed on chain by
     * the keeper, with nothing to report from the browser. Those three are in
     * the union so the field does not have to change shape when the backend can
     * report them, but today every event carries "manual".
     */
    close_reason: "manual" | "stop_loss" | "take_profit" | "liquidation";
    pnl_usd: number;
    amount_usd: number;
    notional_usd: number;
    order_id?: string;
    venue?: PerpVenue;
    amount_source?: AmountSource;
  };
  // An order the desk could not place. The exchange's own rejection of a
  // TP/SL leg is not this: the entry stands, and perp_trade_opened says so.
  perp_order_failed: {
    market: string;
    side: "long" | "short";
    reason: FailureReason;
    reason_detail?: string;
    notional_usd?: number;
  };
  perp_tpsl_set: { market: string; has_tp: boolean; has_sl: boolean };
  perp_margin_adjusted: { market: string; action: "add" | "remove"; amount_usd: number };

  // Prediction
  prediction_market_viewed: { market_id: string; category?: string; scope: PredictionScope };
  prediction_bet_placed: {
    market_id: string;
    category?: string;
    scope: PredictionScope;
    side: "yes" | "no";
    amount_usd: number;
    price_cents: number;
    outcome_label?: string;
  };
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
  prediction_payout_claimed: { market_id?: string; scope: PredictionScope; amount_usd?: number };

  // Kash
  kash_bought: { amount_usd: number; kash_amount: number };
  kash_sold: { kash_amount: number; amount_usd: number };
  // `source` is omitted when points are settled in bulk: a weekly claim mixes
  // trading, games and referral activity, and the engine does not break the
  // total down, so naming one would be a guess.
  kash_earned: { source?: "trading" | "games" | "referral"; kash_amount: number };

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

  // Arkade games
  //
  // `amount_usd` and `game_id` ride alongside the older names (`stake_usd`,
  // `entry_usd`, `cost_usd`, `winnings_usd`, `payout_usd`, `match_id`) rather
  // than replacing them, so reports built on those keep working. `amount_usd`
  // is the money the event is about: the stake, the entry fee, the payout.
  // `game_id` joins a stake to its result.
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
  // `fee_usd` is the platform's 5% cut of the winnings. `amount_usd` is the
  // payout.
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
  // pot; started_it says the starter's share is in it too. `amount_usd` is the
  // winnings.
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
     * and only quotes one at all some of the time. `fee_local` carries that
     * figure with `fee_currency` to say what it is denominated in; `fee_usd`
     * stays for a rail that does quote in dollars. All three are omitted when
     * no fee was quoted, rather than reported as a zero the user did not pay.
     */
    fee_usd?: number;
    fee_local?: number;
    fee_currency?: string;
  };

  // Withdraw
  withdraw_opened: void;
  withdraw_completed: WithdrawCompleted;
  // A withdrawal attempt that did not pay out. There was no event for this, so
  // failed withdrawals could not be seen at all.
  withdraw_failed: {
    method: "wallet" | "bank";
    reason: FailureReason;
    reason_detail?: string;
    amount_usd?: number;
    order_id?: string;
  };

  // Engagement
  // A campaign link's landing page. The SDK attaches the URL's utm_* tags to
  // the first event it sends, so this is the event that carries them; without
  // it the landing page sent nothing and the campaign was lost.
  landing_viewed: { page: LandingPage };
  page_view: { page: PageName };
  currency_switched: { currency: string };
  referral_completed: void;
  arktivity_tx_opened: { chain: string; direction: "in" | "out" };
}

/**
 * A deposit that has been confirmed credited to the user's balance, on either
 * rail. Reported once, from the settlement itself, never on intent.
 *
 * `method` is the only property that separates the two rails. It has to be
 * derived from the rail the money actually came in on, never defaulted: user
 * funds are held in Base USDC, so a Naira credit lands on chain as a
 * base-mainnet USDC transfer that is indistinguishable from a real Base
 * deposit. `source_network` cannot do this job and neither can the amount.
 */
export type DepositCompleted = SettledRecord &
  (
    | {
        method: "crypto";
        // The network the deposit settled on. The chain the user sent from is not
        // recoverable from the arrival; `deposit_network_selected` carries that.
        source_network: string;
        amount_usd: number;
      }
    | {
        method: "bank";
        // What the user sent, in Naira, and what was credited, in dollars.
        amount_ngn: number;
        amount_usd: number;
        /**
         * Naira per dollar ACTUALLY APPLIED at settlement, which is not always
         * the rate quoted on `bank_account_requested`: an onramp whose rate lock
         * has lapsed converts at the live rate instead. `amount_ngn / fx_rate`
         * equals `amount_usd` to rounding.
         */
        fx_rate: number;
        /**
         * The institution the money settled through: the bank holding the
         * virtual account the user paid into.
         *
         * Deliberately not called `bank`. On a withdrawal `bank` is the user's
         * own bank, and one property name meaning the rail on one event and the
         * customer on the other misleads whoever queries it next.
         */
        provider: string;
        /**
         * There is no `bank` here on purpose. A deposit is pushed from whatever
         * bank app the user chooses and the rail reports only where the money
         * landed, so their own bank is not observable. Absent beats guessed.
         */
        // Only when the provider actually charged one. Omitted when there is
        // genuinely no fee, rather than reported as a zero.
        fee_ngn?: number;
      }
  );

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
 * A withdrawal the rail has paid out. Same shape rule as the deposit: one
 * event, and the rail is a property.
 *
 * The bank leg carries what actually landed in the user's account and the rate
 * that produced it. Without both, the round-trip cost of the Naira rail (in at
 * one rate, out at another) cannot be worked out from the data at all.
 */
export type WithdrawCompleted = SettledRecord & { order_id?: string } & (
    | {
        method: "wallet";
        asset: string;
        amount_usd: number;
        network?: string;
        /**
         * Where a crypto withdrawal was sent. An on-chain address is public by
         * construction, the same class of value as the wallet address we already
         * use as the distinct_id, and it is what makes a withdrawal traceable to
         * the chain.
         *
         * A bank withdrawal's recipient is an account number, which is on the
         * never-send list, so that rail has no equivalent and sends none.
         */
        recipient_address?: string;
      }
    | {
        method: "bank";
        asset: string;
        // What left the balance, and the net Naira the user received for it.
        amount_usd: number;
        amount_ngn: number;
        // Naira per dollar actually applied at payout.
        fx_rate: number;
        /**
         * The user's own bank, receiving the money. Always the customer's
         * institution, never the rail: the rail is `provider` on a deposit.
         *
         * Sent as the bank registry's own name rather than the short label the
         * picker shows, so the same bank cannot arrive as both "OPay" and
         * "Opay" and split a breakdown into two rows.
         */
        bank: string;
        /**
         * No `provider` here: a payout reports the account it reached, not the
         * institution it passed through, so there is nothing honest to send.
         */
        // The difference between gross and net, when the rail charges one.
        fee_ngn?: number;
      }
  );

export type MarketType = "crypto" | "forex" | "commodity" | "equity";
export type PredictionScope = "global" | "local";
export type EarnListingType = "bounty" | "project" | "grant";

// Trading carries the fields its vertical actually has: a spot fill knows its
// network and whether it came from the simple or pro screen, a memecoin fill
// knows slippage and the risk label, a real-world asset knows its issuer.
export type TradeCompleted = TradeFacts &
  (
    | {
        vertical: "spot";
        asset: string;
        fee_usd?: number;
        network?: string;
        mode?: "simple" | "pro";
      }
    | {
        vertical: "memecoin";
        token: string;
        slippage_pct?: number;
        price_impact_pct?: number;
        risk_label?: "low" | "medium" | "critical";
        network: "base" | "solana";
      }
    | {
        vertical: "real_asset";
        asset: string;
        apy?: number;
        category?: "credit" | "carbon" | "real_estate";
        issuer?: string;
      }
  );

/**
 * What every completed trade reports, whatever its vertical.
 *
 * `amount_usd` is the trade's value in dollars on both sides, never the token
 * count; `token_quantity` carries that, and is required on a sell (enforced by
 * the validator). `amount_source` says whether the dollar figure is what moved
 * or what the quote expected. See ./trade-amounts.
 */
export interface TradeFacts {
  side: Side;
  amount_usd: number;
  amount_source: AmountSource;
  token_quantity?: number;
  /**
   * What the trade service recorded for a swap-engine trade. `delivered` is a
   * swap the receipt proves paid out while the service recorded something
   * else: the money moved, so it is a trade.
   */
  recorded?: "confirmed" | "delivered";
  /** The venue's own reference: the swap id or the Dextopus request id. */
  order_id?: string;
  tx_hash?: string;
  token_address?: string;
  /**
   * The EVM chain id. Omitted on Solana, which has no id our services agree on
   * (the swap engine says 101, the bridge 792703809); `network` names it.
   */
  chain_id?: number;
}

export interface PerpTradeOpened {
  market: string;
  market_type?: MarketType;
  side: "long" | "short";
  leverage: number;
  collateral_usd: number;
  position_size_usd: number;
  order_type: "market" | "limit" | "stop";
  /**
   * The price the position actually opened at. A limit or stop order has none
   * yet: it is resting until the keeper triggers it, and `limit_price` carries
   * the level it is waiting for instead.
   */
  entry_price?: number;
  /** The trigger level, set only when `order_type` is not "market". */
  limit_price?: number;
  // Whether the position was opened with an exit already attached, and at what
  // level. The flags are always sent so "no take profit" is a fact in the data
  // rather than a missing property; the prices are sent only when they exist.
  has_take_profit: boolean;
  take_profit_price?: number;
  has_stop_loss: boolean;
  stop_loss_price?: number;
  opening_fee_usd?: number;
  execution_fee_eth?: number;
  /** Collateral times leverage: the position's size in dollars. */
  notional_usd?: number;
  margin_mode?: "cross" | "isolated";
  /** The venue's order id. */
  order_id?: string;
  venue?: PerpVenue;
  amount_source?: AmountSource;
}

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
   * The EVM address lowercased, for joining to on-chain data. The distinct_id
   * stays the checksummed address Privy gives, which every existing profile is
   * keyed by.
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
