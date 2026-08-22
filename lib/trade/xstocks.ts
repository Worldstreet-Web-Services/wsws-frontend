import type { MarketAssetDetails, MarketAssetNetwork } from "@/lib/api/schemas/rwas";

export type RoutedRwaChain =
  | "solana"
  | "ethereum"
  | "base"
  | "arbitrum"
  | "bsc"
  | "polygon";

export interface RoutedRwaAsset {
  id: string;
  chain: RoutedRwaChain;
  address: string;
  symbol: string;
  name: string;
  issuer: string;
  category: string;
  priceUsd: string | null;
  freelyTradable: boolean;
  accessMode: "dex";
  kycRequired: boolean;
  minInvestmentUsd: string | null;
  redemption: string;
  issuerUrl: string;
  deprecated: boolean;
  meta: { note: string };
}

const CHAIN_BY_ID: Record<number, RoutedRwaChain> = {
  1: "ethereum",
  56: "bsc",
  101: "solana",
  137: "polygon",
  8453: "base",
  42161: "arbitrum",
};

const CHAIN_PRIORITY: Record<RoutedRwaChain, number> = {
  base: 0,
  solana: 1,
  arbitrum: 2,
  polygon: 3,
  ethereum: 4,
  bsc: 5,
};

const PORTFOLIO_NETWORK_BY_CHAIN: Record<RoutedRwaChain, string> = {
  base: "base-mainnet",
  solana: "solana-mainnet",
  arbitrum: "arb-mainnet",
  polygon: "polygon-mainnet",
  ethereum: "eth-mainnet",
  bsc: "bsc-mainnet",
};

export function marketNetworkToRwaChain(network: MarketAssetNetwork): RoutedRwaChain | null {
  const byId = CHAIN_BY_ID[network.chainId];
  if (byId) return byId;

  const name = network.network.toLowerCase();
  if (name.includes("solana")) return "solana";
  if (name.includes("arbitrum")) return "arbitrum";
  if (name.includes("polygon")) return "polygon";
  if (name.includes("base")) return "base";
  if (name.includes("ethereum")) return "ethereum";
  if (name.includes("bsc") || name.includes("bnb")) return "bsc";
  return null;
}

function supportsUsdc(network: MarketAssetNetwork): boolean {
  return (
    network.stablecoins.length === 0 ||
    network.stablecoins.some((stablecoin) => stablecoin.symbol.toUpperCase() === "USDC")
  );
}

function deploymentScore(network: MarketAssetNetwork): number {
  const chain = marketNetworkToRwaChain(network);
  if (!chain || !supportsUsdc(network)) return Number.POSITIVE_INFINITY;
  return (network.supportsAtomicSwaps ? 0 : 100) + CHAIN_PRIORITY[chain];
}

export function preferredMarketDeployment(
  detail: MarketAssetDetails,
  target?: { network?: string; address?: string | null }
): MarketAssetNetwork | null {
  if (target?.address) {
    const address = target.address.toLowerCase();
    const exact = detail.networks.find((network) => network.address.toLowerCase() === address);
    if (exact && marketNetworkToRwaChain(exact) && supportsUsdc(exact)) return exact;
    return null;
  }

  if (target?.network) {
    const match = detail.networks.find((network) => {
      const chain = marketNetworkToRwaChain(network);
      return chain && PORTFOLIO_NETWORK_BY_CHAIN[chain] === target.network && supportsUsdc(network);
    });
    if (match) return match;
  }

  return (
    detail.networks
      .filter((network) => Number.isFinite(deploymentScore(network)))
      .sort((left, right) => deploymentScore(left) - deploymentScore(right))[0] ?? null
  );
}

export function marketAssetToRwaAsset(
  detail: MarketAssetDetails,
  target?: { network?: string; address?: string | null }
): RoutedRwaAsset | null {
  const deployment = preferredMarketDeployment(detail, target);
  const chain = deployment ? marketNetworkToRwaChain(deployment) : null;
  if (!deployment || !chain) return null;

  const priceUsd = detail.primaryMarket?.priceUsd ?? detail.asset.primaryMarket.priceUsd ?? null;
  const category =
    detail.asset.tags.find((tag) => tag.categoryLayer === "layer1")?.tagLabel ??
    detail.asset.tags[0]?.tagLabel ??
    "Equity";

  return {
    id: `${chain}:${deployment.address}`,
    chain,
    address: deployment.address,
    symbol: detail.asset.symbol,
    name: detail.underlyingName ?? detail.asset.name,
    issuer: "xStocks",
    category,
    priceUsd,
    freelyTradable: true,
    accessMode: "dex",
    kycRequired: false,
    minInvestmentUsd: detail.minimumAmountUsd,
    redemption: "Secondary-market execution through available onchain liquidity.",
    issuerUrl: detail.legalNoticeUrl ?? "https://xstocks.com",
    deprecated: false,
    meta: {
      note: `${detail.asset.symbol} executes on ${deployment.network} through the RWA router.`,
    },
  };
}
