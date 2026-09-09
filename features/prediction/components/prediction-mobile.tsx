"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePredictions } from "@/features/prediction/hooks/use-predictions";
import { useRotatingIndex } from "@/hooks/use-rotating-index";
import type { Prediction } from "@/lib/types";

// One market every ten seconds, the cadence the discovery surfaces share.
const ROTATE_MS = 10_000;

/**
 * Whether the reader asked their system to cut animation.
 *
 * Read through an effect rather than during render so the server and the first
 * client paint agree. `matchMedia` is missing in jsdom, so its absence is
 * treated as "no preference stated", which is what a browser without the query
 * reports anyway.
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
 * The card's yellow treatment, and nothing else.
 *
 * The gradient is the design's own (#FEE685 to #FFD425) and the rays and clouds
 * are the artwork-only exports beside it. Every word on the card is DOM drawn on
 * top of this, so a market question, a price, or a volume never lives in an
 * asset.
 */
function BannerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative aspect-[330/213] w-full overflow-hidden rounded-[15px] bg-gradient-to-b from-[#FEE685] to-[#FFD425]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/prediction/sunburst-yellow.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/prediction/cloud-large.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-[9%] left-[41%] w-[22%]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/prediction/cloud-small.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-[26%] left-[30%] w-[13%]"
      />
      {children}
    </div>
  );
}

interface PauseControlProps {
  paused: boolean;
  onToggle: () => void;
}

/**
 * The stop control WCAG 2.2.2 requires of content that starts moving on its own
 * and runs past five seconds. Hover and focus hold the rotation too, but neither
 * is available to a touch reader, so the button is the mechanism that always is.
 */
function PauseControl({ paused, onToggle }: PauseControlProps) {
  const t = useTranslations("prediction");

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={paused}
      aria-label={paused ? t("mobileResumeRotation") : t("mobilePauseRotation")}
      className="ws-pressable relative z-[1] grid size-6 shrink-0 cursor-pointer place-items-center rounded-full bg-black/10 text-[#0B0A0A] hover:bg-black/20"
    >
      <svg viewBox="0 0 12 12" aria-hidden className="size-3" fill="currentColor">
        {paused ? <path d="M3 1.5l7 4.5-7 4.5z" /> : <path d="M3 2h2.2v8H3zm3.8 0H9v8H6.8z" />}
      </svg>
    </button>
  );
}

interface PredictionBannerProps {
  prediction: Prediction;
  paused: boolean;
  onTogglePause: () => void;
  /** Hidden when there is only one market, since nothing is rotating. */
  showPauseControl: boolean;
}

/**
 * One market, drawn as the design's yellow banner.
 *
 * Everything the reader sees comes from the market being shown: the category,
 * the question, the Yes price, the volume, and the artwork. The prices arrive
 * from the feed already formatted for display, and nothing here does arithmetic
 * on them.
 */
function PredictionBanner({
  prediction: p,
  paused,
  onTogglePause,
  showPauseControl,
}: PredictionBannerProps) {
  const t = useTranslations("prediction");
  const [artworkFailed, setArtworkFailed] = useState(false);
  // A Polymarket card has no page of its own on this build; the banner opens
  // the prediction desk, where the same market can be bet on.
  const href = "/prediction";

  return (
    <BannerFrame>
      <div className="relative flex h-full items-stretch gap-2 p-[5%]">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="inline-flex max-w-[60%] items-center gap-1 truncate rounded-full bg-black/10 px-2 py-[3px] text-[9px] font-semibold tracking-[0.62px] text-[#0B0A0A] uppercase">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/prediction/coins-icon.svg" alt="" aria-hidden className="size-3" />
              <span className="truncate">{p.tag}</span>
            </span>
            {showPauseControl ? <PauseControl paused={paused} onToggle={onTogglePause} /> : null}
          </div>

          {/* The question is the link text, so a screen reader hears which
              market this opens rather than "card". The stretched pseudo-element
              hands the rest of the banner to the same link, and the controls
              below sit above it with their own clicks. */}
          <h3 className="ws-chewy mt-[6%] line-clamp-3 text-[13px] leading-[1.25] text-[#252525]">
            <Link
              href={href}
              className="rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:ring-2 focus-visible:ring-[#0B0A0A]"
            >
              {p.q}
            </Link>
          </h3>

          <p className="tnum mt-auto flex items-center gap-3 text-[10px] font-semibold text-[#0B0A0A]">
            <span className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/prediction/icon-trades.svg" alt="" aria-hidden className="size-[11px]" />
              {p.yes} {t("yesLabel")}
            </span>
            {p.vol ? (
              <span className="flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/prediction/icon-volume.svg" alt="" aria-hidden className="size-[11px]" />
                {p.vol}
              </span>
            ) : null}
          </p>

          <div className="relative z-[1] mt-[4%] flex items-center gap-2">
            <Link
              href={href}
              className="ws-pressable rounded-full bg-[#0B0A0A] px-3 py-[6px] text-[10px] font-semibold text-[#FFD425]"
            >
              {t("mobilePredictNow")}
            </Link>
          </div>
        </div>

        {/* The market's own artwork. The feed carries a single image per market,
            served from a provider-controlled host, so it renders through a plain
            img: next/image would reject a host that is not in the allowlist. */}
        <div className="relative w-[30%] shrink-0 rotate-[5deg] self-center overflow-hidden rounded-[10px] border-2 border-white/70 bg-black/10 shadow-[0_4px_10px_rgba(0,0,0,0.15)]">
          <div className="aspect-square w-full">
            {p.image && !artworkFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.image}
                alt=""
                loading="lazy"
                onError={() => setArtworkFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              // No artwork on this market, so the frame keeps the design's
              // shape with a decorative mark instead of another market's photo.
              <div className="grid h-full w-full place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/prediction/coins-icon.svg"
                  alt=""
                  aria-hidden
                  className="w-1/2 opacity-60"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </BannerFrame>
  );
}

/** The banner's shape while the markets are still in flight. */
function BannerSkeleton() {
  const t = useTranslations("prediction");

  return (
    <BannerFrame>
      <div className="flex h-full flex-col gap-3 p-[5%]" role="status" aria-live="polite">
        <span className="sr-only">{t("loading")}</span>
        <div className="h-4 w-20 animate-pulse rounded-full bg-black/10" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-black/10" />
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-black/10" />
        <div className="mt-auto h-6 w-28 animate-pulse rounded-full bg-black/10" />
      </div>
    </BannerFrame>
  );
}

interface BannerMessageProps {
  message: string;
  action?: ReactNode;
}

/** The banner with no market to show: an error, or an empty feed. */
function BannerMessage({ message, action }: BannerMessageProps) {
  return (
    <BannerFrame>
      <div className="relative flex h-full flex-col items-center justify-center gap-3 p-[8%] text-center">
        <p className="text-[12px] font-semibold text-[#0B0A0A]">{message}</p>
        {action}
      </div>
    </BannerFrame>
  );
}

export function PredictionMobile() {
  const t = useTranslations("prediction");
  const { data, isPending, isError, refetch } = usePredictions();
  const markets = data ?? [];

  // Two separate holds, because they answer to different people. `pausedByUser`
  // is the explicit button and stays where the reader put it. `held` is hover,
  // focus, and touch, and releases itself. Reduced motion stops the rotation
  // outright.
  const [pausedByUser, setPausedByUser] = useState(false);
  const [held, setHeld] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const index = useRotatingIndex(markets.length, {
    intervalMs: ROTATE_MS,
    paused: pausedByUser || held || reducedMotion,
  });
  const current = markets[index];

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
          there is more to swipe to. Native scroll-snap, so each card renders
          once (no carousel clones). */}
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
            <BannerMessage
              message={t("mobileMarketsError")}
              action={
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="ws-pressable cursor-pointer rounded-full bg-[#0B0A0A] px-3 py-[6px] text-[10px] font-semibold text-[#FFD425]"
                >
                  {t("refresh")}
                </button>
              }
            />
          ) : isPending ? (
            <BannerSkeleton />
          ) : current ? (
            <PredictionBanner
              // Remounting per market resets the artwork's error state, so one
              // market's broken image does not blank the next market's frame.
              key={current.q}
              prediction={current}
              paused={pausedByUser}
              onTogglePause={() => setPausedByUser((was) => !was)}
              showPauseControl={markets.length > 1 && !reducedMotion}
            />
          ) : (
            <BannerMessage
              message={t("mobileNoMarkets")}
              action={
                <Link
                  href="/prediction"
                  className="ws-pressable rounded-full bg-[#0B0A0A] px-3 py-[6px] text-[10px] font-semibold text-[#FFD425]"
                >
                  {t("exploreAllMarkets")}
                </Link>
              }
            />
          )}
        </div>

        {/* The boxing card is a wider export than the market banner, so it sits
            in the same aspect box and fills it: the slides stay one height and
            the carousel does not jump as it swipes. */}
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
