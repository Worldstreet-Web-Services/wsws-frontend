import type { MarketCategory, SportsNavKey } from "./types";

const MARKET_CATEGORIES = new Set<MarketCategory>([
  "politics",
  "crypto",
  "esports",
  "iran",
  "finance",
  "geopolitics",
  "tech",
  "culture",
  "economy",
  "weather",
  "mentions",
  "elections",
]);

const SPORTS_NAV_KEYS = new Set<SportsNavKey>([
  "home",
  "football",
  "basketball",
  "tennis",
  "cricket",
  "mlb",
  "more",
]);

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolveMarketNavigation(params: Record<string, string | string[] | undefined>) {
  const requestedCategory = readParam(params.category);
  const requestedSport = readParam(params.sport);
  const activeCategory = MARKET_CATEGORIES.has(requestedCategory as MarketCategory)
    ? (requestedCategory as MarketCategory)
    : "politics";
  const activeSportsNav = SPORTS_NAV_KEYS.has(requestedSport as SportsNavKey)
    ? (requestedSport as SportsNavKey)
    : "home";

  return { activeCategory, activeSportsNav };
}
