// What the Hyperliquid desk reports when it opens or closes a position.
//
// The exchange's order row says whether the order stands and what it is known
// by, but not what it filled at. So the dollar figures are the ticket's own:
// collateral, and notional as collateral times leverage, or the position's size
// at its mark on a close. They are marked `amount_source: "quote"`; settled
// perp volume comes from the venue, not from the browser.
//
// Stops, take profits and liquidations execute on Hyperliquid itself and never
// pass through this app, so a close reported here is always a manual one.

import type { AnalyticsEvents, MarketType } from "@/lib/analytics/events";
import type { HlOrderRow, HlPositionView } from "@/features/trade/lib/hyperliquid-types";

export interface PerpTicket {
  market: string;
  side: "buy" | "sell";
  orderMode: "market" | "limit";
  leverage: number;
  marginMode: "cross" | "isolated";
  collateralUsd: number;
  notionalUsd: number;
  markPrice: number;
  limitPrice: string;
  takeProfitPrice: string;
  stopLossPrice: string;
}

const MARKET_TYPES: Record<string, MarketType> = {
  crypto: "crypto",
  forex: "forex",
  fx: "forex",
  commodity: "commodity",
  commodities: "commodity",
  equity: "equity",
  equities: "equity",
  stocks: "equity",
};

/** A Hyperliquid asset's category as the catalog's market type, or omitted. */
export function marketTypeOf(category: string | null): MarketType | undefined {
  return category ? MARKET_TYPES[category.toLowerCase()] : undefined;
}

// An order the exchange refused or pulled opened nothing.
const DID_NOT_OPEN = new Set(["rejected", "cancelled"]);

function positive(value: string): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** perp_trade_opened for an order the exchange accepted, or null when it did not. */
export function perpOpenedProps(
  ticket: PerpTicket,
  entry: HlOrderRow
): AnalyticsEvents["perp_trade_opened"] | null {
  if (DID_NOT_OPEN.has(entry.status)) return null;
  const takeProfit = positive(ticket.takeProfitPrice);
  const stopLoss = positive(ticket.stopLossPrice);
  const limit = ticket.orderMode === "limit" ? positive(ticket.limitPrice) : undefined;
  return {
    market: ticket.market,
    side: ticket.side === "buy" ? "long" : "short",
    leverage: ticket.leverage,
    margin_mode: ticket.marginMode,
    collateral_usd: ticket.collateralUsd,
    position_size_usd: ticket.notionalUsd,
    notional_usd: ticket.notionalUsd,
    order_type: ticket.orderMode,
    // A market order opens at the mark; a limit order has not opened at any
    // price yet, and carries the level it is waiting for instead.
    ...(limit !== undefined ? { limit_price: limit } : { entry_price: ticket.markPrice }),
    has_take_profit: takeProfit !== undefined,
    ...(takeProfit !== undefined ? { take_profit_price: takeProfit } : {}),
    has_stop_loss: stopLoss !== undefined,
    ...(stopLoss !== undefined ? { stop_loss_price: stopLoss } : {}),
    order_id: entry.id,
    venue: "hyperliquid",
    amount_source: "quote",
  };
}

/** perp_trade_closed for a position the user closed from the desk. */
export function perpClosedProps(
  position: HlPositionView,
  market: string,
  closeOrder: HlOrderRow
): AnalyticsEvents["perp_trade_closed"] {
  const price = Number(position.markPrice ?? position.entryPrice);
  const notional = Math.round(Math.abs(Number(position.size)) * price * 1e6) / 1e6;
  const leverage = position.leverage > 0 ? position.leverage : 1;
  return {
    market,
    close_type: "full",
    close_reason: "manual",
    pnl_usd: Number(position.unrealizedPnlUsdc ?? 0),
    notional_usd: notional,
    // The margin the position held: what the close returns before PnL.
    amount_usd: Math.round((notional / leverage) * 1e6) / 1e6,
    order_id: closeOrder.id,
    venue: "hyperliquid",
    amount_source: "quote",
  };
}
