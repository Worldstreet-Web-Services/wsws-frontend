// Small display helpers for the migration flow. Pure, so components stay
// layout-only.

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

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Explorer bases for the networks the sweep can touch, so a finished item can
// link to its transaction.
const EXPLORERS: Record<string, string> = {
  "eth-mainnet": "https://etherscan.io",
  "base-mainnet": "https://basescan.org",
  "arb-mainnet": "https://arbiscan.io",
  "opt-mainnet": "https://optimistic.etherscan.io",
  "polygon-mainnet": "https://polygonscan.com",
  "solana-mainnet": "https://explorer.solana.com",
};

export function sweepTxUrl(network: string, hash: string): string | null {
  const base = EXPLORERS[network];
  return base ? `${base}/tx/${hash}` : null;
}
