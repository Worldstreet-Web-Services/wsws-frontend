// Domain types for the casino games. These are our types, not the wire
// format: every response from the casino gateway passes through a normalizer
// before a component sees it.
//
// Money follows the same shape the vault gateway already uses across the
// platform: an exact on-chain amount plus its USD valuation, so screens can
// render dollars while stakes stay exact in minor units.

export interface TokenAmount {
  // Exact on-chain amount in the token's smallest unit, as a decimal string.
  // Never parsed into a float for arithmetic that settles money.
  wei: string;
  tokenSymbol: string;
  // Display valuation only.
  usdValue: number;
}

export type GameId = "chess" | "draw" | "last-standing";

// ----- Chess -----

// A time control reads as "minutes+increment", e.g. "5+3". The service accepts
// any number of seconds per side, so this is a string rather than a union: a
// game created elsewhere with an unusual control still has to display.
export type ChessTimeControl = string;

// The controls offered on the create screen.
export const TIME_CONTROL_PRESETS: readonly ChessTimeControl[] = ["3+2", "5+3", "10+0", "15+10"];

export type ChessColor = "w" | "b";

export interface ChessPlayer {
  id: string;
  username: string;
  rating: number;
  walletAddress: string;
}

export type ChessMatchState = "awaiting_opponent" | "in_progress" | "settled" | "cancelled";

// How a decided game was won, and how a drawn one was drawn. These mirror the
// service's `resultReason` values one for one.
export type ChessWinReason = "checkmate" | "resignation" | "timeout" | "forfeit";
export type ChessDrawReason =
  "stalemate" | "agreement" | "repetition" | "insufficient" | "fifty_move";

export type ChessResult =
  { kind: ChessWinReason; winner: ChessColor } | { kind: "draw"; reason: ChessDrawReason };

// A game can carry a stake, but most do not. `wager` is null on a free game,
// and a deployment whose cashier is switched off has no staked games at all.
// Nothing here may render an absent wager as a zero one: that would imply money
// is at risk on a casual game.
export interface ChessMatch {
  id: string;
  state: ChessMatchState;
  white: ChessPlayer | null;
  black: ChessPlayer | null;
  timeControl: ChessTimeControl;
  // The service's own share code for this game, and the gateway topic carrying
  // its live frames. Both come from the server rather than being rebuilt here,
  // so a change to either format costs nothing on this side.
  inviteCode: string;
  liveTopic: string;
  // Half-moves played. A game can only be aborted while this is 0.
  ply: number;
  // Server-authoritative position. The client renders this; it never decides
  // legality itself.
  fen: string;
  // Full move history in SAN, oldest first.
  moves: string[];
  // The last move in coordinate notation ("e2e4"). SAN cannot be turned back
  // into squares without replaying the game, so the board's last-move highlight
  // reads this instead.
  lastMoveUci: string | null;
  // What is riding on the game, or null when nothing is.
  wager: ChessWager | null;
  // Seconds left on each clock at `clockUpdatedAt`, ticked locally between
  // server frames.
  clocks: Record<ChessColor, number>;
  clockUpdatedAt: string;
  turn: ChessColor;
  // Set once the game ends.
  result: ChessResult | null;
  // The colour with an outstanding draw offer, if any.
  drawOffered: ChessColor | null;
  createdAt: string;
}

// A match listed in the lobby as joinable.
export interface ChessChallenge {
  id: string;
  creator: ChessPlayer;
  timeControl: ChessTimeControl;
  createdAt: string;
  // The match id, which is what an invite link carries.
  inviteCode: string | null;
  // What joining this game would cost, or null when it is free to play.
  wager: ChessWager | null;
}

// Which side the creator takes. The service picks for them on "random".
export type ChessColorChoice = "white" | "black" | "random";

export interface CreateChessChallengeInput {
  timeControl: ChessTimeControl;
  // "invite" produces a shareable link; "auto" pairs with whoever is waiting.
  mode: "invite" | "auto";
  // Defaults to "random" when the caller does not care.
  color?: ChessColorChoice;
  // Each player's stake in micro-USDC. Omitted for a free game, which is the
  // default; the opponent has to match it to join.
  stakeMicro?: bigint;
}

// What a staked game is playing for. Absent on a free game, and a free game is
// the normal case: a null wager must never be rendered as a zero stake.
export type ChessWagerState = "pending" | "active" | "settled" | "refunded" | "cancelled";

export interface ChessWager {
  // Each player's stake in micro-USDC. The pot is twice this.
  stakeMicro: bigint;
  // The platform's cut of the pot on settlement, in basis points. Comes from
  // the service so a stale copy here can never quote the wrong payout.
  feeBps: number;
  creatorLocked: boolean;
  opponentLocked: boolean;
  state: ChessWagerState;
  winnerPlayer: string | null;
  settledAt: string | null;
}

// ----- Chess cashier -----
//
// A backend-custody USDC balance held by the chess service. Amounts are exact
// integer micro-USDC (six decimals); a null one means the service sent
// something unreadable, which must never be shown as zero.

export interface CashierConfig {
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  // Where a player sends USDC to fund their balance.
  depositAddress: string;
  requiredConfirmations: number;
  // The platform's cut of a settled pot, in basis points. 500 is 5%.
  platformFeeBps: number;
}

export interface PlayerBalance {
  player: string;
  // Spendable now. Withdrawals and new stakes are checked against this.
  availableMicro: bigint | null;
  // Committed to games in progress, so not withdrawable.
  lockedMicro: bigint | null;
  totalMicro: bigint | null;
}

export interface CashierDeposit {
  txHash: string;
  player: string;
  amountMicro: bigint | null;
  status: string;
  confirmedAt: string | null;
}

export interface CashierWithdrawal {
  id: string;
  player: string;
  toAddress: string;
  amountMicro: bigint | null;
  txHash: string | null;
  status: string;
  sentAt: string | null;
}

// ----- Chess swiss tournaments -----

export type SwissState = "created" | "started" | "finished";

// A pairing is either a bye, a game still being played, or a finished one whose
// result names the winning colour.
export type SwissPairingState = "bye" | "ongoing" | "white" | "black" | "draw";

export interface SwissTimeControl {
  initialSeconds: number;
  incrementSeconds: number;
}

export interface SwissSummary {
  id: string;
  name: string;
  organizer: string;
  state: SwissState;
  // Rounds played so far, and how many the tournament runs for.
  round: number;
  totalRounds: number;
  playerCount: number;
  ongoingCount: number;
  timeControl: ChessTimeControl;
  // What each entrant pays to join, in micro-USDC. Null on a free tournament,
  // which is the normal case and must never render as a zero fee.
  entryFeeMicro: bigint | null;
  winner: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface SwissStanding {
  rank: number;
  name: string;
  points: number;
  tieBreak: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  absent: boolean;
}

export interface SwissPairing {
  round: number;
  board: number;
  white: string | null;
  black: string | null;
  // The chess match backing this pairing. Null for a bye.
  matchId: string | null;
  state: SwissPairingState;
  isForfeit: boolean;
}

export interface SwissRound {
  round: number;
  pairings: SwissPairing[];
}

export interface SwissTournament extends SwissSummary {
  standings: SwissStanding[];
  rounds: SwissRound[];
}

export interface CreateSwissInput {
  name: string;
  totalRounds: number;
  timeControl: ChessTimeControl;
  // Optional entry code players must supply to join.
  password?: string;
  // What each entrant pays in, in micro-USDC. Omitted for a free tournament.
  entryFeeMicro?: bigint;
  // Pairs the service must never make, one "playerA playerB" per line.
  forbiddenPairings?: string;
}

export interface MatchmakingTicket {
  id: string;
  state: "searching" | "matched" | "expired";
  matchId: string | null;
  // Seconds left to accept once matched.
  acceptSecondsRemaining: number | null;
  opponent: ChessPlayer | null;
}

// ----- Spectator betting -----

export type BetSelection = "white" | "draw" | "black";

export interface MarketOdds {
  white: number;
  draw: number;
  black: number;
  // Server's win probability for white, 0..100, used for the eval bar.
  whiteWinProbability: number;
  updatedAt: string;
}

export interface OddsPoint {
  at: string;
  white: number;
}

export interface BetSlip {
  id: string;
  matchId: string;
  selection: BetSelection;
  // Odds locked at placement; payouts settle against this, not the live price.
  lockedOdds: number;
  stake: TokenAmount;
  potentialPayout: TokenAmount;
  state: "pending" | "won" | "lost" | "void";
  placedAt: string;
}

export interface PlaceBetInput {
  matchId: string;
  selection: BetSelection;
  stakeWei: string;
  // The odds the user saw. The server rejects the bet if the price has moved
  // beyond tolerance, rather than silently filling at a worse number.
  expectedOdds: number;
}

// ----- Draw -----

export interface DrawRound {
  id: string;
  // ISO timestamp the round closes; the countdown derives from this rather
  // than a server-supplied seconds value, so it survives reloads.
  closesAt: string;
  jackpot: TokenAmount;
  entryCost: TokenAmount;
  mainPool: number;
  mainPicks: number;
  bonusPool: number;
  prizeTiers: DrawPrizeTier[];
  state: "open" | "drawing" | "settled";
}

export interface DrawPrizeTier {
  // Main numbers matched for this tier.
  matches: number;
  bonusRequired: boolean;
  prize: TokenAmount;
  label: string;
}

export interface DrawResult {
  roundId: string;
  drawnAt: string;
  mainNumbers: number[];
  bonusNumber: number;
}

export interface DrawEntry {
  id: string;
  roundId: string;
  mainNumbers: number[];
  bonusNumber: number;
  cost: TokenAmount;
  state: "open" | "won" | "lost";
  // Set once the round settles.
  matchedNumbers: number[] | null;
  bonusMatched: boolean | null;
  prize: TokenAmount | null;
  createdAt: string;
}

export interface CreateDrawEntryInput {
  roundId: string;
  mainNumbers: number[];
  bonusNumber: number;
  // How many identical entries to buy.
  quantity: number;
}

// ----- Hub -----

export interface RecentWin {
  id: string;
  game: GameId;
  gameLabel: string;
  // Masked handle, e.g. "8***7". The gateway masks it; we never receive the
  // full identity of another player.
  playerHandle: string;
  amount: TokenAmount;
  wonAt: string;
}

export interface GamePresence {
  game: GameId;
  playersOnline: number;
  inQueue: number;
  // Headline figure for the tile, already formatted by the gateway when the
  // game has one (e.g. the draw jackpot).
  headline: TokenAmount | null;
}
