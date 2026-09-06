"use client";

import { motion, useReducedMotion } from "motion/react";
import { marketSquareHref } from "@/lib/market-square";
import type { SectionId } from "@/lib/sections";
import type { NavItem } from "@/components/layout/nav-items";

// The curved bottom navigation (Figma node 104:2688): a large #151515 disc whose
// top arc forms a raised-centre bar, five items riding that arc, an elevated
// centre card (Market Square), and a purple active glow with a label that follow
// the selected tab. Reproduced with the comp's own absolute offsets so it holds
// shape across phone widths. Mobile only; drop-in replacement for MobileTabBar.

interface CurvedTabBarProps {
  items: NavItem[];
  activeSection: SectionId;
  onNavigate: (id: SectionId) => void;
  /** Opens the sidebar drawer so every section the bar omits stays reachable. */
  onOpenMore: () => void;
}

function HomeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21.5 21.5" fill="none" aria-hidden>
      <path
        d="M7.74932 20.75L7.49869 17.2411C7.36394 15.3546 8.85804 13.75 10.7493 13.75C12.6406 13.75 14.1347 15.3546 14 17.2411L13.7493 20.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1.10139 11.9635C0.748375 9.66624 0.571865 8.51763 1.00617 7.49938C1.44047 6.48112 2.40403 5.78443 4.33114 4.39106L5.77099 3.35C8.16829 1.61667 9.36694 0.75 10.75 0.75C12.1331 0.75 13.3317 1.61667 15.729 3.35L17.1689 4.39106C19.096 5.78443 20.0595 6.48112 20.4938 7.49938C20.9281 8.51763 20.7516 9.66624 20.3986 11.9635L20.0976 13.9224C19.5971 17.1789 19.3469 18.8072 18.179 19.7786C17.0111 20.75 15.3037 20.75 11.8888 20.75H9.61119C6.19634 20.75 4.48891 20.75 3.321 19.7786C2.15309 18.8072 1.90287 17.1789 1.40243 13.9224L1.10139 11.9635Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon({ size = 21 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 15.6932) / 17.6797}
      viewBox="0 0 17.6797 15.6932"
      fill="none"
      aria-hidden
    >
      <path
        d="M0.893919 14.7993H16.7858M2.88041 14.7993V4.86689M6.85338 14.7993V0.893919M10.8264 14.7993V7.84662M14.7993 14.7993V3.87365"
        stroke="currentColor"
        strokeWidth="1.78784"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GameIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.19238 11.9811V15.5322"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.0043 13.7562H7.3811"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.3732 12.0892H15.2717"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.092 15.4782H16.9905"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4563 2.20135C8.46293 2.91063 9.0442 3.47956 9.75346 3.47292H10.7547C11.85 3.46438 12.746 4.34244 12.7612 5.43763V6.43799"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.6647 13.8017C21.6647 8.2793 19.2942 6.43787 12.1816 6.43787C5.06806 6.43787 2.69751 8.2793 2.69751 13.8017C2.69751 19.3251 5.06806 21.1656 12.1816 21.1656C19.2942 21.1656 21.6647 19.3251 21.6647 13.8017Z"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The three section tabs and their x-centres (the comp's own offsets). The centre
// card (Market Square) and the "More" slot are handled separately; they carry no
// active state of their own.
const SECTION_TABS: { id: SectionId; x: string; iconBottom: number; label: string }[] = [
  { id: "portfolio", x: "15.2%", iconBottom: 30, label: "Home" },
  { id: "spot", x: "32.6%", iconBottom: 36, label: "Market" },
  { id: "casino", x: "71.6%", iconBottom: 36, label: "Arkade" },
];

export function CurvedTabBar({ activeSection, onNavigate, onOpenMore }: CurvedTabBarProps) {
  const reduce = useReducedMotion();
  const squareHref = marketSquareHref();

  // The glow + label follow the active tab, so they sit at that tab's x-centre.
  const activeTab = SECTION_TABS.find((t) => t.id === activeSection);

  // Entrance: the bar rises into place; the glow then breathes gently. Reduced
  // motion holds both still.
  const rise = reduce
    ? {}
    : {
        initial: { y: 40, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.5, ease: "easeOut" as const },
      };
  const breathe = reduce
    ? {}
    : {
        animate: { opacity: [0.7, 1, 0.7], scaleX: [1, 1.04, 1] },
        transition: { duration: 3.4, ease: "easeInOut" as const, repeat: Infinity, delay: 0.5 },
      };

  const sectionColor = (id: SectionId) => (id === activeSection ? "text-white" : "text-white/50");

  return (
    // The fixed wrapper is a plain div: a transform on a position:fixed element
    // (the rise animation) would otherwise become the containing block for its
    // own descendants and shift the whole bar. The animation lives on an inner
    // layer instead.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-90 h-[90px] overflow-hidden md:hidden">
      <motion.div {...rise} className="absolute inset-0">
        {/* The bar body: a full-width #151515 panel whose top edge is a gentle
          raised-centre dome (the comp's shallow curve, not a full circle). The
          dome height is the vertical corner radius; it scales with the viewport
          and stays centred. A faint purple hairline traces the top edge. */}
        <div
          className="pointer-events-none absolute inset-0 bg-[#151515]"
          style={{
            borderRadius: "50% 50% 0 0 / 70px 70px 0 0",
            borderTop: "1.5px solid rgba(216,188,255,0.12)",
          }}
        />
        {/* The comp's faint radial rays, clipped to the dome by matching its
          border-radius on an overflow-hidden layer. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: "50% 50% 0 0 / 70px 70px 0 0" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nav/bar-fill.png"
            alt=""
            className="absolute bottom-0 left-1/2 h-[560px] w-[560px] max-w-none -translate-x-1/2"
          />
        </div>

        {/* Purple active glow + label, centred under the elevated card as the comp
          draws it. The label reflects the active tab. */}
        { }
        <motion.img
          {...breathe}
          src="/nav/glow.svg"
          alt=""
          className="pointer-events-none absolute bottom-[26px] left-1/2 h-[7px] w-[86px] origin-center -translate-x-1/2 rotate-[2.11deg]"
        />
        <span className="pointer-events-none absolute bottom-[6px] left-1/2 -translate-x-1/2 font-sans text-[12px] font-semibold tracking-[-0.36px] whitespace-nowrap text-white">
          {activeTab?.label ?? "Home"}
        </span>

        <nav className="pointer-events-auto absolute inset-0" aria-label="Primary">
          {/* Icons ride the arc: outer pair low, inner pair mid, centre highest. */}
          {/* Home → Portfolio. */}
          <button
            type="button"
            onClick={() => onNavigate("portfolio")}
            aria-current={activeSection === "portfolio" ? "page" : undefined}
            className={`absolute bottom-[13px] left-[15.2%] flex -translate-x-1/2 cursor-pointer items-center transition-colors ${sectionColor("portfolio")}`}
          >
            <HomeIcon size={24} />
          </button>

          {/* Chart → Market (spot). */}
          <button
            type="button"
            onClick={() => onNavigate("spot")}
            aria-current={activeSection === "spot" ? "page" : undefined}
            className={`absolute bottom-[37px] left-[32.6%] flex -translate-x-1/2 cursor-pointer items-center transition-colors ${sectionColor("spot")}`}
          >
            <ChartIcon size={18} />
          </button>

          {/* Centre card → Market Square (a sibling deployment, so a link). Always
            drawn; when the square URL is unset it stays as an inert mark rather
            than leaving a hole in the elevated centre. */}
          {squareHref ? (
            <a
              href={squareHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Market Square"
              className="absolute bottom-[51px] left-1/2 flex -translate-x-1/2 cursor-pointer items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nav/card.svg" alt="" className="h-[19px] w-auto -scale-x-100" />
            </a>
          ) : (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-[51px] left-1/2 flex -translate-x-1/2 items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nav/card.svg" alt="" className="h-[19px] w-auto -scale-x-100" />
            </span>
          )}

          {/* Game → Arkade (casino). */}
          <button
            type="button"
            onClick={() => onNavigate("casino")}
            aria-current={activeSection === "casino" ? "page" : undefined}
            className={`absolute bottom-[37px] left-[71.6%] flex -translate-x-1/2 cursor-pointer items-center transition-colors ${sectionColor("casino")}`}
          >
            <GameIcon size={24} />
          </button>

          {/* More → opens the sidebar drawer for every other section. */}
          <button
            type="button"
            onClick={onOpenMore}
            aria-label="More"
            className="absolute bottom-[8px] left-[86.8%] flex -translate-x-1/2 cursor-pointer items-center text-white/50 transition-colors hover:text-white/70"
          >
            <ChartIcon size={22} />
          </button>
        </nav>
      </motion.div>
    </div>
  );
}
