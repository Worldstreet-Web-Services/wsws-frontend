"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { marketSquareHref } from "@/lib/market-square";

/** How far down the page the square section starts mattering, in viewports. */
const REVEAL_AFTER_VIEWPORTS = 1.2;

/**
 * Compose, revealed once the player has scrolled into social territory.
 *
 * It is hidden at the top of the dashboard on purpose. Someone who has just
 * opened Ark is there to see their portfolio, and a permanent "post something"
 * button over that is the app talking about itself. Once they have scrolled
 * past a screenful the reading has become browsing, and an invitation to join
 * in is welcome rather than in the way.
 *
 * Positioned above the safe-area inset so it clears the home indicator on a
 * phone, and it never sits over the sticky header because it is anchored to
 * the bottom.
 */
export function SquareComposeFab() {
  const t = useTranslations("square");
  const [shown, setShown] = useState(false);
  const href = marketSquareHref("compose");

  useEffect(() => {
    if (!href) return;
    // Passive, and coalesced to one frame: scroll fires far faster than the
    // screen repaints, and setting state on every event would re-render the
    // page dozens of times a second for a boolean that changes twice.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setShown(window.scrollY > window.innerHeight * REVEAL_AFTER_VIEWPORTS);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [href]);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("compose")}
      // Kept mounted and faded so it does not pop into the layout mid-scroll;
      // `pointer-events-none` while hidden keeps it from catching taps meant
      // for whatever is underneath it.
      className={
        // Ark's accent is silver on near-black (globals.css), so the compose
        // affordance is the one bright surface on the page rather than a
        // borrowed brand colour. Inverted ink keeps the glyph legible on it.
        "fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex h-14 w-14 " +
        "items-center justify-center rounded-full bg-accent text-ink shadow-lg " +
        "shadow-black/50 transition-all duration-200 hover:brightness-110 " +
        "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 " +
        "focus-visible:ring-offset-black " +
        (shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </a>
  );
}
