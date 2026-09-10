"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { marketSquareHref } from "@/lib/market-square";
import type { SectionId } from "@/lib/sections";
import type { NavItem } from "@/components/layout/nav-items";

// The curved bottom navigation (Figma node 104:2688). The bar art — the raised
// disc, the five dim icons, and the elevated centre card — is the designer's own
// export (nav-bar-base.svg), pixel-identical and scaling with the viewport. The
// active tab is marked by a curved arc underline (Figma node 104:2697) that
// slides under its icon, with the active section's name pinned under the dock.
// Mobile only; a drop-in replacement for MobileTabBar.

interface CurvedTabBarProps {
  items: NavItem[];
  activeSection: SectionId;
  onNavigate: (id: SectionId) => void;
}

// The icons that carry an active state, with their centre as a share of the
// 402x90 art (x across, y down). The centre card (Market Square) and the "More"
// slot are actions, not sections, so they never take the arc.
const TABS: { id: SectionId; x: number; y: number }[] = [
  { id: "portfolio", x: 15.0, y: 72 },
  { id: "spot", x: 32.3, y: 48 },
  { id: "casino", x: 71.6, y: 50 },
  // The clock: drawn at (348.9, 69.9) in the 402x90 art.
  { id: "activity", x: 86.8, y: 77.7 },
];

// How far below the icon's centre the arc sits, in percentage points of the
// 402x90 art's height. Figma measures the gap at 37.3pp, but it measures it on
// the raised centre slot; the icons that actually carry an active state here sit
// far out along the arch (activity at y=77.7%), where +37.3pp would push the arc
// clean off the bottom of the bar. +12pp clears all four states — portfolio 84%,
// spot 60%, casino 62%, activity 89.7% — and with the arc's half-height at about
// 4pp every one of them stays inside the art box. Tune the underline's height
// here and nowhere else.
const ARC_OFFSET_PP = 12;

// The arc is 84.685px wide in the 402px-wide Figma frame. Its own art is
// 86.586 x 6.25125 and it is exported preserveAspectRatio="none", so it has no
// intrinsic size of its own: the width below plus the aspect ratio class on the
// element are what give it a shape.
const ARC_WIDTH_PCT = 21.07;

// Tap zones over the art, left→right: portfolio, market, market square, casino, activity.
const ZONES = [
  { left: 0, width: 24 },
  { left: 24, width: 17 },
  { left: 41, width: 20 },
  { left: 61, width: 18 },
  { left: 79, width: 21 },
];

export function CurvedTabBar({ items, activeSection, onNavigate }: CurvedTabBarProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const squareHref = marketSquareHref() ?? "#";
  // Four icons carry an active state (portfolio, spot, casino, activity). On
  // any other section (rwa, meme, prediction, earn) none of them owns the
  // page, so the marker is hidden rather than snapping onto Portfolio.
  const active = TABS.find((t) => t.id === activeSection) ?? null;
  // The nav already carries the localized section names (buildNav fills `label`
  // from the next-intl "sections" namespace), so the dock needs no strings of
  // its own.
  const activeLabel = active ? (items.find((i) => i.id === active.id)?.label ?? null) : null;

  // The arc slides across to the active icon instead of jumping. It has to
  // travel in both axes: the icons sit at very different heights along the
  // dock's arch, so animating `left` alone would drag it diagonally through the
  // middle of the bar.
  const slide = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 32 };
  // The name under the dock fades in on change rather than hard-cutting.
  const fade = reduce ? { duration: 0 } : { duration: 0.18 };

  const onZone = (i: number) => {
    if (i === 0) onNavigate("portfolio");
    // The second icon opens the phone Market page (its own route, outside the
    // shell), so navigate rather than scroll-spy to a section.
    else if (i === 1) router.push("/market");
    else if (i === 2) {
      // A sibling deployment, so it opens beside the app, as the rail does.
      if (squareHref !== "#") window.open(squareHref, "_blank", "noopener,noreferrer");
    } else if (i === 3) onNavigate("casino");
    // The last icon opens the Activity page (its own route), not the drawer.
    else router.push("/activity");
  };

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 z-90 w-screen md:hidden">
      <div className="relative w-screen" style={{ aspectRatio: "402 / 90" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nav/nav-bar-base.svg"
          alt=""
          className="absolute inset-0 h-full w-full select-none"
        />

        {/* The active marker: a curved arc that slides under the active icon,
            and the section's name pinned under the centre of the dock. Both are
            shown only when the current section maps to one of the marked icons —
            a name with no arc under it would read as orphaned. */}
        {active ? (
          <motion.div
            data-testid="active-arc"
            animate={{ left: `${active.x}%`, top: `${active.y + ARC_OFFSET_PP}%` }}
            transition={slide}
            style={{ width: `${ARC_WIDTH_PCT}%` }}
            // The tilt is Figma's +2.11°, negated because Figma measures
            // rotation counter-clockwise and CSS clockwise. Derived from the
            // spec rather than observed on screen, so if the arc leans the wrong
            // way this sign is the thing to flip.
            className="pointer-events-none absolute aspect-[13.851/1] -translate-x-1/2 -translate-y-1/2 rotate-[-2.11deg]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nav/active-arc.svg"
              alt=""
              // The asset is exported preserveAspectRatio="none", so it takes
              // the box's shape. Its own inner-shadow filter is invisible on a
              // 2px stroke, so the bloom under the arc is this drop-shadow.
              className="h-full w-full drop-shadow-[0_0_6px_rgba(216,188,255,0.45)] select-none"
            />
          </motion.div>
        ) : null}

        {activeLabel ? (
          <motion.div
            key={activeLabel}
            data-testid="active-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fade}
            // Fixed at the centre of the bar rather than tracking the arc: the
            // outermost slots (portfolio 15%, activity 86.8%) would push an
            // edge-anchored name off the frame. No active icon sits at 50%, so
            // the name never collides with the arc.
            className="pointer-events-none absolute top-[82.2%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[12px] font-semibold tracking-[-0.36px] whitespace-nowrap text-white"
          >
            {activeLabel}
          </motion.div>
        ) : null}

        <nav className="pointer-events-auto absolute inset-0" aria-label="Primary">
          {ZONES.map((z, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onZone(i)}
              className="absolute top-0 bottom-0 cursor-pointer"
              style={{ left: `${z.left}%`, width: `${z.width}%` }}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
