"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { ArkMark } from "@/components/ui/ark-mark";
import { Avatar } from "@/components/ui/avatar";
import { CloseIcon } from "@/components/ui/icons";
import { deriveProfile } from "@/lib/user";
import { CATEGORY_LINKS, SPORTS_LINKS } from "../navigation-config";
import type { MarketCategory, SportsNavKey } from "../types";
import { NavigationRail } from "./navigation-rail";

interface MarketsHeaderProps {
  activeCategory: MarketCategory;
  activeSportsNav: SportsNavKey;
}

const FRAME_CLASS = "mx-auto w-full max-w-[1340px] px-4 sm:px-5 xl:px-0";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function MarketsHeader({ activeCategory, activeSportsNav }: MarketsHeaderProps) {
  const { authenticated, user } = usePrivy();
  const profile = deriveProfile(user);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-black">
      <div className="bg-black">
        <div className={`${FRAME_CLASS} flex min-h-[72px] items-center py-[18px]`}>
          <Link
            href="/"
            aria-label="Ark home"
            className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
          >
            <ArkMark
              className="h-[24px] w-auto sm:h-[27px]"
              style={{ width: undefined, height: undefined }}
            />
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/prediction#how"
              className="hidden px-3 py-2 text-[13px] font-semibold text-white/52 transition-colors hover:text-white md:block"
            >
              How it works
            </Link>

            {authenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-[10px] border border-white/12 bg-white/[0.055] px-3.5 py-2 text-[13px] font-semibold text-white/75 transition-colors hover:bg-white/[0.085] md:block"
                >
                  Portfolio
                </Link>
                <Link
                  href="/dashboard"
                  aria-label="Open account"
                  className="flex h-10 max-w-[190px] items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.055] p-1.5 pr-3 transition-colors hover:bg-white/[0.085]"
                >
                  <Avatar seed={profile.avatarSeed} size={28} />
                  <span className="hidden truncate text-[12.5px] font-semibold text-white/75 sm:block">
                    {profile.name}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="hidden rounded-[10px] border border-white/12 px-3.5 py-2 text-[13px] font-semibold text-white/75 hover:bg-white/6 sm:block"
                >
                  Log in
                </Link>
                <Link
                  href="/auth"
                  className="rounded-[10px] bg-white px-3.5 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-88"
                >
                  Sign up
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="grid size-10 cursor-pointer place-items-center rounded-[10px] border border-white/12 bg-white/[0.055] text-white/70 hover:bg-white/[0.085] lg:hidden"
            >
              {menuOpen ? <CloseIcon size={17} /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/7 bg-[#0d0d0f] lg:hidden">
          <div className={`${FRAME_CLASS} grid grid-cols-2 gap-2 py-3`}>
            <Link
              href="/prediction#how"
              className="rounded-[10px] bg-white/5 px-3.5 py-3 text-[13px] font-semibold text-white/70"
            >
              How it works
            </Link>
            <Link
              href="/dashboard"
              className="rounded-[10px] bg-white/5 px-3.5 py-3 text-[13px] font-semibold text-white/70"
            >
              Portfolio
            </Link>
          </div>
        </div>
      ) : null}

      <div className="border-t border-white/7 bg-[#121214]">
        <div className={FRAME_CLASS}>
          <NavigationRail
            activeKey={activeCategory}
            ariaLabel="Market categories"
            items={CATEGORY_LINKS}
            variant="primary"
          />
        </div>
      </div>

      {activeCategory === "sports" ? (
        <div className="border-t border-white/8 bg-[#09090a]">
          <div className={FRAME_CLASS}>
            <NavigationRail
              activeKey={activeSportsNav}
              ariaLabel="Sports navigation"
              items={SPORTS_LINKS}
              variant="secondary"
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
