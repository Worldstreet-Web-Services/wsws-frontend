import type { ComboSport } from "./api";
import type { SportsNavKey } from "./types";

export interface ComboSportSource {
  sport: ComboSport;
  label: string;
}

const SPORTS_NAV_TO_COMBO: Partial<Record<SportsNavKey, readonly ComboSportSource[]>> = {
  home: [{ sport: "soccer", label: "Football" }],
  football: [{ sport: "soccer", label: "Football" }],
  basketball: [{ sport: "basketball", label: "Basketball" }],
  tennis: [{ sport: "tennis", label: "Tennis" }],
  cricket: [{ sport: "cricket", label: "Cricket" }],
  mlb: [{ sport: "mlb", label: "MLB" }],
  more: [
    { sport: "nfl", label: "NFL" },
    { sport: "ufc", label: "UFC" },
  ],
};

export function comboSportsForNavigation(key: SportsNavKey): readonly ComboSportSource[] {
  return SPORTS_NAV_TO_COMBO[key] ?? [];
}
