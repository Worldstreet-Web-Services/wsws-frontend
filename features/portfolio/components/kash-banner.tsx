"use client";

import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { usePromoFront } from "@/components/ui/promo-deck";

// The designer's Kash+ coin, cut from the delivered artwork and sized for a
// 75px slot at 3x.
const COIN = "/kash/kash-plus-coin.png";

// The designer's bronze K mark, watermarked across the right of the card
// behind the button. Inline so it paints with the first frame and takes its
// color from the design's own bronze, not from the theme.
function KMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 202 120" fill="none" aria-hidden className={className}>
      <path
        d="M201.715 23.3799C115.343 47.145 88.1368 76.205 62.9023 94.1992V120.001H37.0293V83.0195C84.0484 49.0329 151.459 33.3885 201.715 23.3799ZM146.733 101.818L157.182 109.646L161.72 113.045L166.214 116.412L171.005 120.001H133.632L127.885 116.001L87.54 87.9248L108.438 73.1289L146.733 101.818ZM62.6484 11.4688V25.0371H101.685L88.3047 46.4443H62.6484V59.0742L36.9043 73.1289V0L62.6484 11.4688ZM28.7988 44.8545H0L12.7432 24.9756H28.7988V44.8545Z"
        fill="#AE6A04"
        fillOpacity="0.67"
      />
    </svg>
  );
}

// The full K mark from the mobile comp, bled off the top-left corner as a faint
// watermark. The outer <svg> box clips the artwork the way the design's own
// clip does; the group and fill opacities come straight from the delivered
// asset.
function KMarkCorner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 188.812 179.234" fill="none" aria-hidden className={className}>
      <g opacity="0.46">
        <path
          d="M303.512 34.9207C173.552 70.4168 132.616 113.821 94.6465 140.698V179.236H55.7164V124C126.464 73.2366 227.894 49.8698 303.512 34.9207ZM220.783 152.077L236.505 163.77L243.333 168.846L250.095 173.875L257.304 179.236H201.071L192.423 173.262L131.718 131.326L163.162 109.227L220.783 152.077ZM94.2644 17.13V37.3959H153.001L132.868 69.3702H94.2644V88.2345L55.5284 109.227V0L94.2644 17.13ZM43.3324 66.9956H0L19.1742 37.3041H43.3324V66.9956Z"
          fill="#AE6A04"
          fillOpacity="0.67"
        />
      </g>
    </svg>
  );
}

// The Kash promo banner as the mobile comp draws it (node 280:4397): a gold to
// amber card, the "buy now" pill on the left, two overlapping coins glowing in
// the centre, and the split headline on the right. Fixed to the comp's 60px
// height; children are placed by the comp's own proportions so the card holds
// its shape across phone widths. The whole card is the button.
function KashBannerMobile({ onBuy }: { onBuy: () => void }) {
  const t = useTranslations("kash");
  const isFront = usePromoFront();
  const reduce = useReducedMotion();

  // The comp flies the two coins in from the left and shifts the headline into
  // place as they land (nodes 280:4408/4418/4427). Tied to the deck: the
  // entrance replays each time this banner reaches the front, and rests
  // off-screen while it waits behind. Reduced motion holds everything still.
  const coins = reduce
    ? {}
    : {
        initial: { x: -200 },
        animate: { x: isFront ? 0 : -200 },
        transition: { duration: 0.6, ease: "easeOut" as const },
      };
  const headline = reduce
    ? { animate: { x: 0, y: "-50%" } }
    : {
        initial: { x: 45, y: "-50%" },
        animate: { x: isFront ? 0 : 45, y: "-50%" },
        transition: isFront
          ? { duration: 0.35, ease: "easeOut" as const, delay: 0.28 }
          : { duration: 0 },
      };

  return (
    <button
      onClick={onBuy}
      aria-label={t("bannerCta")}
      className="relative block h-[72px] w-full cursor-pointer overflow-hidden rounded-[8px] text-left shadow-[0_-1.913px_7.651px_0_rgba(0,0,0,0.5)] transition-[filter] active:brightness-[1.03] sm:hidden"
      style={{ background: "linear-gradient(90deg, #E9C631 0%, #F69F07 100%)" }}
    >
      <KMarkCorner className="pointer-events-none absolute top-[-79px] left-[-59px] h-[184px] w-[194px] rotate-[1.69deg]" />

      {/* The gold light the comp paints behind the coins to lift them off the
          gradient. Screen blend so it brightens the card rather than sitting on
          top as a flat patch. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-[21%] h-[98px] w-[42%] -translate-y-1/2 rounded-full bg-[#FDBC00] mix-blend-screen blur-[46px]"
      />

      {/* Two coins, overlapped and taller than the card so they clip top and
          bottom exactly as the comp does. They fly in from the left together. */}
      <motion.div className="pointer-events-none absolute inset-0" {...coins}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={COIN}
          alt=""
          width={84}
          height={84}
          className="absolute top-1/2 left-[27%] h-[94px] w-[94px] -translate-y-1/2 rotate-[0.49deg] drop-shadow-[0_13px_28px_rgba(90,50,0,0.35)]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={COIN}
          alt=""
          width={84}
          height={84}
          className="absolute top-1/2 left-[39.6%] h-[94px] w-[94px] -translate-y-1/2 rotate-[0.49deg] drop-shadow-[0_13px_28px_rgba(90,50,0,0.35)]"
        />
      </motion.div>

      {/* The split headline: a bold lead, then the rest of the sentence small.
          Both come from one translated string so every locale reads naturally;
          capitalize matches the comp's title casing. */}
      <motion.span
        className="absolute top-1/2 left-[66%] w-[32%] text-[#6C2B09] capitalize"
        {...headline}
      >
        <span className="block font-sans text-[21px] leading-none font-semibold tracking-[-0.02em]">
          {t("bannerLead")}
        </span>
        <span className="mt-1 block font-sans text-[11px] leading-[1.18] font-medium">
          {t("bannerTail")}
        </span>
      </motion.span>

      <span className="absolute top-1/2 left-[6.86%] flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-[#732801] py-[4px] pr-[11px] pl-[13px]">
        <span className="font-sans text-[10px] leading-none font-semibold tracking-[0.02em] text-white uppercase">
          {t("bannerCtaShort")}
        </span>
        <svg viewBox="0 0 5 6" aria-hidden fill="white" className="h-[7px] w-[6px] shrink-0">
          <path d="M0 0 L5 3 L0 6 Z" />
        </svg>
      </span>
    </button>
  );
}

// The Kash promo banner. The phone gets the mobile comp above; from `sm` up the
// original desktop treatment stands unchanged: a bronze-to-gold card, the coin
// on the left, a dark-brown headline over a white subline, the K mark fading in
// on the right, and a white pill for the call to action. The whole card is the
// button in both.
export function KashBanner({ onBuy }: { onBuy: () => void }) {
  const t = useTranslations("kash");

  return (
    <>
      <KashBannerMobile onBuy={onBuy} />

      <button
        onClick={onBuy}
        className="relative hidden w-full cursor-pointer overflow-hidden rounded-[11px] text-left transition-[filter] hover:brightness-[1.03] sm:block"
        style={{
          // The comp's gradient: bronze at the edges, the bright gold catching
          // near the left.
          background: "linear-gradient(94deg, #AC6803 0%, #F7D535 8%, #AD6803 100%)",
        }}
      >
        <KMark className="pointer-events-none absolute top-1/2 right-[6%] h-[150%] w-auto -translate-y-1/2 sm:right-[8%]" />

        <span className="relative flex items-center gap-3 px-3.5 py-2.5 sm:gap-5 sm:px-6 sm:py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={COIN}
            alt=""
            width={75}
            height={75}
            className="h-10 w-10 shrink-0 drop-shadow-[0_4px_10px_rgba(90,50,0,0.35)] sm:h-[75px] sm:w-[75px]"
          />
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-[13.5px] leading-[1.25] font-bold text-[#6C2B09] sm:text-[20px] sm:leading-tight">
              {t("bannerTitle")}
            </span>
            <span className="mt-1 hidden text-[13.5px] font-normal text-white sm:block">
              {t("bannerSub")}
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-[#F5F5F5] px-3 py-2 font-sans text-[11.5px] font-semibold whitespace-nowrap text-[#0A0A0A] shadow-[0_0_0_3px_rgba(255,255,255,0.2),0_2px_10px_rgba(120,80,0,0.25)] sm:px-5 sm:text-[14px]">
            {t("bannerCta")}
          </span>
        </span>
      </button>
    </>
  );
}
