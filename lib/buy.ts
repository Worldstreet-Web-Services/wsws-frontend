// Domain types and pure helpers for buying a market asset. A buy is a Dextopus
// cross-chain route: the origin is always the user's USDC on Base, the
// destination is the chosen token on its chain, delivered to the user's own
// wallet. This module only resolves which routes exist for a symbol; amount and
// quote math live with the buy execution. No framework or wallet imports here.

import { SETTLE_CHAINS } from "@/lib/deposit";

// Every buy is funded from the user's USDC balance on Base. Single source of
// truth for the origin leg of the Dextopus quote.
export const BUY_ORIGIN = {
  chainId: SETTLE_CHAINS.base.chainId,
  asset: SETTLE_CHAINS.base.usdc,
  decimals: SETTLE_CHAINS.base.decimals,
} as const;

// Base is the default destination when a symbol can be delivered to several
// chains, and the auto-selected chain when a symbol lives on only one.
export const DEFAULT_BUY_CHAIN_ID = SETTLE_CHAINS.base.chainId;

// One place a symbol can settle to: a single Dextopus destination. Mapped from
// the deposit/destinations payload (currency is the destination token address,
// chainName is its "blockchain" label).
export interface BuyRoute {
  destinationChainId: number;
  chainName: string;
  asset: string;
  symbol: string;
  decimals: number;
}

// Base first, then by chain name. Both the default-selection and the
// single-chain ("tied to a chain") cases fall out of this ordering: the first
// route is the one to pick, and a length of one means no chain choice to offer.
export function sortRoutes(routes: BuyRoute[]): BuyRoute[] {
  const rank = (r: BuyRoute) => (r.destinationChainId === DEFAULT_BUY_CHAIN_ID ? 0 : 1);
  return [...routes].sort((a, b) => rank(a) - rank(b) || a.chainName.localeCompare(b.chainName));
}

// All buyable routes for a market symbol: the chains Dextopus can deliver it to,
// Base first. Symbol match is case-insensitive.
export function routesForSymbol(destinations: BuyRoute[], symbol: string): BuyRoute[] {
  const want = symbol.trim().toUpperCase();
  return sortRoutes(destinations.filter((d) => d.symbol.toUpperCase() === want));
}

// The default route to select for a symbol (Base when available, else the first
// by chain name), or null when the symbol is not buyable.
export function defaultRouteForSymbol(destinations: BuyRoute[], symbol: string): BuyRoute | null {
  return routesForSymbol(destinations, symbol)[0] ?? null;
}

// The set of symbols Dextopus can deliver, uppercased, for intersecting the
// markets table down to buyable assets.
export function buyableSymbols(destinations: BuyRoute[]): Set<string> {
  return new Set(destinations.map((d) => d.symbol.toUpperCase()));
}

// Whether a market symbol has at least one Dextopus route.
export function isBuyable(destinations: BuyRoute[], symbol: string): boolean {
  const want = symbol.trim().toUpperCase();
  return destinations.some((d) => d.symbol.toUpperCase() === want);
}
