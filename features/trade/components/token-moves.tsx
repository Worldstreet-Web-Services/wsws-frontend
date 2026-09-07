"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AssetIcon } from "@/components/ui/asset-icon";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";

// How long each token holds before cycling to the next.
const ROTATE_MS = 3000;

// A token the insight card can render. Any market can appear.
export interface InsightToken {
  symbol: string;
  name: string;
  logo: string | null;
  priceUsd: number;
  change24h: number;
}

function changePct(chg: number): string {
  const v = Number.isFinite(chg) ? chg : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// The token-insight card (Figma node 1:4060). Card is 339x168.
// The original SVG from Figma is used as-is for the full design. Dynamic
// text (symbol, price, change, message, buy label) and the token logo are
// overlaid at the exact positions the SVG's static content sits at, with
// opaque white/black backgrounds matching the SVG's chip, bubble, and
// button fills so the static text underneath is fully hidden.
function TokenInsightCard({ token, onBuy }: { token: InsightToken; onBuy?: () => void }) {
  const up = token.change24h >= 0;
  return (
    <div className="relative aspect-[339/168] w-full overflow-hidden rounded-[16.272px]">
      {/* Original Figma SVG — full design, untouched */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/trade/token-moves/card-bg.svg" alt="" className="block h-full w-full" />

      {/* Token chip overlay: covers the full white chip area.
          SVG rect at (71, 22) 169x45 rx=8.68 → 20.9%/13.1% */}
      <div
        className="absolute flex items-center rounded-[8.68px] bg-white p-[7px] shadow-[0_2px_6px_rgba(120,90,0,0.1)]"
        style={{
          left: "20.9%",
          top: "13.1%",
          width: "49.7%",
          height: "26.6%",
          transform: "rotate(-3deg)",
        }}
      >
        <span className="size-[30px] shrink-0 overflow-hidden rounded-full">
          <AssetIcon
            sym={token.symbol}
            bg={tokenBg(token.symbol)}
            logo={token.logo}
            fallback="gradient"
            size={30}
          />
        </span>
        <span className="ml-[5px] leading-tight">
          <span className="block text-[10px] font-semibold text-black">{token.symbol}</span>
          <span className="flex items-center gap-[3.7px] text-[10px] font-medium">
            <span className="text-[#9b9b9b]">
              {token.priceUsd > 0 ? formatUsd(token.priceUsd) : "—"}
            </span>
            <span className={up ? "text-[#5aad00]" : "text-[#f04438]"}>
              {changePct(token.change24h)}
            </span>
          </span>
        </span>
        <span className="ml-auto text-[13px]">🔥</span>
      </div>

      {/* Message bubble overlay: covers the full white bubble area.
          SVG rect at (37, 69.59) 222x58 rx=10.12 → 10.9%/41.4% */}
      <div
        className="absolute overflow-hidden rounded-[10.12px] bg-white px-[10px] py-[10px] shadow-[0_2px_8px_rgba(120,90,0,0.08)]"
        style={{
          left: "10.9%",
          top: "41.4%",
          width: "65.5%",
          height: "28%",
          transform: "rotate(-3deg)",
        }}
      >
        <p className="text-[10.5px] leading-[1.3]">
          <span className="font-semibold text-[#060606]">
            {token.symbol} is {up ? "up" : "down"} {Math.abs(token.change24h).toFixed(1)}%
          </span>
          <span className="font-medium text-[#656464]">
            {" "}
            in the last 6 hours. I recommend increasing your position by 10%
          </span>
        </p>
      </div>

      {/* Buy button overlay: covers the full black button area.
          SVG rect at (68.68, 134.26) 65.09x24.41 rx=12.2 → 20.3%/79.9% */}
      <button
        type="button"
        onClick={onBuy}
        className="absolute z-10 flex cursor-pointer items-center justify-center gap-[2.7px] rounded-[12.2px] border-[1.4px] border-[#ffd52d] bg-black"
        style={{ left: "20.3%", top: "79.9%", width: "19.2%", height: "14.5%" }}
      >
        <span className="text-[8px] font-semibold whitespace-nowrap text-white">
          Buy {token.symbol}
        </span>
      </button>
    </div>
  );
}

// The static "Eth Africa" promo card (Figma node 1:4145), kept as its
// exported render.
function EthAfricaCard({ onBuy }: { onBuy?: () => void }) {
  return (
    <div className="relative">
      <Image
        src="/trade/token-moves/eth-africa-card@3x.png"
        alt="ETH Africa is hitting a 70% win rate on ETH predictions"
        width={339}
        height={167}
        className="h-auto w-full"
      />
      {onBuy ? (
        <button
          type="button"
          onClick={onBuy}
          aria-label="Buy ETH"
          className="absolute cursor-pointer rounded-full"
          style={{ left: "64%", top: "9%", width: "29%", height: "22.5%" }}
        />
      ) : null}
    </div>
  );
}

// The "Stay Ahead of Token Moves" section (Figma node 1:4053): a header over
// a two-card horizontal scroll. The first card is a single rotating insight
// card that cycles through tokens every 3 seconds. The second is the static
// Eth Africa promo.
export function TokenMoves({
  tokens,
  onBuyToken,
}: {
  tokens: InsightToken[];
  onBuyToken?: (symbol: string) => void;
}) {
  const [index, setIndex] = useState(0);

  // Cycle through tokens every 3 seconds. Pauses for reduced motion.
  useEffect(() => {
    if (tokens.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % tokens.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [tokens.length]);

  const current = tokens.length > 0 ? tokens[index % tokens.length] : null;

  return (
    <div>
      <Link href="/market" className="mb-3 inline-flex items-end gap-[3px]">
        <span className="ws-display text-[18px] leading-[1.2] tracking-[-0.36px] text-white">
          Stay Ahead of Token Moves
        </span>
        <svg viewBox="0 0 20 20" aria-hidden className="mb-[1px] h-5 w-5 shrink-0" fill="none">
          <path
            d="M7.5 4l6 6-6 6"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <div className="ws-no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto">
        {current ? (
          <div className="w-[88%] shrink-0 snap-start">
            <TokenInsightCard token={current} onBuy={() => onBuyToken?.(current.symbol)} />
          </div>
        ) : null}
        <div className="w-[88%] shrink-0 snap-start overflow-hidden rounded-[16px]">
          <EthAfricaCard onBuy={() => onBuyToken?.("ETH")} />
        </div>
      </div>
    </div>
  );
}
