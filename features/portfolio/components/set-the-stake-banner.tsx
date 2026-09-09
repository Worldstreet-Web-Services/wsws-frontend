"use client";

import { useEffect, useRef, useState } from "react";
import { Chewy } from "next/font/google";
import { cn } from "@/lib/utils";

// "Set the stake" is set in Chewy — the comp's display face. Loaded here so only
// this banner pulls it; 400 is the only weight Chewy ships.
const chewy = Chewy({ weight: "400", subsets: ["latin"], display: "swap" });

// The exported ticket artwork (node 1:2689). The ticket-edge SVG is horizontally
// symmetric, so the same file serves both scalloped edges.
const ART = "/casino/set-the-stake";

// The comp's exact artboard. The banner is drawn once at this size in real
// pixels, then scaled as one piece to whatever width it is given, so the font
// size, letter spacing, and every image position stay in the comp's exact ratios
// at any width instead of stretching.
const W = 337;
const H = 61;

// The "Set the stake" promo, pixel-for-pixel from the comp (node 1:2689): a red
// #ed2b07 ticket — four-bump scalloped edges, a flame, two faint orange glow
// rings — with the pitch in Chewy beside a Mona Sans tagline, split by a hairline.
// Presentational; it takes no action of its own.
export function SetTheStakeBanner({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Scale the fixed artboard to the container width. A ResizeObserver keeps it
  // exact as the carousel slide or viewport changes; aspect-ratio reserves the
  // matching height up front so there is no layout shift on the first measure.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = (width: number) => setScale(width / W);
    measure(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) measure(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: W, height: H, transform: `scale(${scale})` }}
      >
        {/* Scalloped ticket edges — the same symmetric SVG on both sides. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/ticket-edge.svg`}
          alt=""
          className="pointer-events-none absolute top-px left-0 h-[60px] w-[17.938px]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/ticket-edge.svg`}
          alt=""
          className="pointer-events-none absolute top-0 left-[319px] h-[60px] w-[17.938px]"
        />

        {/* Red body; clips the flame and glow rings to the ticket. */}
        <div className="absolute top-[4px] left-[12px] h-[54px] w-[312px] overflow-hidden bg-[#ed2b07]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/glow-right.svg`}
            alt=""
            className="pointer-events-none absolute top-[-47.1px] left-[123.44px] size-[287.48px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/glow-left.svg`}
            alt=""
            className="pointer-events-none absolute top-[-11.37px] left-[-12.99px] size-[165.667px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/flame.svg`}
            alt=""
            className="pointer-events-none absolute top-[5px] left-[12px] h-[64.896px] w-[39.005px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ART}/divider.svg`}
            alt=""
            className="pointer-events-none absolute top-[18.5px] left-[146.5px] h-[15px] w-px"
          />

          <p
            className={cn(
              chewy.className,
              "absolute top-[20px] left-[59px] text-[16px] leading-[0.86] whitespace-nowrap text-white capitalize [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]"
            )}
          >
            Set the stake
          </p>
          <p
            className="absolute top-[17px] left-[153px] text-[12px] leading-[1.52] font-medium tracking-[-0.24px] whitespace-nowrap text-white capitalize"
            style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"wdth" 100' }}
          >
            Everyone plays to win
          </p>
        </div>
      </div>
    </div>
  );
}
