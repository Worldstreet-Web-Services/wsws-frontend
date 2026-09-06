"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { usePromoFront } from "@/components/ui/promo-deck";
import { MARKET_SQUARE_HIDDEN, marketSquareHref } from "@/lib/market-square";

// The designer's live-audience photo, sparkle field, and wordmark mark, cut
// from the mobile comp (node 280:4577) and served from public/.
const PHOTO = "/market-square/audience.png";
const SPARKLES = "/market-square/sparkle-field.svg";
const WORDMARK_ICON = "/market-square/wordmark-icon.svg";
const HEARTS = "/market-square/two-hearts.svg";
// A second copy of the Square mark, tumbling in among the audience as a floating
// sticker (distinct from the wordmark icon top-right).
const MARK = "/market-square/bubble-mark.svg";

// The Market Square go-live promo as the mobile comp draws it (node 280:4577):
// a purple card, the recruiting headline on the left, a live audience bleeding
// off the top behind a soft sparkle field, the Market Square wordmark, and the
// "explore market" pill. The whole card is the doorway into the square.
//
// Phone only. From `sm` up the dashboard carries its own square rails, so this
// stands in for them on a screen too narrow to hold one.
export function SquareLiveBanner() {
  const href = marketSquareHref();

  // No inert doorway: with the square gated off or its URL unset there is
  // nowhere to go, so the card does not render rather than promising a room
  // that will not open. This mirrors the dashboard's own square blocks.
  if (MARKET_SQUARE_HIDDEN || href === null) return null;

  return <SquareLiveBannerCard href={href} />;
}

// The card itself, split from the gate so the presentation can be previewed
// and tested with a concrete destination.
export function SquareLiveBannerCard({ href }: { href: string }) {
  const t = useTranslations("square");
  const isFront = usePromoFront();
  const reduce = useReducedMotion();

  // The comp slides the headline in from the left (node 280:4667). Tied to the
  // deck like the Kash coins: the entrance replays each time this banner reaches
  // the front, and rests off-screen while it waits behind. Reduced motion holds
  // it in place. y stays on motion so it does not fight the vertical centering.
  const headline = reduce
    ? { animate: { x: 0, y: "-50%" } }
    : {
        initial: { x: -200, y: "-50%" },
        animate: { x: isFront ? 0 : -200, y: "-50%" },
        transition: isFront ? { duration: 0.7, ease: "easeOut" as const } : { duration: 0 },
      };

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("bannerAria")}
      className="relative block h-[72px] w-full overflow-hidden rounded-[12px] text-left shadow-[0_-2px_8px_0_rgba(0,0,0,0.5)] transition-[filter] active:brightness-[1.03] sm:hidden"
      style={{ background: "linear-gradient(92deg, #AD46FF 16%, #682A99 82%)" }}
    >
      {/* The comp's soft-light star field across the whole card. Soft-light so
          it lifts the gradient rather than sitting on top as flat specks. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SPARKLES}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70 mix-blend-soft-light"
      />

      {/* The lilac glow the comp paints behind the audience to lift it off the
          purple. Screen blend, so it brightens rather than patching. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[10px] right-[114px] h-[77px] w-[84px] rounded-full bg-[#cfa4f2] opacity-80 mix-blend-screen blur-[18px]"
      />

      {/* The audience, taller than the card so it clips top and bottom exactly
          as the comp does, sitting just left of the wordmark column. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PHOTO}
        alt=""
        className="pointer-events-none absolute top-[-16px] right-[90px] h-[108px] w-[122px] rounded-[8px] object-cover object-[50%_28%]"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HEARTS}
        alt=""
        className="pointer-events-none absolute top-[48px] right-[100px] h-[16px] w-[16px] rotate-[-21deg]"
      />

      {/* The Square mark tumbling among the audience, with a soft color-dodge
          glow behind it so it reads as lit rather than pasted on, per the comp. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MARK}
        alt=""
        className="pointer-events-none absolute top-[12px] right-[172px] h-[16px] w-[22px] rotate-[153deg] mix-blend-color-dodge blur-[3px]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MARK}
        alt=""
        className="pointer-events-none absolute top-[12px] right-[172px] h-[16px] w-[22px] rotate-[153deg]"
      />

      {/* The recruiting headline: a light-lilac base with the two phrases the
          comp brightens, "your audience" and a larger "grow instantly". */}
      <motion.span className="absolute top-1/2 left-[16px] w-[182px] text-[#ddc4fa]" {...headline}>
        <span className="block font-sans text-[13.5px] leading-[15px] font-medium">
          {t.rich("bannerLine1", {
            hi: (c) => <span className="font-bold text-[#f8f2ff]">{c}</span>,
          })}
        </span>
        <span className="mt-[3px] block font-sans text-[13.5px] leading-[15px] font-medium">
          {t.rich("bannerLine2", {
            grow: (c) => <span className="text-[15.5px] font-semibold text-[#f7f0ff]">{c}</span>,
          })}
        </span>
      </motion.span>

      {/* The Market Square wordmark, top-right, at the comp's tiny scale: the
          mark, then the two-line name. It is a brand mark, not copy, so the
          name is not translated. */}
      <span className="absolute top-[13px] right-[10px] flex items-center gap-[4px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={WORDMARK_ICON} alt="" className="h-[19px] w-[26px] shrink-0" />
        <span className="leading-[1] text-white">
          <span className="block font-sans text-[9.5px] font-black">Market</span>
          <span className="block font-sans text-[9.5px] font-normal">Square</span>
        </span>
      </span>

      {/* The call to action, bottom-right, on the comp's near-black chip. */}
      <span className="absolute right-[12px] bottom-[10px] flex items-center gap-[2px] rounded-[6px] bg-[#151515] py-[4px] pr-[9px] pl-[10px]">
        <span className="font-sans text-[8.5px] font-semibold tracking-[0.02em] text-white uppercase">
          {t("bannerCta")}
        </span>
        <svg viewBox="0 0 5 6" aria-hidden fill="white" className="h-[6px] w-[5px] shrink-0">
          <path d="M0 0 L5 3 L0 6 Z" />
        </svg>
      </span>
    </Link>
  );
}
