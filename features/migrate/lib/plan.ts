// Builds the per-chain plan for sweeping every held asset out of the user's
// old Privy embedded wallets and into their new Decane wallets. Pure: no
// framework, no network, so the maths is unit tested. Amounts stay in integer
// base units (bigint), parsed from the portfolio's exact rawBalance string,
// never the float `balance`.

import type { TokenBalance } from "@/lib/server/alchemy";
import { isSponsoredEvmNetwork } from "@/lib/trade/sponsored-evm";

export const SOLANA_NETWORK = "solana-mainnet";

// The order chains are swept and listed in. Matches the portfolio's supported
// set (lib/server/alchemy); Base first because that is where most value sits.
const NETWORK_ORDER = [
  "base-mainnet",
  "eth-mainnet",
  "arb-mainnet",
  "opt-mainnet",
  "polygon-mainnet",
  SOLANA_NETWORK,
];

export interface SweepAsset {
  // Stable identity for progress tracking across retries.
  id: string;
  network: string;
  // Token contract/mint address, or null for the chain's native gas token.
  tokenAddress: string | null;
  symbol: string;
  decimals: number;
  amount: bigint;
  valueUsd: number;
}

export interface ChainSweep {
  network: string;
  // An EVM chain sweeps as one atomic sponsored batch; Solana sweeps one
  // sponsored transaction per asset.
  kind: "evm-batch" | "solana-sequential";
  assets: SweepAsset[];
}

export function sweepAssetId(network: string, tokenAddress: string | null): string {
  return `${network}:${tokenAddress ?? "native"}`;
}

// Groups held balances by chain, dropping zero balances, with each chain's
// tokens ordered before its native asset. Ordering matters on a chain where
// gas ever comes out of the native balance; under sponsorship it is free, but
// the invariant is kept so the plan never depends on it.
//
// Every EVM network here must be gas-sponsored: the plan sends the FULL native
// balance, which only settles if the user pays no gas. An unsponsored network
// would need a gas reserve carved out, and rather than guess one we refuse to
// plan, so the gap is caught in review instead of as a mid-sweep failure.
export function buildSweepPlan(tokens: TokenBalance[]): ChainSweep[] {
  const byNetwork = new Map<string, SweepAsset[]>();
  for (const token of tokens) {
    const amount = BigInt(token.rawBalance);
    if (amount <= 0n) continue;
    if (!NETWORK_ORDER.includes(token.network)) {
      throw new Error(`Cannot plan a sweep for unsupported network ${token.network}`);
    }
    if (token.network !== SOLANA_NETWORK && !isSponsoredEvmNetwork(token.network)) {
      throw new Error(`Cannot sweep ${token.network}: it is not gas-sponsored`);
    }
    const asset: SweepAsset = {
      id: sweepAssetId(token.network, token.address),
      network: token.network,
      tokenAddress: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      amount,
      valueUsd: token.valueUsd,
    };
    const group = byNetwork.get(token.network);
    if (group) group.push(asset);
    else byNetwork.set(token.network, [asset]);
  }

  const plan: ChainSweep[] = [];
  for (const network of NETWORK_ORDER) {
    const assets = byNetwork.get(network);
    if (!assets) continue;
    const tokensFirst = [
      ...assets.filter((a) => a.tokenAddress !== null),
      ...assets.filter((a) => a.tokenAddress === null),
    ];
    plan.push({
      network,
      kind: network === SOLANA_NETWORK ? "solana-sequential" : "evm-batch",
      assets: tokensFirst,
    });
  }
  return plan;
}
