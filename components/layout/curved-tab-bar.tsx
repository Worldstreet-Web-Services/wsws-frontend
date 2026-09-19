"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArkTabBar, ArkTabIcons, type ArkTab } from "@ark/chrome";
import type { SectionId } from "@/lib/sections";
import type { NavItem } from "@/components/layout/nav-items";

// The seat each tab lights up on. The market seat borrows the "spot" section
// only to know when to raise its icon; its name stays its own.
const SECTION_OF_TAB: Record<string, SectionId> = {
  portfolio: "portfolio",
  market: "spot",
  square: "square",
  casino: "casino",
  activity: "activity",
};

// The bar's five destinations, in their resting left-to-right order. Every
// seat is a host action: WSWS decides per seat whether it scroll-spies a
// section of the shell or pushes a route.
const TABS: readonly [ArkTab, ArkTab, ArkTab, ArkTab, ArkTab] = [
  { id: "portfolio", label: "Home", icon: ArkTabIcons.home, target: { kind: "action" } },
  { id: "market", label: "Market", icon: ArkTabIcons.market, target: { kind: "action" } },
  // Its own page in the app (/square, ADR-2026-09-12), so it takes the
  // "square" section and rides to the centre while the reader is there, the
  // same seat logic as every other tab.
  {
    id: "square",
    label: "Square",
    icon: ArkTabIcons.square,
    target: { kind: "action" },
    ownColour: true,
  },
  { id: "casino", label: "Arkade", icon: ArkTabIcons.arkade, target: { kind: "action" } },
  { id: "activity", label: "Activity", icon: ArkTabIcons.activity, target: { kind: "action" } },
];

interface CurvedTabBarProps {
  // The localized section names the dome shows under the centre seat.
  items: NavItem[];
  activeSection: SectionId;
  onNavigate: (id: SectionId) => void;
}

/**
 * The phone tab bar, drawn by @ark/chrome as the raised dome from the comp.
 * This adapter maps WSWS's sections onto the five seats and handles taps.
 */
export function CurvedTabBar({ items, activeSection, onNavigate }: CurvedTabBarProps) {
  const router = useRouter();

  const onSelect = (tab: ArkTab) => {
    if (tab.id === "portfolio") onNavigate("portfolio");
    else if (tab.id === "market") router.push("/market");
    // The Square seat opens the app's own Square page, exactly as the desktop
    // rail's entry does; it used to open the Square's deployment in a new tab
    // (ogazboiz, 2026-09-13). "Open the Square" on that page is the way out.
    else if (tab.id === "square") router.push("/square");
    else if (tab.id === "casino") onNavigate("casino");
    else router.push("/activity");
  };

  const activeTab = TABS.find((tab) => SECTION_OF_TAB[tab.id] === activeSection);
  // The market seat's name is its own ("Market"), not the spot section's. Every
  // other seat takes the nav's localized section name.
  const activeLabel = activeTab
    ? activeTab.id === "market"
      ? activeTab.label
      : (items.find((i) => i.id === SECTION_OF_TAB[activeTab.id])?.label ?? activeTab.label)
    : null;

  return (
    <ArkTabBar
      tabs={TABS}
      activeId={activeTab?.id ?? null}
      activeLabel={activeLabel}
      onSelect={onSelect}
      Link={Link}
      navLabel="Primary"
    />
  );
}
