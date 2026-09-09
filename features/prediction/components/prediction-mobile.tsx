"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMoney } from "@/components/ui/currency-select";
import { predictionDetailHref } from "@/features/prediction/gamma-category";
import { usePredictions } from "@/features/prediction/hooks/use-predictions";
import { useRotatingIndex } from "@/hooks/use-rotating-index";
import type { Prediction } from "@/lib/types";

// One market every ten seconds, the cadence the discovery surfaces share.
const ROTATE_MS = 10_000;

/**
 * Whether the reader asked their system to cut animation. Read through an effect
 * so the server and the first client paint agree. matchMedia is missing in
 * jsdom, so its absence is treated as "no preference stated".
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * The prediction card, drawn from the exact Figma export (card-bg.svg). The SVG
 * carries the whole illustration: the yellow ground, the rays and clouds, the
 * photo frames and the Predict button. Three text nodes and the two photos are
 * placeholders the design shipped, and this component patches them with the live
 * market so the art stays the designer's and only the data is ours:
 *   pred-title / pred-title-2 — the question, wrapped over two lines
 *   pred-subtitle             — the Yes price and the volume (in the reader's currency)
 *   pred-tag                  — the countdown, or the category when there is no close time
 *   the two photo fills        — the market's artwork
 *
 * Patching over <object> rather than recreating the card in code keeps it
 * pixel-identical to the comp and out of a 300-line reimplementation.
 */
function PredictionMobileCard({
  prediction,
  chipText,
  volume,
}: {
  prediction: Prediction;
  /** The countdown, or the category, already chosen by the caller. */
  chipText: string;
  /** Volume in the reader's currency, or null when the feed states none. */
  volume: string | null;
}) {
  const ref = useRef<HTMLObjectElement>(null);
  // Holds the latest data so `patch` can stay stable and still read the current
  // values. Written in the effect below, never during render.
  const dataRef = useRef({ prediction, chipText, volume });

  // Patch the SVG text and photos. Stable, reads from the ref, so it can be the
  // <object>'s onLoad handler and be called again whenever the data changes.
  const patch = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    const { prediction: p, chipText: chip, volume: vol } = dataRef.current;

    const set = (id: string, text: string) => {
      const el = doc.getElementById(id);
      if (el) el.textContent = text;
    };

    const q = p.q;
    const mid = q.lastIndexOf(" ", 28);
    if (mid > 0 && q.length > 28) {
      set("pred-title", q.slice(0, mid));
      set("pred-title-2", q.slice(mid + 1));
    } else {
      set("pred-title", q);
      set("pred-title-2", "");
    }

    set("pred-subtitle", vol ? `${p.yes} Yes · ${vol}` : `${p.yes} Yes`);
    set("pred-tag", chip);

    if (p.image) {
      const setHref = (id: string) => {
        const el = doc.getElementById(id);
        if (!el) return;
        el.setAttribute("href", p.image!);
        el.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", p.image!);
        // Force the pattern to repaint: an href change inside a <pattern> often
        // does not re-render on its own, so swap the element for a clone (which
        // already carries the new href) to make the engine re-read it.
        el.replaceWith(el.cloneNode(true));
      };
      setHref("image0_1_5692");
      setHref("image1_1_5692");
    }
  }, []); // stable — reads from the ref

  // Repatch whenever the market, its countdown, or its volume changes. The
  // countdown ticks every second, so this is what keeps the clock live.
  useEffect(() => {
    dataRef.current = { prediction, chipText, volume };
    patch();
  }, [prediction, chipText, volume, patch]);

  return (
    <object
      ref={ref}
      data="/prediction/card-bg.svg"
      type="image/svg+xml"
      aria-label={prediction.q}
      onLoad={patch}
      // pointer-events-none: the SVG carries its own <a href> ("Predict"), and
      // because <object> is a nested browsing context, a click inside it would
      // load the whole app INTO the card. Killing pointer events lets the
      // wrapping Link take the tap and navigate the main window instead.
      className="pointer-events-none block aspect-[330/213] w-full overflow-hidden rounded-[15px]"
    />
  );
}

/** A yellow card-shaped frame for the states that have no market to draw. */
function CardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid aspect-[330/213] w-full place-items-center overflow-hidden rounded-[15px] bg-gradient-to-b from-[#FEE685] to-[#FFD425] p-[8%] text-center">
      {children}
    </div>
  );
}

export function PredictionMobile() {
  const t = useTranslations("prediction");
  const money = useMoney();
  const { data, isPending, isError, refetch } = usePredictions();
  const predictions = data ?? [];

  // Hover, focus, and a finger on the card hold the rotation; reduced motion
  // stops it outright. Both are pause mechanisms that need no visible control,
  // so the card stays the clean comp it is drawn as.
  const [held, setHeld] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const index = useRotatingIndex(predictions.length, {
    intervalMs: ROTATE_MS,
    paused: held || reducedMotion,
  });
  const current = predictions[index];

  // The chip shows the market's own category, as the comp draws it. Deliberately
  // not a countdown: a live clock can read "Market closed", which is not what
  // the card is meant to say.
  const chipText = current?.tag ?? "";
  // Converted once, here, through the app's money layer, so the figure agrees
  // with every other amount on the phone and the card never touches a rate.
  const volume = current?.volumeUsd != null ? money.format(current.volumeUsd) : null;

  return (
    <div className="w-full p-4">
      <Link href="/prediction" className="inline-flex items-end gap-[3px]">
        <span className="ws-display text-[18px] leading-[1.2] tracking-[-0.36px] text-white">
          {t("mobileHeading")} <span className="text-[#FFD62F]">{t("mobileHeadingAccent")}</span>{" "}
          {t("mobileHeadingSuffix")}
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

      {/* A swipe carousel of distinct prediction cards, as the Market design
          draws it: the rotating live market, then the illustrated promo card.
          Each slide is just under full width so the next one peeks, signalling
          there is more to swipe to. Native scroll-snap, so each heavy card
          renders once (no carousel clones). */}
      <div className="mt-3 flex snap-x snap-mandatory [scrollbar-width:none] gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {/* Hover, focus, and a finger on the card all hold the rotation. Without
            that, a market can swap under a pointer already on its way down and
            open a market the reader never chose. */}
        <div
          className="w-[88%] shrink-0 snap-start"
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onPointerDown={() => setHeld(true)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
        >
          {isError ? (
            <CardFrame>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[12px] font-semibold text-[#0B0A0A]">
                  {t("mobileMarketsError")}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="ws-pressable cursor-pointer rounded-full bg-[#0B0A0A] px-3 py-[6px] text-[10px] font-semibold text-[#FFD425]"
                >
                  {t("refresh")}
                </button>
              </div>
            </CardFrame>
          ) : isPending ? (
            <CardFrame>
              <div className="flex w-full flex-col gap-3" role="status" aria-live="polite">
                <span className="sr-only">{t("loading")}</span>
                <div className="h-4 w-20 animate-pulse rounded-full bg-black/10" />
                <div className="h-3 w-4/5 animate-pulse rounded-full bg-black/10" />
                <div className="h-3 w-3/5 animate-pulse rounded-full bg-black/10" />
              </div>
            </CardFrame>
          ) : current ? (
            <Link
              href={predictionDetailHref(current) ?? "/prediction"}
              aria-label={current.q}
              className="ws-pressable block"
            >
              <PredictionMobileCard
                // Remounting per market resets the SVG's patched state, so one
                // market's artwork never lingers on the next market's frame.
                key={current.q}
                prediction={current}
                chipText={chipText}
                volume={volume}
              />
            </Link>
          ) : (
            <CardFrame>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[12px] font-semibold text-[#0B0A0A]">{t("mobileNoMarkets")}</p>
                <Link
                  href="/prediction"
                  className="ws-pressable rounded-full bg-[#0B0A0A] px-3 py-[6px] text-[10px] font-semibold text-[#FFD425]"
                >
                  {t("exploreAllMarkets")}
                </Link>
              </div>
            </CardFrame>
          )}
        </div>

        {/* The boxing card is a wider export than the market card, so it sits in
            the same aspect box and fills it: the slides stay one height and the
            carousel does not jump as it swipes. */}
        <Link
          href="/prediction"
          aria-label={t("beltCardAria")}
          className="ws-pressable aspect-[330/213] w-[88%] shrink-0 snap-start overflow-hidden rounded-[15px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prediction/boxing-card.png" alt="" className="h-full w-full object-cover" />
        </Link>
      </div>
    </div>
  );
}
