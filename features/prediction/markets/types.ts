import type { DiscoveryCategory } from "./api";

export type MarketCategory = "sports" | DiscoveryCategory;

export type SportsNavKey =
  "home" | "football" | "basketball" | "tennis" | "cricket" | "mlb" | "more";

export interface MarketNavItem<Key extends string> {
  key: Key;
  label: string;
  href: string;
}
