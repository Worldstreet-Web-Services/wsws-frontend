// Dextopus quote client for selling a held asset. A sell settles to USDC on
// Base, credited to the user's balance: origin is the held token on its own
// chain, destination is USDC-Base, recipient is the user's Base wallet. Requests
// go through the /api/dextopus proxy. The response shape matches a buy, so the
// buy normalizer is reused. Amounts stay in integer base units (bigint).

import { apiFetch } from "@/lib/api";
import { normalizeBuyQuote, type BuyQuote } from "@/lib/buy-quote";
import { SETTLE_CHAINS } from "@/lib/deposit";

// Every sell settles here.
export const SELL_DESTINATION = {
  chainId: SETTLE_CHAINS.base.chainId,
  asset: SETTLE_CHAINS.base.usdc,
  decimals: SETTLE_CHAINS.base.decimals,
} as const;

// Dextopus chain id per Alchemy network id, limited to the chains we hold
// balances on. Keep in sync with the portfolio's queried chains.
const NETWORK_TO_CHAIN: Record<string, number> = {
  "base-mainnet": 8453,
  "eth-mainnet": 1,
  "arb-mainnet": 42161,
  "opt-mainnet": 10,
  "polygon-mainnet": 137,
  "solana-mainnet": 792703809,
};

// A native balance has no contract address, so each chain has a sentinel that
// stands for its native coin.
const EVM_NATIVE = "0x0000000000000000000000000000000000000000";
// The Solana system program, which is how the quote endpoint addresses native
// SOL. NOT the wrapped-SOL mint: quoting that returns "asset is not supported
// on chain". The deposit and buy paths hit the same wall and resolve it the
// same way, see depositOriginAsset in lib/deposit and SETTLEMENT_ADDRESS in
// lib/buy.
const SOL_NATIVE = "11111111111111111111111111111111";
const NATIVE_ORIGIN: Record<string, string> = {
  "base-mainnet": EVM_NATIVE,
  "eth-mainnet": EVM_NATIVE,
  "arb-mainnet": EVM_NATIVE,
  "opt-mainnet": EVM_NATIVE,
  "polygon-mainnet": EVM_NATIVE,
  "solana-mainnet": SOL_NATIVE,
};

// Whether a held asset's network can be sold (it maps to a Dextopus chain).
export function canSell(network: string): boolean {
  return network in NETWORK_TO_CHAIN;
}

// Chains whose native coin we can quote an origin for: ETH on the EVM side,
// SOL on Solana. Native POL is the one Dextopus will not take as an origin, so
// a Polygon gas balance stays unsellable.
//
// Solana belongs here: SOL was only excluded because the sell was quoting the
// wrapped-SOL mint, which the endpoint rejects. With the system-program
// sentinel above it quotes like any other origin.
const SELLABLE_NATIVE_CHAINS = new Set([
  "base-mainnet",
  "eth-mainnet",
  "arb-mainnet",
  "opt-mainnet",
  "solana-mainnet",
]);

// Whether a specific held asset can be sold. A token (has an address) is assumed
// sellable and the quote is the final authority; a native balance is only
// sellable where we have an origin sentinel the quote endpoint accepts.
export function canSellAsset(network: string, address: string | null): boolean {
  if (!canSell(network)) return false;
  if (address === null) return SELLABLE_NATIVE_CHAINS.has(network);
  return true;
}

export interface SellQuoteInput {
  // Alchemy network id of the held asset.
  network: string;
  // Held token address, or null for a native balance.
  asset: string | null;
  // Amount of the held asset to sell, in its base units.
  amount: bigint;
  // The user's Base wallet, where the USDC proceeds land.
  recipient: string;
  // The user's wallet on the origin chain, refunded if the sale cannot complete.
  refundTo: string;
  slippageBps: number;
}

// Build the Dextopus deposit/quote body for a sell. Pure, so it is unit tested.
export function buildSellQuoteBody(input: SellQuoteInput) {
  const originChainId = NETWORK_TO_CHAIN[input.network];
  if (!originChainId) throw new Error("This asset's network is not supported for selling.");
  return {
    originChainId,
    originAsset: input.asset ?? NATIVE_ORIGIN[input.network],
    destinationChainId: SELL_DESTINATION.chainId,
    destinationAsset: SELL_DESTINATION.asset,
    amount: input.amount.toString(),
    recipient: input.recipient,
    refundTo: input.refundTo,
    slippageBps: input.slippageBps,
  };
}

export async function fetchSellQuote(input: SellQuoteInput): Promise<BuyQuote> {
  const res = await apiFetch("/api/dextopus/deposit/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSellQuoteBody(input)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Surface a friendly, retryable message. The raw provider text (e.g.
    // "Origin asset ... is not supported") is technical and can be transient.
    console.error("Sell quote failed:", data?.message ?? res.status);
    throw new Error(
      "We couldn't sell this asset to USDC right now. Try again or pick another one."
    );
  }
  // Proceeds are USDC on Base (6 decimals).
  return normalizeBuyQuote(data, SELL_DESTINATION.decimals);
}
