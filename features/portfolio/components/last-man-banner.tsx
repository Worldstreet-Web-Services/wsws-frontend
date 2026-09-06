"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// The Last Man hourglass, cut from the delivered promo artwork.
const HOURGLASS = "/casino/last-man-hourglass.png";

// The Last Man promo as the mobile comp draws it (node 280:4733): a red card
// with two faint orange glow rings, the hourglass on the left, the pitch, and a
// dark "play now" pill. Fixed to the comp's 60px height with children placed by
// its proportions, so it holds shape at any width. Presentational: it rides
// behind the Kash+ banner as a stacked deck and takes no action of its own.
export function LastManBanner({ className }: { className?: string }) {
  const t = useTranslations("casino.lastStanding");

  return (
    <div
      className={cn(
        "relative h-[72px] w-full overflow-hidden rounded-[7px] bg-[#E41004]",
        className
      )}
    >
      {/* The two glow-ring clusters, straight from the comp's SVGs. */}
      <svg
        aria-hidden
        viewBox="0 0 322.814 322.814"
        fill="none"
        className="pointer-events-none absolute top-[-88%] left-[34%] h-[322px] w-[322px]"
      >
        <circle
          cx="160.616"
          cy="152.704"
          r="75.165"
          stroke="#FF620D"
          strokeWidth="41.1429"
          opacity="0.33"
        />
        <circle
          cx="161.407"
          cy="161.407"
          r="140.835"
          stroke="#FF620D"
          strokeWidth="41.1429"
          opacity="0.33"
        />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 186.028 186.028"
        fill="none"
        className="pointer-events-none absolute top-[-21%] left-[-3.6%] h-[186px] w-[186px]"
      >
        <circle
          cx="92.5582"
          cy="87.9986"
          r="43.3154"
          stroke="#FF620D"
          strokeWidth="23.7095"
          opacity="0.33"
        />
        <circle
          cx="93.0142"
          cy="93.0142"
          r="81.1594"
          stroke="#FF620D"
          strokeWidth="23.7095"
          opacity="0.33"
        />
      </svg>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HOURGLASS}
        alt=""
        width={40}
        height={68}
        className="pointer-events-none absolute top-1/2 left-[4%] h-[82px] w-[48px] -translate-y-1/2 rotate-[17.71deg] object-contain"
      />

      {/* The pitch. One translated string, so every locale reads naturally;
          capitalize matches the comp's title casing. */}
      <p className="absolute top-1/2 left-[19.2%] w-[48%] -translate-y-1/2 font-sans text-[12px] leading-[1.15] font-medium text-white capitalize">
        {t("starterPitchBody")}
      </p>

      <span
        className="absolute top-1/2 right-[6.4%] flex -translate-y-1/2 items-center gap-1.5 rounded-full py-[4px] pr-[12px] pl-[15px]"
        style={{ backgroundImage: "linear-gradient(118deg, #151515 7%, #7B7B7B 164%)" }}
      >
        <span className="font-sans text-[8.5px] leading-none font-semibold tracking-[0.02em] text-white uppercase">
          {t("playNow")}
        </span>
        <svg viewBox="0 0 5 6" aria-hidden fill="white" className="h-[6px] w-[5px] shrink-0">
          <path d="M0 0 L5 3 L0 6 Z" />
        </svg>
      </span>
    </div>
  );
}
