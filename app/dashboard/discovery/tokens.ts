"use client";

import { useMemo } from "react";
import { useSpotMarkets, type SpotMarket } from "@/features/trade/hooks/use-spot-markets";
import { formatUsd } from "@/lib/trade/math";
import type { TokenSpot } from "@/features/discovery/types";

// Discovery must not import trade: features never import each other. So the
// route reads trade's own hook and maps it into the display-ready shape the
// card takes as a prop. app -> features is downward, which is allowed.
//
// This is where token money becomes a string. The card formats nothing, so
// every string on a TokenSpot is produced here, with the same helpers the spot
// desk itself uses so the dashboard and the desk never disagree on a price.

// The card is "Stay Ahead of Token Moves", so the feature is the move: the
// biggest 24h swings, gains and losses alike. Top-by-cap would put the same
// four or five names on the card every day, which is not a reason to look.
const DEFAULT_LIMIT = 5;

// Below this a move is not a move. It is also the floor of what the two-decimal
// label can show: 0.004% renders "+0.00%", which reads as a broken card rather
// than a flat market. The upstream hook defaults a missing 24h change to 0, so
// this doubles as the filter for tokens the CoinGecko feed does not cover.
const MIN_MOVE_PERCENT = 0.01;

// Every featured token opens the spot desk. The desk takes no per-token route
// yet, so a deep link would 404 on the query it cannot read.
const SPOT_DESK = "/spot";

// One identity for "nothing to feature", so loading, an error and a flat market
// all hand the card the same array rather than a fresh empty one each render.
const NO_SPOTS: readonly TokenSpot[] = Object.freeze([]);

// The repo's 24h change label, matching the spot tables character for
// character. The percentage is a reading from the price feed, not an asset
// amount, so it stays a number here; nothing in this file multiplies it.
function changeLabel(percent: number): string {
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function toTokenSpot(market: SpotMarket): TokenSpot {
  const up = market.change24h >= 0;
  return {
    symbol: market.symbol,
    name: market.name,
    price: formatUsd(market.priceUsd),
    change: changeLabel(market.change24h),
    up,
    movePercent: `${Math.abs(market.change24h).toFixed(2)}%`,
    logo: market.logo,
    href: SPOT_DESK,
  };
}

// The biggest movers the feed can actually vouch for. A token with no price is
// dropped rather than featured at "$0.00", and ties break by market cap so the
// name a user is likelier to recognise wins.
function pickMovers(markets: readonly SpotMarket[], limit: number): SpotMarket[] {
  if (limit <= 0) return [];
  return markets
    .filter(
      (m) =>
        Number.isFinite(m.priceUsd) &&
        m.priceUsd > 0 &&
        Number.isFinite(m.change24h) &&
        Math.abs(m.change24h) >= MIN_MOVE_PERCENT
    )
    .sort(
      (a, b) =>
        Math.abs(b.change24h) - Math.abs(a.change24h) ||
        b.marketCap - a.marketCap ||
        a.symbol.localeCompare(b.symbol)
    )
    .slice(0, limit);
}

/**
 * Live tokens for the "Stay Ahead of Token Moves" card, already formatted.
 *
 * Returns an empty array while the market list is loading and when it fails.
 * That is a real answer, not a placeholder: handed nothing, the card keeps its
 * editorial content, which beats rotating through blanks or a spinner.
 */
export function useTokenSpots(limit: number = DEFAULT_LIMIT): readonly TokenSpot[] {
  const { markets, error } = useSpotMarkets();

  // The card's rows, serialised. The price feed polls, so the markets array is
  // rebuilt on a schedule whether or not anything on screen changed, and a
  // sub-cent tick moves a number without moving a single character the card
  // renders. This string only changes when a rendered character does.
  const encoded = useMemo(() => {
    if (error) return "";
    const movers = pickMovers(markets, limit);
    return movers.length > 0 ? JSON.stringify(movers.map(toTokenSpot)) : "";
  }, [markets, error, limit]);

  // Decoded from that string rather than carried over from the memo above, so
  // the array's identity is tied to the values on it and not to whichever poll
  // produced them. A poll that changes nothing visible leaves this array alone,
  // and the cards' ten-second rotation runs on instead of restarting.
  return useMemo<readonly TokenSpot[]>(
    () => (encoded === "" ? NO_SPOTS : (JSON.parse(encoded) as TokenSpot[])),
    [encoded]
  );
}
