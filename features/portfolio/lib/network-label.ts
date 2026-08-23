// Chain ids as people know them. Anything not listed falls back to the raw id
// rather than hiding the network, so a new chain still reads as something.
const NETWORK_LABELS: Record<string, string> = {
  "eth-mainnet": "Ethereum",
  "base-mainnet": "Base",
  "arb-mainnet": "Arbitrum",
  "opt-mainnet": "Optimism",
  "polygon-mainnet": "Polygon",
  "solana-mainnet": "Solana",
};

export function networkLabel(network: string): string {
  return NETWORK_LABELS[network] ?? network;
}
