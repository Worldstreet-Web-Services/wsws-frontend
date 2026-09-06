"use client";

import Link from "next/link";

// The "Enter the Arena" card art from the comp (node 1:6837): the purple
// gradient, sunburst, sparkle field, chart line, the gold and silver coins,
// the headline, the tagline, and the Trade Now pill, exported as one image at
// 3x. The whole card is the doorway, so the art carries its own copy exactly as
// the designer drew it.
const ART = "/arena/enter-the-arena.png";

// The "Own the Market" home section (node 1:6834): a header over the Enter the
// Arena promo card. Phone only, and it closes the mobile home. Tapping anywhere
// on the card opens the market to trade.
export function EnterTheArenaBanner() {
  return (
    <section className="px-4 sm:hidden">
      <div className="mb-3 flex items-center gap-[9px]">
        <span className="ws-display text-[18px] leading-[1.1] tracking-[-0.32px] text-white">
          Own The Market.
        </span>
        <svg viewBox="0 0 8 12" aria-hidden className="h-[12px] w-[8px] shrink-0" fill="none">
          <path
            d="M1.5 1l5 5-5 5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <Link
        href="/market"
        aria-label="Enter the arena and trade now"
        className="block w-full transition-transform active:scale-[0.99]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART} alt="" width={356} height={213} className="block h-auto w-full" />
      </Link>
    </section>
  );
}
