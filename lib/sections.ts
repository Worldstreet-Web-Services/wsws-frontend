// Spot carries its own simple/pro interface switch inside.
export type SectionId =
  "portfolio" | "spot" | "meme" | "prediction" | "earn" | "casino" | "activity";

export const SECTION_LABEL: Record<SectionId, string> = {
  portfolio: "Portfolio",
  spot: "Spot",
  meme: "Memecoins",
  prediction: "Prediction",
  earn: "Earn",
  casino: "Arkade",
  activity: "Activity",
};

// Portfolio is always the account home. The rest follow, led by whatever the
// user picked during onboarding.
const PINNED: SectionId = "portfolio";
const REORDERABLE: SectionId[] = [
  "spot",
  "meme",
  "prediction",
  // Earn is hidden from the nav for now.
  // "earn",
  "casino",
  "activity",
];

// Sections kept out of the navigation for now: a visibility switch, not a
// removal. buildNav in components/layout/nav-items.tsx is the single reader,
// so the desktop rail, the phone drawer, the marquee and the dashboard's brief
// order all drop a hidden section together. Empty on this build.
export const HIDDEN_NAV_SECTIONS: readonly SectionId[] = [];

// Sections that are their own page rather than an anchor.
export const SECTION_ROUTES: Partial<Record<SectionId, string>> = {
  portfolio: "/portfolio",
  spot: "/spot",
  meme: "/meme",
  casino: "/casino",
  earn: "/earn",
  prediction: "/prediction",
  activity: "/activity",
};

// The section a path belongs to, for the rail's highlight: the route whose
// prefix matches, so /prediction/event/abc lights Prediction, or portfolio,
// which is the account home. A route fact, so the shell can derive it once
// for every page; only the portfolio overrides it, from its scroll position.
export function sectionForPathname(pathname: string | null): SectionId {
  if (!pathname) return "portfolio";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "portfolio";
  for (const [id, route] of Object.entries(SECTION_ROUTES) as [SectionId, string][]) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return id;
  }
  return "portfolio";
}

// Maps an onboarding interest to the section it should surface first.
const INTEREST_TO_SECTION: Record<string, SectionId> = {
  // Stocks, gold, yield, real estate and treasuries pointed at Real assets,
  // which is not on this build; those interests fall back to the default order.
  crypto: "spot",
  // Perpetuals are not on this build; the interest falls back to the default order.
  meme: "meme",
  prediction: "prediction",
  casino: "casino",
  // Earn is hidden from the nav for now; the interest falls back to the default order.
  // earn: "earn",
};

export function interestToSection(interest: string | null): SectionId | null {
  if (!interest) return null;
  return INTEREST_TO_SECTION[interest] ?? null;
}

// The section order for a given preference: portfolio, then the preferred
// section, then the remaining sections in their default order.
export function orderedSections(interest: string | null): SectionId[] {
  const preferred = interestToSection(interest);
  if (!preferred) return [PINNED, ...REORDERABLE];
  const rest = REORDERABLE.filter((s) => s !== preferred);
  return [PINNED, preferred, ...rest];
}
