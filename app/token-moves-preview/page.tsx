"use client";

import { TokenMoves, type InsightToken } from "@/features/trade/components/token-moves";

// TEMPORARY preview harness for the "Stay Ahead of Token Moves" mobile carousel
// (Figma node 1:4053). Delete this route once the section is signed off. The Buy
// pills alert here in place of the real buy sheet.
const SAMPLE: InsightToken[] = [
  { symbol: "BTC", name: "Bitcoin", logo: null, priceUsd: 1876.67, change24h: 12.8 },
  { symbol: "ETH", name: "Ethereum", logo: null, priceUsd: 3421.5, change24h: -4.2 },
  { symbol: "SOL", name: "Solana", logo: null, priceUsd: 182.34, change24h: 7.1 },
];

export default function TokenMovesPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0d0d0f] p-4">
      <div className="mx-auto w-full max-w-md">
        <TokenMoves tokens={SAMPLE} onBuyToken={(s) => window.alert(`Buy ${s}`)} />
      </div>
    </div>
  );
}
