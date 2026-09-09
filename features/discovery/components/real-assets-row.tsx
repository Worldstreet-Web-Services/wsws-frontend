"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Carousel } from "@/components/ui/carousel";
import { DiscoveryRow } from "@/features/discovery/components/discovery-row";
import {
  GoldCard,
  RealEstateCard,
  StocksCard,
  TreasuriesCard,
} from "@/features/discovery/components/real-assets-cards";
import type { RwaSpot } from "@/features/discovery/types";
import { useRotatingIndex } from "@/hooks/use-rotating-index";
import { interestToSection } from "@/lib/sections";

export interface RealAssetsRowProps {
  /** The reader's saved onboarding interest. The shelf shows only for one that maps to Real assets. */
  interest: string | null;
  spots: { gold: RwaSpot[]; treasuries: RwaSpot[]; realEstate: RwaSpot[]; stocks: RwaSpot[] };
}

// "Own the Real World": tokenised gold, treasuries, property and stocks, one
// card each, for the reader who said at onboarding that this is what they came
// for. The heading leads to the desk; every card's action does too.
//
// The stocks card rotates through the tokenised stocks every ten seconds. The
// rotation is owned here because the carousel draws each slide more than once
// and every copy must show the same stock.
export function RealAssetsRow({ interest, spots }: RealAssetsRowProps) {
  const t = useTranslations("discovery");
  const [holds, setHolds] = useState(0);
  const hold = useCallback((held: boolean) => setHolds((n) => n + (held ? 1 : -1)), []);
  const stockIndex = useRotatingIndex(spots.stocks.length, { paused: holds > 0 });

  if (interestToSection(interest) !== "rwa") return null;

  return (
    <DiscoveryRow
      title={t.rich("realAssetsTitle", {
        accent: (chunks) => <span className="text-[#f6d37a]">{chunks}</span>,
      })}
      href="/rwa"
    >
      <Carousel label={t("realAssetsCarousel")} trimPx={50}>
        <GoldCard spots={spots.gold} />
        <TreasuriesCard spots={spots.treasuries} />
        <RealEstateCard spots={spots.realEstate} />
        <StocksCard spots={spots.stocks} index={stockIndex} onHold={hold} />
      </Carousel>
    </DiscoveryRow>
  );
}
