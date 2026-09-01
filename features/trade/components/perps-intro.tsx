"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

// How long each slide holds before the deck advances itself, per the comp's
// two-to-three-second cadence.
const ADVANCE_MS = 2600;

// Slide 1 hero: the chrome queen (node 216:15991, image 11). The comp anchors
// the crown just under the pitch and lets the piece grow downward past the
// wordmark, its base dissolving into the page. The piece is far taller than it
// is wide, so it is masked at the base rather than shrunk: shrinking it to fit
// the column is what read as "zoomed out"; here the whole upper piece stays at
// the comp's size and only the base fades.
function QueenHero() {
  const reduce = useReducedMotion();

  // The comp grows image 11 from 228x570 to 278x695 over the first quarter of a
  // two-second beat, then holds. Reproduced as a scale from the same ratio
  // (228/278 = 0.82) about the crown, so the top stays put as it swells.
  const grow = reduce
    ? {}
    : {
        initial: { scale: 0.82 },
        animate: { scale: [0.82, 1, 1] },
        transition: { duration: 2, times: [0, 0.25, 1], ease: "easeOut" as const },
      };

  return (
    <div className="pointer-events-none relative flex min-h-0 flex-1 items-start justify-center overflow-hidden">
      <motion.div className="origin-top" {...grow}>
        <Image
          src="/perps/perps-queen.png"
          alt=""
          width={278}
          height={695}
          priority
          className="h-auto w-[clamp(220px,62vw,272px)] rotate-[-9.37deg] object-contain mask-[linear-gradient(to_bottom,#000_58%,transparent_88%)]"
        />
      </motion.div>
    </div>
  );
}

// Slide 2 hero: two chrome coins over a soft metallic glow (node 216:16054).
// The exact export places one coin flipped in the top-left and a second,
// horizontally-mirrored, lower-right in a 324×313 box — reproduced here with the
// designer's own transform matrices so the pair sits pixel-for-pixel as drawn.
// The radial wash behind is the background glow the comp shows.
const COIN = "/perps/perps-coins.png";

function CoinsHero() {
  const reduce = useReducedMotion();

  // The comp slides the pair in from opposite sides and lets them converge
  // (nodes 216:16051/16052): the top-left coin drifts left from +36, the
  // lower-right one right from -36, easing to rest then holding. Animated on a
  // wrapper <g> so each coin keeps its own resting matrix underneath.
  const slide = (from: number) => ({
    initial: reduce ? false : { x: from },
    animate: { x: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.64, ease: "easeOut" as const },
  });

  return (
    <div className="pointer-events-none flex min-h-0 flex-1 items-center justify-center">
      <div className="relative w-full max-w-[300px]">
        {/* The exact background glow, exported from the comp (node 216:16053):
            a soft metallic wash. Screen-blended so its baked black drops out,
            and radially masked so the image's rectangle dissolves — the glow
            fades into the page with no visible edge, just haze around the pair. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/perps/perps-glow.png"
          alt=""
          className="absolute top-1/2 left-1/2 w-[150%] max-w-none -translate-x-1/2 -translate-y-1/2 mix-blend-screen mask-[radial-gradient(ellipse_52%_48%_at_50%_50%,#000_26%,transparent_66%)]"
        />
        <svg
          viewBox="0 0 324 313"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative block w-full drop-shadow-[0_10px_22px_rgba(0,0,0,0.6)]"
        >
          <motion.g {...slide(36)}>
            <image
              href={COIN}
              width="233.204"
              height="237.091"
              preserveAspectRatio="none"
              transform="matrix(1 0 0 -1 0 237.091)"
            />
          </motion.g>
          <motion.g {...slide(-36)}>
            <image
              href={COIN}
              width="233.204"
              height="237.091"
              preserveAspectRatio="none"
              transform="matrix(-1 0 0 1 323.669 75.6597)"
            />
          </motion.g>
        </svg>
      </div>
    </div>
  );
}

// Slide 3 hero: the chrome rocket (node 216:16057, image 12). The comp launches
// it up into place and swells it. Reproduced as a rise-and-grow entrance, then a
// slow hover so the rocket keeps a little life on the final slide, where the deck
// stops and holds. Base dissolves into the page like the queen.
function RocketHero() {
  const reduce = useReducedMotion();

  // The comp rises image 12 from y+200 and grows it ~19% over the first beat,
  // then holds and loops. Scaled to the shorter column here, and the loop is a
  // gentle hover rather than the comp's hard restart, which reads as a stutter.
  const launch = reduce
    ? {}
    : {
        initial: { scale: 0.84, y: 90 },
        animate: { scale: 1, y: 0 },
        transition: { duration: 0.9, ease: "easeOut" as const },
      };
  const hover = reduce
    ? {}
    : {
        animate: { y: [0, -8, 0] },
        transition: { duration: 3.6, ease: "easeInOut" as const, repeat: Infinity, delay: 0.9 },
      };

  return (
    <div className="pointer-events-none relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <motion.div {...launch}>
        <motion.div {...hover}>
          <Image
            src="/perps/perps-rocket.png"
            alt=""
            width={309}
            height={518}
            priority
            className="h-auto w-[clamp(230px,64vw,290px)] object-contain mask-[linear-gradient(to_bottom,#000_80%,transparent)]"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

interface Slide {
  id: string;
  title: string;
  // One entry per line; a single entry simply wraps.
  body?: string[];
  // Numbered steps, rendered with a bold leading number (slide 3).
  steps?: string[];
  Hero: () => React.ReactElement;
  // The oversized wordmark under the art, where a slide has one.
  wordmark?: string;
  primaryLabel: string;
}

// The onboarding deck. The progress bar, auto-advance, and final-slide handling
// all read off this list, so a slide is added by adding an entry.
const SLIDES: Slide[] = [
  {
    id: "intro",
    title: "Introducing Perps",
    body: [
      "Trade like a pro. Stay in control.",
      "Access 100+ markets. Go long or short.",
      "Up to 100x leverage.",
    ],
    Hero: QueenHero,
    wordmark: "100x Perps",
    primaryLabel: "Learn More",
  },
  {
    id: "what",
    title: "What are Perps?",
    body: [
      "Perpetuals are futures-style markets that let you trade price movements without owning the asset. You can profit from both ups and downs with no expiry date.",
    ],
    Hero: CoinsHero,
    primaryLabel: "Next",
  },
  {
    id: "start",
    title: "Start trading in minutes",
    steps: [
      "Deposit stablecoins or supported tokens (like $USDT, $BNB, or $TWT).",
      "Choose a market – BTC, ETH, or any of 100+ pairs.",
      "Set your leverage and open your position.",
    ],
    Hero: RocketHero,
    primaryLabel: "Next",
  },
];

/**
 * The Perps launch deck, as the mobile comps draw it (nodes 216:15991,
 * 216:16021): a self-advancing set of splash slides on #0f0f0f — progress bar,
 * pitch, a chrome hero, and Next / Skip. It auto-steps every couple of seconds
 * and stops on the last slide, where the primary button is the way in.
 *
 * Shown as the market tab's Perps screen until the trading surface itself ships.
 */
export function PerpsIntro({
  onLearnMore,
  onSkip,
}: {
  // Fired when the deck is done — the primary button on the final slide is the
  // way into Perps.
  onLearnMore?: () => void;
  onSkip?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  // Auto-advance until the last slide, then hold. Anyone on reduced motion steps
  // through with the buttons instead.
  useEffect(() => {
    if (isLast) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setIndex((i) => i + 1), ADVANCE_MS);
    return () => clearTimeout(id);
  }, [index, isLast]);

  const onPrimary = () => (isLast ? onLearnMore?.() : setIndex((i) => i + 1));

  return (
    <div className="fixed inset-0 z-[100] flex justify-center overflow-hidden bg-[#0f0f0f]">
      {/* One viewport, no scroll: the hero (flex-1, min-h-0) soaks up the slack
          so Skip always lands on the bottom edge. Fixed over the shell chrome,
          as the comp draws it — full bleed, no tab bar under the buttons. */}
      <div className="flex h-full w-full max-w-md flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      {/* Slide progress: the current segment stretched, the rest short stubs. */}
      <div className="flex items-center gap-1">
        {SLIDES.map((s, i) => (
          <span
            key={s.id}
            className={`h-[3px] rounded-full transition-all duration-300 ${
              i === index ? "w-7 bg-white" : "w-2.5 bg-white/45"
            }`}
          />
        ))}
      </div>

      <div className="mt-10">
        <h1 className="ws-display text-[26px] text-white">{slide.title}</h1>
        {slide.body ? (
          <p className="mt-2.5 text-[14px] leading-[1.45] font-normal text-white/65">
            {slide.body.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        ) : null}
        {slide.steps ? (
          // The comp's numbered list: a bold ordinal, then the step, one per row.
          <div className="mt-3 flex flex-col gap-2.5 text-[13px] leading-[1.45] font-normal text-white/65">
            {slide.steps.map((step, i) => (
              <p key={i}>
                <span className="font-bold">{i + 1}. </span>
                {step}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <slide.Hero />

      {slide.wordmark ? (
        // The comp rides the wordmark up over the piece's dissolving base, so it
        // reads as one column of chrome. z-10 keeps it above the art.
        <p className="ws-display relative z-10 -mt-6 text-center text-[clamp(38px,13vw,52px)] leading-none tracking-[-0.01em] text-white uppercase">
          {slide.wordmark}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-3.5">
        <button
          type="button"
          onClick={onPrimary}
          className="ws-chrome cursor-pointer rounded-full bg-white py-3.5 text-center font-sans text-[14.5px] font-semibold text-[#757575] transition-opacity hover:opacity-90"
        >
          {slide.primaryLabel}
        </button>
        {/* The comp drops Skip on the final slide, where the primary button is
            the only way on. */}
        {isLast ? null : (
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer rounded-full border border-white/14 bg-white/6 py-3.5 text-center font-sans text-[14.5px] font-semibold text-[#757575] transition-colors hover:bg-white/10"
          >
            Skip
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
