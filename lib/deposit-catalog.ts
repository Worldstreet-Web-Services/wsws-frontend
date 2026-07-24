// Display ordering for the deposit origin picker. The live Dextopus catalog is
// the source of truth for which chains/tokens exist; this only decides which
// networks surface first in the tabs (the ones users most often hold).

// Dextopus chain ids for the networks we promote to the front.
export const POPULAR_CHAIN_IDS: readonly number[] = [
  1, // Ethereum
  8453, // Base
  792703809, // Solana
  728126428, // Tron
  42161, // Arbitrum
  56, // BNB Chain
  137, // Polygon
  10, // Optimism
  43114, // Avalanche
];

// Popular networks first (in the order above), then everything else by name.
export function orderChains<T extends { chainId: number; name: string }>(
  chains: readonly T[]
): T[] {
  const rank = new Map(POPULAR_CHAIN_IDS.map((id, i) => [id, i]));
  return [...chains].sort((a, b) => {
    const ra = rank.get(a.chainId) ?? Number.POSITIVE_INFINITY;
    const rb = rank.get(b.chainId) ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}
