"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MarketLogo } from "@/components/ui/market-logo";
import { Avatar } from "@/components/ui/avatar";
import type { NavItem } from "@/components/layout/nav-items";
import type { DashboardSection } from "@/lib/modal-types";
import { truncateAddress } from "@/lib/format";
import { deriveProfile, getWalletAddress } from "@/lib/user";
import { MARKET_SQUARE_HIDDEN, marketSquareHref } from "@/lib/market-square";

/** Four seats around an open square — people gathered, not a shop front. */
function SquareIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.6" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.6" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * One exported SVG per nav glyph, straight from the design file.
 *
 * Each was exported in the state its row happened to be in: Portfolio was the
 * selected row, so its file carries full-strength white, while the other seven
 * bake in the 60% wash of an unselected row. The bytes are used as exported
 * rather than recoloured, so the only correction the rail makes is dimming the
 * Portfolio glyph when its row is not the active one. `earn` is absent from the
 * design and from the nav order, and falls back to the section's own icon.
 */
// The design's own glyph exports. Figma bakes each icon at the opacity of the
// row it was drawn in, so the inactive rows came out at 0.6 and Portfolio, the
// selected one, at full strength. The baked value is stripped from the files so
// every glyph is state-neutral and the row below decides how bright it is.
// `earn` has no glyph in the design and keeps its own icon component.
const NAV_GLYPH: Partial<Record<NavItem["id"], string>> = {
  portfolio: "/market/sidebar-icon-portfolio.svg",
  spot: "/market/sidebar-icon-spot.svg",
  perps: "/market/sidebar-icon-perps.svg",
  meme: "/market/sidebar-icon-meme.svg",
  rwa: "/market/sidebar-icon-rwa.svg",
  prediction: "/market/sidebar-icon-prediction.svg",
  casino: "/market/sidebar-icon-arkade.svg",
  activity: "/market/sidebar-icon-arktivity.svg",
};

interface SidebarProps {
  items: NavItem[];
  activeSection: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onOpenAccount: () => void;
  /** Phone drawer state. Ignored from `md` up, where the sidebar is always shown. */
  open: boolean;
  onClose: () => void;
}

// The app's left rail. From `md` up it is fixed and always visible. On a phone
// it is a drawer: off-canvas until the topbar's menu button opens it, then it
// slides in over a dimmed page with the logo at its top, and closes on a
// choice, on the backdrop, on Escape, or on its own close button. One
// component for both, so the nav can never differ between the two.
export function Sidebar({
  items,
  activeSection,
  onNavigate,
  onOpenAccount,
  open,
  onClose,
}: SidebarProps) {
  const { user } = usePrivy();
  const profile = deriveProfile(user);
  // The rail names the wallet that holds the money, not the login. Falls back
  // to the email so the second line is never blank while wallets are still
  // being created.
  const address = getWalletAddress(user, "ethereum");
  const subtitle = address ? truncateAddress(address) : profile.email;
  const t = useTranslations("topbar");
  // Null while the square is hidden, which is the same state a deployment
  // without the URL is in, so the entry below needs no second condition.
  const squareHref = MARKET_SQUARE_HIDDEN ? null : marketSquareHref();

  // While the drawer is open the page behind it does not scroll, and Escape
  // closes it. Both undone on close and on unmount.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const choose = (id: DashboardSection) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* The dimmed page behind the phone drawer. */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-[105] bg-black/60 backdrop-blur-[3px] transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        id="app-sidebar"
        aria-label={t("menu")}
        className={`bg-panel fixed top-0 bottom-0 left-0 z-[110] flex w-[280px] flex-col border-r border-white/8 px-4 py-5 transition-transform duration-300 ease-out md:z-100 md:w-[248px] md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 pb-5">
          {/* The dashboard alone wears the mARKet lockup: the two-tone only
              reads on this dark chrome, so auth and the landing keep the Ark
              wordmark. */}
          <Link href="/dashboard" onClick={onClose} className="flex items-center">
            <MarketLogo className="h-[21px] w-[130px]" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="grid size-9 cursor-pointer place-items-center rounded-full border border-white/12 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Market Square sits ABOVE the product sections, not among them.
            The PRD makes it the platform's social and discovery surface — the
            thing that makes every other section visible to other people — so
            burying it in the list would rank it as one product among nine.
            It is a sibling deployment, hence a link and an outbound mark; with
            the URL unset it renders nothing rather than a dead entry.
            Hidden for now: see MARKET_SQUARE_HIDDEN in lib/market-square.ts. */}
        {squareHref !== null ? (
          <>
            <a
              href={squareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-[11px] text-left font-sans text-[14.5px] font-medium text-white transition-colors hover:bg-violet-500/16"
            >
              <span className="grid h-5 w-5 place-items-center">
                <SquareIcon size={20} />
              </span>
              <span className="flex-1">Market Square</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7 17L17 7M17 7H9M17 7v8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <div className="mb-3 h-px bg-white/8" />
          </>
        ) : null}

        <nav className="flex flex-col gap-[3px]">
          {items.map((n) => {
            const active = activeSection === n.id;
            const glyph = NAV_GLYPH[n.id];
            return (
              <button
                key={n.id}
                data-tour-nav={n.id}
                onClick={() => choose(n.id)}
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-[11px] text-left font-sans text-[14.5px] leading-[21.75px] font-medium transition-colors ${
                  active
                    ? "bg-accent/14 text-white"
                    : "text-white/60 hover:bg-white/6 hover:text-white"
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center transition-opacity ${
                    active ? "" : "opacity-60 group-hover:opacity-100"
                  }`}
                >
                  {glyph ? (
                    <img src={glyph} alt="" width={20} height={20} className="block size-5" />
                  ) : (
                    <n.icon size={20} />
                  )}
                </span>
                <span className="flex-1">{n.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          data-tour="profile"
          onClick={() => {
            onOpenAccount();
            onClose();
          }}
          className="mt-auto flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 px-2 py-2.5 text-left hover:bg-white/4"
        >
          <Avatar seed={profile.avatarSeed} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-sans text-[13px] leading-[19.5px] font-medium text-white">
              {profile.name}
            </span>
            <span className="tnum block truncate font-serif text-[10px] leading-[15.8px] font-medium text-white/45">
              {subtitle}
            </span>
          </span>
          <img
            src="/market/sidebar-icon-switch.svg"
            alt=""
            width={16}
            height={16}
            className="block size-4 shrink-0"
          />
        </button>
      </aside>
    </>
  );
}
