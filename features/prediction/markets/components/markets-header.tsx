"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { ArkMark } from "@/components/ui/ark-mark";
import { useMoney } from "@/components/ui/currency-select";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useSportsFilters } from "../hooks/use-sports-markets";
import { CATEGORY_LINKS } from "../navigation-config";
import { isNormalSportCategory, type MarketCategory, type SportsLeagueKey } from "../types";
import { NavigationRail } from "./navigation-rail";

interface MarketsHeaderProps {
  activeCategory: MarketCategory;
  activeLeague: SportsLeagueKey;
}

const FRAME_CLASS = "mx-auto w-full max-w-[1340px] px-4 sm:px-5 xl:px-0";
const NAV_FRAME_CLASS = "mx-auto w-full max-w-[1340px] px-0 sm:px-5 xl:px-0";

function leagueBadge(name: string, slug: string): string {
  const initials = name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials.length >= 2 ? initials : slug.slice(0, 3).toUpperCase();
}

export function MarketsHeader({ activeCategory, activeLeague }: MarketsHeaderProps) {
  const { authenticated } = usePrivy();
  const portfolio = usePortfolio();
  const money = useMoney();
  const sportsCategory = isNormalSportCategory(activeCategory) ? activeCategory : "football";
  const sportsActive = isNormalSportCategory(activeCategory);
  const sportsFilters = useSportsFilters(sportsCategory, activeLeague || undefined, sportsActive);
  const leagueLinks = [
    {
      key: "all",
      label: `All ${sportsCategory === "football" ? "Football" : "Basketball"}`,
      badge: "ALL",
      href: `/prediction/markets?category=${sportsCategory}`,
    },
    ...sportsFilters.leagues.map((league) => ({
      key: league.slug,
      label: league.name,
      badge: leagueBadge(league.name, league.slug),
      href: `/prediction/markets?category=${sportsCategory}&league=${league.slug}`,
    })),
  ];
  const selectedLeague = activeLeague || "all";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#08090a]/95 backdrop-blur-xl">
      <div className="bg-[#08090a]">
        <div
          className={`${FRAME_CLASS} flex min-h-16 items-center py-3.5 sm:min-h-[72px] sm:py-[18px]`}
        >
          <Link
            href="/dashboard"
            aria-label="Open dashboard"
            className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
          >
            <ArkMark
              className="h-[22px] w-auto sm:h-[27px]"
              style={{ width: undefined, height: undefined }}
            />
          </Link>

          <Link
            href={authenticated ? "/dashboard" : "/auth"}
            aria-label={authenticated ? "Open portfolio balance" : "Log in"}
            className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-[9px] border border-white/12 bg-white/[0.055] px-3 transition-colors hover:bg-white/[0.085]"
          >
            {authenticated ? (
              <>
                <span className="text-[9px] font-bold tracking-[0.08em] text-white/38 uppercase">
                  {money.currency.code}
                </span>
                <span className="text-[12px] font-extrabold text-white tabular-nums">
                  {portfolio.loading
                    ? "…"
                    : portfolio.error
                      ? "—"
                      : money.format(portfolio.totalUsd)}
                </span>
              </>
            ) : (
              <span className="text-[12px] font-bold text-white/78">Log in</span>
            )}
          </Link>
        </div>
      </div>

      <div className="border-t border-white/7 bg-[#101114]">
        <div className={NAV_FRAME_CLASS}>
          <NavigationRail
            activeKey={activeCategory}
            ariaLabel="Market categories"
            items={CATEGORY_LINKS}
            variant="primary"
          />
        </div>
      </div>

      {sportsActive ? (
        <div className="border-t border-white/8 bg-[#09090a]">
          <div className={NAV_FRAME_CLASS}>
            {leagueLinks.length > 0 ? (
              <NavigationRail
                activeKey={selectedLeague}
                ariaLabel={`${sportsCategory} leagues`}
                items={leagueLinks}
                variant="secondary"
              />
            ) : (
              <div className="flex min-h-[58px] items-center gap-2 overflow-hidden py-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <span
                    key={index}
                    className="h-[42px] w-32 shrink-0 animate-pulse rounded-full border border-white/7 bg-white/[0.035]"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
