"use client";

import { useTranslations } from "next-intl";
import { GoLiveControl } from "@/components/broadcast/go-live-control";
import type { NavItem } from "@/components/layout/nav-items";
import type { SectionId } from "@/lib/sections";

interface MobileTabBarProps {
  items: NavItem[];
  activeSection: SectionId;
  onNavigate: (id: SectionId) => void;
  /** Opens the sidebar drawer so every section the pill omits stays reachable. */
  onOpenMore: () => void;
}

// ---------------------------------------------------------------------------
// Icons — exact Figma export paths, viewBox framed to each icon's content.
// Stroke uses currentColor so the parent's text-white / text-white/50 class
// controls active vs inactive appearance.
// ---------------------------------------------------------------------------

function Wallet01Icon({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="31.2 45.2 23.9 23.9" fill="none" aria-hidden>
      <path
        d="M47.5947 59.385C47.5947 60.3058 48.3412 61.0522 49.262 61.0522C50.1828 61.0522 50.9292 60.3058 50.9292 59.385C50.9292 58.4642 50.1828 57.7178 49.262 57.7178C48.3412 57.7178 47.5947 58.4642 47.5947 59.385Z"
        stroke="currentColor"
        strokeWidth="1.66723"
      />
      <path
        d="M40.9258 51.6046H47.5947C50.7385 51.6046 52.3104 51.6046 53.287 52.5813C54.2637 53.5579 54.2637 55.1298 54.2637 58.2736V60.4965C54.2637 63.6403 54.2637 65.2122 53.287 66.1888C52.3104 67.1654 50.7385 67.1654 47.5947 67.1654H40.9258C36.7341 67.1654 34.6383 67.1654 33.3361 65.8633C32.0339 64.5611 32.0339 62.4652 32.0339 58.2736V56.0506C32.0339 51.8589 32.0339 49.7631 33.3361 48.4609C34.6383 47.1587 36.7341 47.1587 40.9258 47.1587H45.3718C46.4054 47.1587 46.9222 47.1587 47.3463 47.2723C48.497 47.5806 49.3958 48.4794 49.7041 49.6301C49.8177 50.0542 49.8177 50.571 49.8177 51.6046"
        stroke="currentColor"
        strokeWidth="1.66723"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartBarsIcon({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="180.189 47.271 19.784 19.784" fill="none" aria-hidden>
      <path
        d="M181.189 64.9431H198.973M183.412 64.9431V53.8283M187.858 64.9431V49.3823M192.304 64.9431V57.1627M196.75 64.9431V52.7168"
        stroke="currentColor"
        strokeWidth="2.00068"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GamepadIcon({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="321.2 45.5 22.9 22.9" fill="none" aria-hidden>
      <path d="M329.327 57.2437V61.2175" stroke="currentColor" strokeWidth="1.66725" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M331.354 59.23H327.3" stroke="currentColor" strokeWidth="1.66725" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M336.243 57.3647H336.13" stroke="currentColor" strokeWidth="1.66725" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M338.167 61.1572H338.053" stroke="currentColor" strokeWidth="1.66725" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M328.503 46.2998C328.511 47.0935 329.161 47.7302 329.955 47.7227H331.075C332.301 47.7132 333.304 48.6958 333.321 49.9214V51.0408"
        stroke="currentColor"
        strokeWidth="1.66725"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M343.284 59.281C343.284 53.1012 340.631 51.0405 332.672 51.0405C324.712 51.0405 322.059 53.1012 322.059 59.281C322.059 65.4619 324.712 67.5215 332.672 67.5215C340.631 67.5215 343.284 65.4619 343.284 59.281Z"
        stroke="currentColor"
        strokeWidth="1.66725"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Sections whose mobile tab bar icon differs from the sidebar/nav-items icon.
const MOBILE_ICONS: Partial<
  Record<SectionId, (props: { size?: number }) => React.ReactNode>
> = {
  portfolio: Wallet01Icon,
  spot: ChartBarsIcon,
  casino: GamepadIcon,
};

// Labels that differ on mobile from the sidebar/nav-items label.
const MOBILE_LABELS: Partial<Record<SectionId, string>> = {
  spot: "Market",
};

// Three section tabs plus the broadcast control as the third visual item.
// The close button on the right opens the sidebar drawer for everything else.
const TAB_COUNT = 3;

// The phone's bottom navigation: a frosted pill with the first sections and the
// broadcast control, plus a separate close-style button that opens the sidebar
// drawer for every section the pill cannot fit.
// Hidden from `md` up where the left rail takes over.
export function MobileTabBar({
  items,
  activeSection,
  onNavigate,
  onOpenMore,
}: MobileTabBarProps) {
  const t = useTranslations("topbar");
  const tabs = items.slice(0, TAB_COUNT);
  // Two tabs, then broadcast, then the remaining tab.
  const leading = tabs.slice(0, 2);
  const trailing = tabs.slice(2);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-90 flex items-center justify-center gap-1.5 px-4 pb-[max(16px,env(safe-area-inset-bottom))] md:hidden">
      <nav
        aria-label={t("sections")}
        className="pointer-events-auto flex max-w-full items-center gap-3 overflow-visible rounded-full border border-white/12 bg-[#141416]/47 p-1.5 shadow-[0_18px_50px_-16px_rgba(0,0,0,0.95)] backdrop-blur-[25px]"
      >
        {leading.map((tab) => {
          const active = tab.id === activeSection;
          const Icon = MOBILE_ICONS[tab.id] ?? tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-full transition-colors ${
                active
                  ? "bg-white/14 px-3.5 text-white"
                  : "w-11 justify-center text-white/50"
              }`}
            >
              <Icon size={21} />
              {active ? (
                <span className="font-sans text-[12.5px] font-medium whitespace-nowrap">
                  {MOBILE_LABELS[tab.id] ?? tab.label}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* Broadcast / Go Live, sitting inline as the third visual item. */}
        <GoLiveControl variant="tab" />

        {trailing.map((tab) => {
          const active = tab.id === activeSection;
          const Icon = MOBILE_ICONS[tab.id] ?? tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-full transition-colors ${
                active
                  ? "bg-white/14 px-3.5 text-white"
                  : "w-11 justify-center text-white/50"
              }`}
            >
              <Icon size={21} />
              {active ? (
                <span className="font-sans text-[12.5px] font-medium whitespace-nowrap">
                  {MOBILE_LABELS[tab.id] ?? tab.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Opens the sidebar drawer so every section the pill omits stays
          reachable. Outer glass wrapper, inner dark circle with the same
          white/12 border as the nav pill, and the cancel-01 X icon. */}
      <div className="pointer-events-auto relative rounded-full bg-white/4 p-1 backdrop-blur-xs">
        {/* Two border arcs at top-left and bottom-right edges, like an
            ellipse rotated 45°. Same white/12 weight as the nav pill. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 20%, rgba(255,255,255,0.14) 25%, rgba(255,255,255,0.14) 50%, transparent 55%, transparent 70%, rgba(255,255,255,0.14) 75%, rgba(255,255,255,0.14) 100%)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
          }}
        />
        <button
          type="button"
          onClick={onOpenMore}
          aria-label={t("menu")}
          className="relative grid size-10 cursor-pointer place-items-center rounded-full transition-colors hover:bg-white/8"
        >
          <svg className="size-full" viewBox="0 0 51 51" fill="none" aria-hidden>
            <path
              d="M31.2772 31.39L19.5348 19.4217M31.3901 19.5347L19.4219 31.277"
              stroke="#E9DCFF"
              strokeWidth="1.34966"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
