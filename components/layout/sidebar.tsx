"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArkNavIcons, ArkSidebar, type ChromeNavItem } from "@ark/chrome";
import { Avatar } from "@/components/ui/avatar";
import type { NavItem } from "@/components/layout/nav-items";
import type { DashboardSection } from "@/lib/modal-types";
import { deriveProfile } from "@/lib/user";
import { GoLiveControl } from "@/components/broadcast/go-live-control";
import { MARKET_SQUARE_HIDDEN } from "@/lib/market-square";
import { AccountPopover } from "@/components/layout/account-popover";
import { SQUARE_ZONE_PATH } from "@/lib/square-zone";

type SidebarProps = {
  items: NavItem[];
  activeSection: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
} & (
  | {
      /**
       * A fixed rail from `md` up and no phone drawer at all. The dashboard
       * shell's phones get around by the tab bar, and nothing on them opens a
       * drawer, so none is rendered.
       */
      layout: "rail";
    }
  | {
      layout?: undefined;
      /** Phone drawer state. Ignored from `md` up, where the sidebar is always shown. */
      open: boolean;
      onClose: () => void;
      /**
       * Keep the drawer at every width. The perps screen mounts no shell, so the
       * rail is its menu at desktop widths too.
       */
      drawerAtEveryWidth?: boolean;
    }
);

// The app's left rail. It is drawn by @ark/chrome, the package the Square
// installs as well, so the rail on a trading page and on a Square page is one
// component (ADR-2026-09-16-square-microfrontend, section 6). This adapter is
// where WSWS's own data goes in: the localized labels, the Privy profile, the
// broadcast control, the account popover and the Square switch.
//
// The class names passed as `classNames` are markers for this app's older
// tests and tools, which read Tailwind names off the rail. The package's own
// stylesheet is unlayered, so they restyle nothing. They are fixed strings:
// the package applies the state-dependent ones (open or closed, lit or idle)
// from the state it draws with, and sidebar-markers.test.tsx checks each marker
// sits where the package's real state and styles are.
export function Sidebar(props: SidebarProps) {
  const { items, activeSection, onNavigate } = props;
  const { user } = usePrivy();
  const profile = deriveProfile(user);
  const t = useTranslations("topbar");
  // The square is a product with its own catalog namespace, so the rail reads
  // its name from there rather than repeating the string. The rail's word is
  // "Square" (asked for 2026-09-12); the page keeps the fuller title.
  const tSquare = useTranslations("square");
  // This reads MARKET_SQUARE_HIDDEN, the way-in switch, and nothing else. A
  // hidden square (no URL, or an operator takedown) has no page to open, so
  // the entry goes with it. What the portfolio renders of the square is
  // SQUARE_SECTIONS_HIDDEN's question, and the rail must not read it: the
  // entry stands while those sections are off.
  const squareShown = !MARKET_SQUARE_HIDDEN;
  const squareLabel = tSquare("navLabel");

  const rows = useMemo<ChromeNavItem[]>(() => {
    const sections: ChromeNavItem[] = items.map((n) => ({
      id: n.id,
      label: n.label,
      icon: n.icon,
      target: { kind: "action" },
      dataAttributes: { "data-tour-nav": n.id },
    }));
    if (!squareShown) return sections;
    // The design seats the square between Prediction and Arkade. Anchoring it
    // to the Arkade entry keeps that relationship when an onboarding interest
    // reorders the sections; with no Arkade entry it falls to the end.
    //
    // /square is served by the Square app on this domain
    // (ADR-2026-09-16-square-microfrontend), so the entry is a document
    // navigation: a client-side link would look for the route in this app's
    // router and never render. The square is not in the reorderable section
    // list, so it is seated here by hand.
    const square: ChromeNavItem = {
      id: "square",
      label: squareLabel,
      icon: ArkNavIcons.square,
      target: { kind: "document", href: SQUARE_ZONE_PATH },
      dataAttributes: { "data-tour-nav": "square" },
    };
    const arkade = sections.findIndex((n) => n.id === "casino");
    const at = arkade === -1 ? sections.length : arkade;
    return [...sections.slice(0, at), square, ...sections.slice(at)];
  }, [items, squareShown, squareLabel]);

  return (
    <ArkSidebar
      id="app-sidebar"
      items={rows}
      activeId={activeSection}
      onSelect={(item) => onNavigate(item.id as DashboardSection)}
      Link={Link}
      // The dashboard alone wears the mARKet lockup: the two-tone only reads
      // on this dark chrome, so auth and the landing keep the Ark wordmark.
      brand={{ target: { kind: "link", href: "/portfolio" } }}
      primaryAction={<GoLiveControl variant="rail" />}
      person={{
        status: "signed-in",
        name: profile.name,
        avatar: <Avatar seed={profile.avatarSeed} />,
      }}
      profileDataAttributes={{ "data-tour": "profile" }}
      AccountMenu={AccountPopover}
      layout={props.layout === "rail" ? "rail" : props.drawerAtEveryWidth ? "drawer" : "responsive"}
      drawer={props.layout === "rail" ? undefined : { open: props.open, onClose: props.onClose }}
      labels={{ menu: t("menu"), closeMenu: t("closeMenu") }}
      classNames={{
        backdrop: "fixed inset-0",
        asideOpen: "translate-x-0",
        asideClosed: "-translate-x-full",
        nav: "flex min-h-0 flex-col gap-[3px] overflow-x-hidden overflow-y-auto",
        rowActive: "bg-accent/14 text-white",
        footer: "relative mt-auto shrink-0",
      }}
    />
  );
}
