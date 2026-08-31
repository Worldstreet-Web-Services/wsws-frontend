import type { MarketCategory, MarketNavItem, SportsNavKey } from "./types";

export const CATEGORY_LINKS: Array<MarketNavItem<MarketCategory>> = [
  // Re-enable after Polymarket grants Combo Builder Gateway access.
  // { key: "sports", label: "Sports", href: "/prediction/markets?category=sports" },
  { key: "politics", label: "Politics", href: "/prediction/markets" },
  { key: "crypto", label: "Crypto", href: "/prediction/markets?category=crypto" },
  { key: "esports", label: "Esports", href: "/prediction/markets?category=esports" },
  { key: "iran", label: "Iran", href: "/prediction/markets?category=iran" },
  { key: "finance", label: "Finance", href: "/prediction/markets?category=finance" },
  {
    key: "geopolitics",
    label: "Geopolitics",
    href: "/prediction/markets?category=geopolitics",
  },
  { key: "tech", label: "Tech", href: "/prediction/markets?category=tech" },
  { key: "culture", label: "Culture", href: "/prediction/markets?category=culture" },
  { key: "economy", label: "Economy", href: "/prediction/markets?category=economy" },
  { key: "weather", label: "Weather", href: "/prediction/markets?category=weather" },
  { key: "mentions", label: "Mentions", href: "/prediction/markets?category=mentions" },
  { key: "elections", label: "Elections", href: "/prediction/markets?category=elections" },
];

export function marketCategoryLabel(category: MarketCategory) {
  return CATEGORY_LINKS.find((item) => item.key === category)?.label ?? category;
}

export const SPORTS_LINKS: Array<MarketNavItem<SportsNavKey>> = [
  { key: "home", label: "Home", href: "/prediction/markets" },
  { key: "football", label: "Football", href: "/prediction/markets?sport=football" },
  {
    key: "basketball",
    label: "Basketball",
    href: "/prediction/markets?sport=basketball",
  },
  { key: "tennis", label: "Tennis", href: "/prediction/markets?sport=tennis" },
  { key: "cricket", label: "Cricket", href: "/prediction/markets?sport=cricket" },
  { key: "mlb", label: "MLB", href: "/prediction/markets?sport=mlb" },
  { key: "more", label: "More Sports", href: "/prediction/markets?sport=more" },
];
