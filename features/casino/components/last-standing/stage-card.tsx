"use client";

import { useSyncExternalStore, type JSX, type ReactNode, type Ref } from "react";
import { motion } from "motion/react";
import { PlayerAvatar } from "@/features/casino/components/last-standing/player-avatar";
import { cn } from "@/lib/utils";

/**
 * The big left "stage" card on the Last Man Standing game screen.
 *
 * Presentational only: every string, figure and image arrives as a prop, so
 * the card renders the same in a story, a test and the live screen. It holds
 * no clock — the caller formats `countdown` and recomputes `progress`, and the
 * card only draws them. The Figma rebrand draws four states out of one frame
 * (node 844:78328 and its siblings), which is why the phases share a single
 * component rather than four near-copies.
 */
export type StagePhase = "notStarted" | "live" | "ended" | "won";

export interface StageLeader {
  label: string;
  value: string;
  isYou: boolean;
  avatarUrl: string | null;
  seed: string;
}

export interface StageChip {
  label: string;
  tone: "filled" | "outline";
}

export interface StageTile {
  label: string;
  value: string;
}

export interface StageCardProps {
  phase: StagePhase;
  /** Already formatted, e.g. "Rounds #59". */
  roundLabel: string;
  /** live only — already formatted, e.g. "00:24". */
  countdown?: string;
  /** live only — 0..1 remaining, drives the ring. */
  progress?: number;
  /** The line under the centre column. */
  caption: string;
  /** ended / won heading. */
  heading?: string;
  /** ended / won sub line. */
  subheading?: string;
  leader: StageLeader | null;
  chip?: StageChip | null;
  /** e.g. { label: "Total Pot", value: "$20" }. */
  pot?: StageTile | null;
  /** The gold tile, e.g. { label: "Winner's Share", value: "$10" }. */
  winnerShare?: StageTile | null;
  /** A handle on the pot tile, for a caller that animates something into it.
   *  The wager's coin flight needs the pot's viewport box, and the pot is drawn
   *  here rather than by the caller, so the box is only reachable this way. */
  potRef?: Ref<HTMLDivElement>;
  /** Connection lost: dim the clock and its ring, and add nothing else — the
   *  caller owns the banner that explains why. */
  frozen?: boolean;
  /** Overlay slot, drawn over the stage for the states the caller still owns. */
  children?: ReactNode;
}

const ASSET_ROOT = "/casino/last-standing";

// Exported from Figma rather than drawn here: these are rendered 3D glyphs, not
// icons that could be reproduced from path data.
const GLYPH: Record<StagePhase, { src: string; size: number }> = {
  notStarted: { src: `${ASSET_ROOT}/glyph-play.png`, size: 56 },
  live: { src: `${ASSET_ROOT}/glyph-hourglass.png`, size: 56 },
  ended: { src: `${ASSET_ROOT}/glyph-flag.png`, size: 132 },
  won: { src: `${ASSET_ROOT}/glyph-crown.png`, size: 118 },
};

// The ring's geometry, straight off the design's Ellipse 1826/1827 pair: a
// 222.268px box with an 11.1134px stroke, so the stroked circle's radius is
// half the box less half the stroke.
const RING_BOX = 222.268;
const RING_STROKE = 11.1134;
const RING_RADIUS = (RING_BOX - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_TRACK = "#2A2B2B";
const RING_ARC = "#D4B32D";

// The placeholder the design shows before a round starts, in place of a clock.
const CLOCK_PLACEHOLDER = "—:—";

const CLOCK_GRADIENT = "linear-gradient(180deg, #ffffff 0%, #c4c4c4 100%)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(REDUCED_MOTION_QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function reducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Read live rather than through motion's own useReducedMotion, which settles
 * the preference once per process. That is right in a browser, where the
 * setting rarely flips, but it pins the value across a whole test file and
 * made the static-arc case unassertable.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, reducedMotionSnapshot, () => false);
}

function clampProgress(progress: number | undefined): number {
  if (progress == null || Number.isNaN(progress)) return 1;
  return Math.min(1, Math.max(0, progress));
}

function LeaderAvatar({ leader }: { leader: StageLeader }) {
  return (
    <span data-testid="stage-avatar" className="block shrink-0">
      {/* Decoration beside the address it belongs to, which is already read
          out, so it carries no alt of its own. */}
      <PlayerAvatar src={leader.avatarUrl} seed={leader.seed} size={36} alt="" />
    </span>
  );
}

function LeaderChip({ chip }: { chip: StageChip }) {
  const filled = chip.tone === "filled";

  return (
    <span
      data-testid="stage-chip"
      data-tone={chip.tone}
      className={cn(
        "inline-flex shrink-0 items-center gap-[6.5px] rounded-full border px-[19.6px] py-[8.2px] text-[11.5px] leading-[13px] font-bold",
        filled
          ? "border-[#1b1b1c] bg-[#f7a92f] text-[#1b1b1c]"
          : "border-white/70 bg-[#333333] text-[#f4f4f4]"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ASSET_ROOT}/chip-crown-${filled ? "filled" : "outline"}.svg`}
        alt=""
        aria-hidden="true"
        width={14}
        height={15}
        className="block h-[15px] w-[14px] shrink-0"
      />
      {chip.label}
    </span>
  );
}

function StatTile({
  tile,
  tone,
  testId,
  tileRef,
}: {
  tile: StageTile;
  tone: "dark" | "gold";
  testId: string;
  tileRef?: Ref<HTMLDivElement>;
}) {
  const gold = tone === "gold";

  return (
    <div
      ref={tileRef}
      data-testid={testId}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-[15px] border p-[15px]",
        gold
          ? "border-white/30 bg-[linear-gradient(180deg,rgba(255,243,199,0.5)_0%,rgba(255,225,120,0.5)_100%)]"
          : "border-white/20 bg-[linear-gradient(180deg,rgba(255,243,199,0.24)_0%,rgba(255,225,120,0.24)_100%)]"
      )}
    >
      <span className="flex items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ASSET_ROOT}/${gold ? "tile-share.svg" : "tile-pot.png"}`}
          alt=""
          aria-hidden="true"
          width={gold ? 20 : 21}
          height={20}
          className={cn("block h-5 shrink-0", gold ? "w-5" : "w-[21px]")}
        />
        <span className="ws-display truncate text-[11px] font-bold tracking-[-0.01em] text-white">
          {tile.label}
        </span>
      </span>
      <span
        className={cn(
          "ws-display tnum truncate text-[28px] leading-none font-extrabold tracking-[-1.08px] @[560px]:text-[36px]",
          gold ? "text-white" : "text-[#ffe178]"
        )}
      >
        {tile.value}
      </span>
    </div>
  );
}

function CountdownRing({
  progress,
  animated,
}: {
  /** Already clamped to 0..1. */
  progress: number;
  animated: boolean;
}) {
  // The arc is drawn by hiding part of a full circle: a dash as long as the
  // circumference, pushed back by the share of time already spent.
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  const shared = {
    cx: RING_BOX / 2,
    cy: RING_BOX / 2,
    r: RING_RADIUS,
    fill: "none",
    stroke: RING_ARC,
    strokeWidth: RING_STROKE,
    strokeLinecap: "round" as const,
    strokeDasharray: RING_CIRCUMFERENCE,
    "data-testid": "stage-ring-arc",
    "data-circumference": RING_CIRCUMFERENCE,
    "data-offset": offset,
    "data-animated": String(animated),
  };

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
      className="absolute inset-0 size-full -rotate-90"
    >
      <circle
        data-testid="stage-ring-track"
        cx={RING_BOX / 2}
        cy={RING_BOX / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={RING_TRACK}
        strokeWidth={RING_STROKE}
      />
      {animated ? (
        <motion.circle
          {...shared}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      ) : (
        // Reduced motion keeps the arc — it is information, not decoration —
        // and drops only the sweep between one value and the next.
        <circle {...shared} strokeDashoffset={offset} />
      )}
    </svg>
  );
}

export function StageCard({
  phase,
  roundLabel,
  countdown,
  progress,
  caption,
  heading,
  subheading,
  leader,
  chip,
  pot,
  winnerShare,
  potRef,
  frozen = false,
  children,
}: StageCardProps): JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const glyph = GLYPH[phase];
  // The clock and its ring belong to the two phases where a round has not been
  // decided yet; ended and won show a glyph and a heading instead.
  const showsClock = phase === "notStarted" || phase === "live";
  const tiles = (pot ?? winnerShare) ? { pot, winnerShare } : null;

  return (
    <section
      data-testid="stage-card"
      data-phase={phase}
      className="@container relative isolate flex min-h-[372px] w-full flex-col overflow-hidden rounded-[15px] bg-[#121314] p-3"
    >
      {/* The spotlight artwork, exported whole from the design rather than
          rebuilt out of its forty vector layers. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/casino/last-standing/stage-backdrop.png')] bg-cover bg-top bg-no-repeat opacity-50"
      />
      {/* The soft glow the design floats behind the centre column. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[216px] w-[368px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,237,211,0.22),transparent)] blur-[60px]"
      />

      <p className="relative px-[17px] pt-[10px] text-[14px] leading-4 font-bold text-[#f4f4f4]">
        {roundLabel}
      </p>

      {/* Tight vertical padding on purpose: the design's card is 372px tall
          with the ring, the caption and the strip already filling it, so any
          generous padding here pushes the card past its drawn height. */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-2 py-1">
        {showsClock ? (
          <div
            data-testid="stage-clock"
            data-frozen={String(frozen)}
            className={cn(
              "relative aspect-square w-[196px] max-w-full transition-opacity @[560px]:w-[222px]",
              frozen && "opacity-40"
            )}
          >
            {/* Not-started shows the bare track: there is no time to run down
                yet, so an arc would be a lie. */}
            {phase === "live" ? (
              <CountdownRing progress={clampProgress(progress)} animated={!prefersReducedMotion} />
            ) : (
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
                className="absolute inset-0 size-full"
              >
                <circle
                  data-testid="stage-ring-track"
                  cx={RING_BOX / 2}
                  cy={RING_BOX / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={RING_TRACK}
                  strokeWidth={RING_STROKE}
                />
              </svg>
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[9px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-testid="stage-glyph"
                src={glyph.src}
                alt=""
                aria-hidden="true"
                width={glyph.size}
                height={glyph.size}
                className="block size-[56px] shrink-0"
              />
              {/* aria-live is off on purpose: a clock that announced every
                  second would talk over everything else on the screen. The
                  caller announces the milestones it cares about. */}
              <p
                data-testid="stage-countdown"
                aria-live="off"
                className="ws-display tnum bg-clip-text text-center text-[40px] leading-none font-extrabold tracking-[-1.45px] text-transparent @[560px]:text-[48px]"
                style={{ backgroundImage: CLOCK_GRADIENT }}
              >
                {phase === "live" ? (countdown ?? CLOCK_PLACEHOLDER) : CLOCK_PLACEHOLDER}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-testid="stage-glyph"
              src={glyph.src}
              alt=""
              aria-hidden="true"
              width={glyph.size}
              height={glyph.size}
              className="block size-[104px] shrink-0 @[560px]:size-[132px]"
            />
            {heading ? (
              <h2 className="ws-display max-w-[388px] text-center text-[28px] leading-none font-extrabold tracking-[-1.08px] text-white capitalize @[560px]:text-[36px]">
                {heading}
              </h2>
            ) : null}
            {subheading ? (
              <p className="max-w-[300px] text-center text-[14px] leading-[1.3] font-bold text-[#f4f4f4]/70">
                {subheading}
              </p>
            ) : null}
          </>
        )}

        {caption ? (
          <p
            data-testid="stage-caption"
            className="max-w-[300px] text-center text-[14px] leading-[1.3] font-bold text-[#f4f4f4]/70"
          >
            {caption}
          </p>
        ) : null}
      </div>

      {/* A sibling of the centre column rather than a child of it, so the
          absolute placement anchors on the card itself — the design puts the
          tiles 25px in from its top-right corner. On a narrow card the
          absolute positioning drops away and DOM order takes over, landing
          them between the centre column and the leader strip. */}
      {tiles ? (
        <div
          data-testid="stage-tiles"
          className="relative mx-auto mt-2 mb-4 grid w-full max-w-[340px] grid-cols-2 gap-2 @[560px]:absolute @[560px]:top-[25px] @[560px]:right-[25px] @[560px]:m-0 @[560px]:w-[152px] @[560px]:max-w-none @[560px]:grid-cols-1"
        >
          {pot ? <StatTile tile={pot} tone="dark" testId="stage-pot" tileRef={potRef} /> : null}
          {winnerShare ? (
            <StatTile tile={winnerShare} tone="gold" testId="stage-winner-share" />
          ) : null}
        </div>
      ) : null}

      {leader ? (
        <div
          data-testid="stage-leader"
          data-you={String(leader.isYou)}
          className="relative flex flex-col items-start gap-3 rounded-[16px] bg-[#1d1d1d] p-3 @[560px]:flex-row @[560px]:items-center @[560px]:justify-between"
        >
          <span className="flex max-w-full min-w-0 items-center gap-[9px]">
            <LeaderAvatar leader={leader} />
            <span className="flex min-w-0 flex-col gap-[6px]">
              <span className="truncate text-[11px] leading-[1.1] font-bold text-[#f4f4f4]/40">
                {leader.label}
              </span>
              <span className="truncate text-[13px] leading-[1.15] font-bold text-white">
                {leader.value}
              </span>
            </span>
          </span>
          {chip ? <LeaderChip chip={chip} /> : null}
        </div>
      ) : null}

      {children ? <div className="absolute inset-0 z-10">{children}</div> : null}
    </section>
  );
}
