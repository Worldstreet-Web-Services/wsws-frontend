#!/usr/bin/env node

const ONEINCH_QUOTE_URL = "https://api.1inch.com/fusion/quoter/v2.0/1/quote/receive";
const ONDO_API_URL = "https://app.ondo.finance";
const ETHEREUM_CHAIN_ID = 1;
const ETHEREUM_USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDC_DECIMALS = 6;
const MIN_EFFECTIVE_RATE_PERCENT = 90;
const DEFAULT_WALLET = "0x1111111111111111111111111111111111111111";

const apiKey = process.env.ONEINCH_API_KEY?.trim();
if (!apiKey) throw new Error("ONEINCH_API_KEY is required.");

const buyNotional = Number(process.env.ONEINCH_COVERAGE_USDC ?? "10");
if (!Number.isFinite(buyNotional) || buyNotional <= 0) {
  throw new Error("ONEINCH_COVERAGE_USDC must be positive.");
}
const walletAddress = process.env.ONEINCH_COVERAGE_WALLET?.trim() || DEFAULT_WALLET;
if (!/^0x[0-9a-fA-F]{40}$/u.test(walletAddress)) {
  throw new Error("ONEINCH_COVERAGE_WALLET must be an EVM address.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function json(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body?.description || body?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return body;
}

async function symbolsFromArgs() {
  const requested = process.argv.slice(2).filter((value) => value !== "--all");
  if (!process.argv.includes("--all")) {
    if (requested.length === 0) {
      throw new Error("Pass one or more Ondo symbols, or use --all.");
    }
    return requested;
  }
  const catalog = await json(`${ONDO_API_URL}/api/v2/assets`);
  return (catalog.assets ?? [])
    .map((asset) => asset.symbol)
    .filter((symbol) => typeof symbol === "string" && symbol !== "");
}

async function assetDetail(symbol) {
  return json(`${ONDO_API_URL}/api/v2/assets/${encodeURIComponent(symbol.toLowerCase())}/info`);
}

function decimalToUnits(value, decimals) {
  const [whole = "0", fraction = ""] = String(value).split(".");
  return BigInt(`${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`);
}

function sellAmountForNotional(price, decimals) {
  const scaledPrice = decimalToUnits(price, 8);
  const notional = decimalToUnits(String(buyNotional), 8);
  return (notional * 10n ** BigInt(decimals)) / scaledPrice;
}

async function fusionQuote(fromToken, toToken, amount) {
  const query = new URLSearchParams({
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    amount: amount.toString(),
    walletAddress,
    enableEstimate: "true",
  });
  const quote = await json(`${ONEINCH_QUOTE_URL}?${query}`, {
    headers: { accept: "application/json", authorization: `Bearer ${apiKey}` },
  });
  const preset = quote.presets?.[quote.recommended_preset];
  if (!preset) throw new Error("recommended preset missing");
  const marketAmount = BigInt(quote.marketAmount ?? quote.toTokenAmount);
  const expectedAmount = BigInt(preset.startAmount);
  const grossMinimumAmount = BigInt(preset.auctionEndAmount);
  const tokenFee = BigInt(preset.tokenFee);
  const minimumAmount = grossMinimumAmount > tokenFee ? grossMinimumAmount - tokenFee : 0n;
  const usdRatio = Number(quote.volume.usd.toToken) / Number(quote.volume.usd.fromToken);
  const rate = (amount) =>
    Number(((Number(amount) / Number(marketAmount)) * usdRatio * 100).toFixed(2));
  const effectiveRatePercent = rate(expectedAmount);
  const minimumEffectiveRatePercent = rate(minimumAmount);
  return {
    route: true,
    viable:
      effectiveRatePercent >= MIN_EFFECTIVE_RATE_PERCENT &&
      minimumEffectiveRatePercent >= MIN_EFFECTIVE_RATE_PERCENT,
    effectiveRatePercent,
    minimumEffectiveRatePercent,
    estimatedFillSeconds: preset.startAuctionIn + preset.auctionDuration,
  };
}

async function checkDirection(fromToken, toToken, amount) {
  try {
    return await fusionQuote(fromToken, toToken, amount);
  } catch (error) {
    return {
      route: false,
      viable: false,
      effectiveRatePercent: null,
      estimatedFillSeconds: null,
      error: error instanceof Error ? error.message : "quote failed",
    };
  }
}

const symbols = await symbolsFromArgs();
const rows = [];
for (const symbol of symbols) {
  try {
    const detail = await assetDetail(symbol);
    const deployment = detail.supportedNetworks?.find(
      (network) => network.chainId === ETHEREUM_CHAIN_ID
    );
    const price = detail.primaryMarket?.price;
    if (!deployment || !/^0x[0-9a-fA-F]{40}$/u.test(deployment.address)) {
      rows.push({ symbol, network: "no Ethereum deployment" });
      continue;
    }
    if (!price || Number(price) <= 0) {
      rows.push({ symbol, network: "Ethereum", error: "market price unavailable" });
      continue;
    }

    const buy = await checkDirection(
      ETHEREUM_USDC,
      deployment.address,
      decimalToUnits(String(buyNotional), USDC_DECIMALS)
    );
    await sleep(1_050);
    const sell = await checkDirection(
      deployment.address,
      ETHEREUM_USDC,
      sellAmountForNotional(price, deployment.decimals)
    );
    rows.push({ symbol: detail.symbol, network: "Ethereum", buy, sell });
  } catch (error) {
    rows.push({
      symbol,
      network: "unknown",
      error: error instanceof Error ? error.message : "asset lookup failed",
    });
  }
  await sleep(1_050);
}

console.table(
  rows.map((row) => ({
    symbol: row.symbol,
    network: row.network,
    buyRoute: row.buy?.route ?? false,
    buyEffective: row.buy?.effectiveRatePercent ?? "-",
    buyGuaranteed: row.buy?.minimumEffectiveRatePercent ?? "-",
    buySafe: row.buy?.viable ?? false,
    sellRoute: row.sell?.route ?? false,
    sellEffective: row.sell?.effectiveRatePercent ?? "-",
    sellGuaranteed: row.sell?.minimumEffectiveRatePercent ?? "-",
    sellSafe: row.sell?.viable ?? false,
    error: row.error ?? row.buy?.error ?? row.sell?.error ?? "",
  }))
);

const complete = rows.filter((row) => row.buy?.viable && row.sell?.viable).length;
console.log(`Safe two-way coverage: ${complete}/${rows.length} at $${buyNotional} notional.`);
if (complete !== rows.length) process.exitCode = 2;
