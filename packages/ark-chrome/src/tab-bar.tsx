"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Badge, badgeText, badgedName } from "./badge";
import { usePendingCrossing } from "./crossing";
import { useRegisterTabBar } from "./drawer-contract";
import { TargetElement } from "./target";
import type { ArkTab, ArkTabBarProps } from "./types";

// The five seats along the dome, in screen order, as a share of the 402x90 art.
// The icons ride the arch, so the inner seats sit higher than the outer ones
// and the centre sits highest of all. Whichever tab is active takes seat 2.
const SEATS = [
  { x: 15.0, y: 74 },
  { x: 32.3, y: 46 },
  { x: 50.0, y: 30 },
  { x: 71.4, y: 46 },
  { x: 86.8, y: 78 },
] as const;
const CENTRE = 2;

/**
 * The phone tab bar, drawn as the raised dome from the comp (node 104:2688).
 *
 * The purple arc and the name do NOT move: they are a fixed frame in the
 * centre. Whatever tab is active rides up into that centre seat, and the other
 * four keep their left-to-right order and close the gap it leaves. So
 * switching tabs reshuffles the icons through the centre rather than sliding an
 * indicator to them. Hidden from 768px up, where the rail takes over.
 */
export function ArkTabBar({
  tabs,
  activeId,
  activeLabel,
  onSelect,
  Link,
  DocumentLink,
  navLabel,
  hidden = false,
}: ArkTabBarProps) {
  const reduce = useReducedMotion();
  useRegisterTabBar(hidden);
  const crossing = usePendingCrossing(activeId);
  const litId = crossing.pendingId ?? activeId;

  const litTab = tabs.find((tab) => tab.id === litId);
  // Reshuffle: pull the lit tab out, keep the rest in order, and drop it back
  // into the centre seat. With nothing lit the bar rests in its natural order.
  const others = tabs.filter((tab) => tab.id !== litTab?.id);
  const ordered: readonly ArkTab[] = litTab
    ? [...others.slice(0, CENTRE), litTab, ...others.slice(CENTRE)]
    : tabs;
  const label = litTab
    ? litTab.id === activeId
      ? (activeLabel ?? litTab.label)
      : litTab.label
    : null;

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 30 };

  return (
    <div className="ark-chrome-root ark-chrome-tabbar" hidden={hidden}>
      <div className="ark-chrome-tabbar-frame">
        {/* The dome: surface, hairline and ray texture, no icons. */}
        <div className="ark-chrome-tabbar-dome" aria-hidden />

        {/* The fixed centre frame: the purple arc and the lit tab's name.
            Neither moves; only the name changes as the icons reshuffle. */}
        {litTab ? (
          <>
            <div className="ark-chrome-tabbar-glow" aria-hidden />
            <AnimatePresence mode="wait">
              <motion.span
                key={label}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="ark-chrome-tabbar-label"
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </>
        ) : null}

        {/* The icons. Each animates to the seat its slot in `ordered` gives it,
            so the lit one rides up to the centre and the others close the gap.
            Keyed by tab, so motion moves the same element. */}
        <nav aria-label={navLabel} className="ark-chrome-tabbar-nav">
          {ordered.map((tab, i) => {
            const seat = SEATS[i];
            // The centre seat draws its icon larger even at rest; it is only
            // lit when a tab is actually there.
            const centreSeat = i === CENTRE;
            const tone = tab.ownColour
              ? ""
              : centreSeat && litTab
                ? " ark-chrome-seat--lit"
                : " ark-chrome-seat--dim";
            const place = { left: `${seat.x}%`, top: `${seat.y}%` };
            // The count is drawn out of flow inside the seat, so the icon
            // keeps its centre and the seat keeps its box.
            const icon = (
              <>
                <tab.icon size={centreSeat ? 26 : 23} />
                <Badge text={badgeText(tab.badge)} className="ark-chrome-seat-badge" />
              </>
            );
            const name = badgedName(tab.label, tab.badge) ?? tab.label;
            // aria-current follows the page, not the seat: while a crossing
            // is pending the current page's tab has left the centre but is
            // still the page the reader is on.

            if (tab.target.kind === "action") {
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelect?.(tab)}
                  aria-label={name}
                  aria-current={tab.id === activeId ? "page" : undefined}
                  data-ark-nav={tab.id}
                  {...tab.dataAttributes}
                  initial={false}
                  animate={place}
                  transition={spring}
                  className={`ark-chrome-seat${tone}`}
                >
                  {icon}
                </motion.button>
              );
            }

            // A link cannot be a motion element when the host supplies the
            // component, so the seat is a positioned wrapper around it.
            const pending = crossing.pendingId === tab.id;
            return (
              <motion.div
                key={tab.id}
                initial={false}
                animate={place}
                transition={spring}
                className={`ark-chrome-seat${tone}`}
              >
                <TargetElement
                  target={tab.target}
                  Link={Link}
                  DocumentLink={DocumentLink}
                  current={tab.id === activeId}
                  pending={pending}
                  busy={pending && crossing.busy}
                  ariaLabel={name}
                  dataAttributes={{ "data-ark-nav": tab.id, ...tab.dataAttributes }}
                  className="ark-chrome-seat-hit"
                  onActivate={() => {}}
                  onCrossing={() => {
                    if (tab.id !== activeId) crossing.start(tab.id);
                  }}
                >
                  {icon}
                </TargetElement>
              </motion.div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
