// Maps a Hyperliquid asset symbol to the TradingView symbol its chart embeds
// with. Hyperliquid symbols are bare bases with no explicit quote ("BTC",
// "ETH") — unlike the old Avantis pair mapper this replaces, there is no pair
// object to read a category or override table from, just the symbol string.
// Mirrors that mapper's crypto-venue table and COINBASE default exactly (see
// git history of the now-removed lib/perp/tradingview.ts).

// Venue per base, resolved against TradingView's symbol-search API — Coinbase
// covers nearly every Hyperliquid-listed major; the handful it lacks chart on
// the venue TradingView actually serves them from.
const CRYPTO_VENUE: Record<string, string> = {
  JUP: "OKX:JUPUSD",
  XMR: "CRYPTO:XMRUSD",
};

// Hyperliquid prefixes rebased/wrapped listings with "k" (1000x-scaled
// memecoins like kPEPE, kSHIB, kBONK) — TradingView quotes the unwrapped
// asset, so the prefix has to come off before venue lookup.
function unwrapSymbol(symbol: string): string {
  return symbol.startsWith("k") && symbol.length > 1 ? symbol.slice(1) : symbol;
}

export function tradingViewSymbolForAsset(symbol: string): string {
  const base = unwrapSymbol(symbol);
  return CRYPTO_VENUE[base] ?? `COINBASE:${base}USD`;
}
