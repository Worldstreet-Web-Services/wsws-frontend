"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

// The "Stay Ahead of Token Moves" promo cards from the mobile comp
// (node 1:4053). Two illustrated cards exported as 3x PNGs — the BTC
// rocket card and the Eth Africa community card. Pixel-identical to the
// Figma, swipeable in a horizontal strip.
const CARDS = [
  {
    src: "/memecoins/btc-token-moves.png",
    alt: "BTC is up 12.8%. Buy Eth.",
  },
  {
    src: "/memecoins/eth-africa-token-moves.png",
    alt: "Eth Africa — 70% win rate on ETH predictions.",
  },
];

export function TokenMovesPromos() {
  const tSections = useTranslations("sections");

  return (
    <div className="w-full py-4">
      <Link href="/market" className="inline-flex items-end gap-[3px] px-4">
        <span className="ws-display text-[18px] leading-[1.2] tracking-[-0.36px] text-white">
          {tSections("tokenMoves")}
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

      <div className="ws-no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4">
        {CARDS.map((card) => (
          <Link
            key={card.src}
            href="/market"
            className="w-[88%] shrink-0 snap-start overflow-hidden rounded-[16px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.src}
              alt={card.alt}
              width={339}
              height={167}
              className="block h-auto w-full"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
