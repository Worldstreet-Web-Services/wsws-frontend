import type { TokenBalance } from "@/lib/server/alchemy";

// Deposits currently settle as USDC on Base and sit in the wallet as spendable
// cash, not as a position the user chose to hold. Until per-deposit tracking
// lands, the holdings table shows bought assets only, so this settlement balance
// is filtered out of that view. Every other consumer of the portfolio (trade
// balances, swap net-balances, global search, funding) still sees the token,
// because the user needs that USDC to buy with. This is display-only.
//
// The portfolio allowlist (lib/server/alchemy) guarantees only the real Base
// USDC contract ever reaches here under the "USDC" symbol, so matching on symbol
// and network is exact. A spoofed token cannot reach this point.
const SETTLEMENT_NETWORK = "base-mainnet";
const SETTLEMENT_SYMBOL = "USDC";

// True for the USDC-on-Base deposit float that the holdings table hides.
export function isDepositSettlementToken(token: TokenBalance): boolean {
  return token.network === SETTLEMENT_NETWORK && token.symbol === SETTLEMENT_SYMBOL;
}

// The bought-asset set shown in the holdings table: the portfolio minus the
// deposit settlement float. USDT, RWAs, native gas tokens, and every other
// holding pass through unchanged.
export function selectHoldings(tokens: TokenBalance[]): TokenBalance[] {
  return tokens.filter((token) => !isDepositSettlementToken(token));
}

// The floor the holdings table renders as "$0.00": one rounded cent.
const ZERO_VALUE_USD = 0.005;

// True for a row the "hide zero-value assets" toggle should drop: the
// always-present USDC/USDT/native baseline (balance 0) and dust that rounds to
// $0.00.
//
// A held balance we could not PRICE is deliberately not zero-value. valueUsd is
// balance x price, so an unpriced holding is $0 while the balance is real, and
// hiding it tells the owner they do not have something they do — which is how a
// delivered APE on ApeChain and a delivered HYPE on HyperEVM both read as "the
// app didn't show it". Only the portfolio allowlist decides what is a real
// holding, so anything reaching here with a balance has already been recognized
// and is worth showing at an unknown value rather than not at all.
export function isZeroValueHolding(token: TokenBalance): boolean {
  if (token.balance > 0 && token.priceUsd === 0) return false;
  return token.valueUsd < ZERO_VALUE_USD;
}

/**
 * A cent: the smallest figure formatMoney will print. Anything under it renders
 * as "<$0.01" instead of a number.
 *
 * Higher than ZERO_VALUE_USD on purpose. That constant is the point a figure
 * ROUNDS to $0.00; this one is the point it stops being a figure at all. A
 * holding worth $0.007 rounds to $0.01 and so survives the table's toggle, but
 * still shows the reader "<$0.01".
 */
const DUST_USD = 0.01;

/**
 * True for a holding worth so little that it can only be shown as "<$0.01".
 *
 * Such a row tells the owner nothing, and after a full exit it actively misleads:
 * a remainder too small to round to a cent reads as though the sale never went
 * through. Selling the whole of a position should empty it from the list.
 *
 * The unpriced carve-out is the same one isZeroValueHolding makes, and for the
 * same reason: valueUsd is balance x price, so a real balance we could not price
 * is $0 through no fault of the owner. It renders as "$0.00" rather than
 * "<$0.01", it is a genuine position, and hiding it would tell someone they do
 * not have something they do.
 */
export function isDustHolding(token: TokenBalance): boolean {
  // Kept explicit so the rule still holds if a feed ever reports a value
  // without a price: an unpriced balance is a real position, not dust.
  if (token.balance > 0 && token.priceUsd === 0) return false;
  // Deliberately formatMoney's own condition for printing "<$0.01" in place of
  // a figure, so this hides exactly the rows that cannot show one.
  //
  // A value of EXACTLY zero is not dust. It is either an unpriced holding or a
  // balance too small for the float to carry, and one wei of ETH is genuinely
  // held however it rounds. Those render "$0.00", which is a figure, and they
  // stay.
  return token.valueUsd > 0 && token.valueUsd < DUST_USD;
}
