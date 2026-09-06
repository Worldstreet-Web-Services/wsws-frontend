"use client";

import { SpotModeSwitch, useSpotMode } from "@/features/trade/components/spot-mode";
import { MarketsView } from "@/features/trade/components/markets-view";
import { SpotSimpleView } from "@/features/trade/components/spot-simple-view";
import { useTranslations } from "next-intl";
import type { BuyPayload, DetailPayload } from "@/lib/modal-types";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionVisibility } from "@/components/ui/section-visibility";

interface SpotSectionProps {
  onOpenDetail: (detail: DetailPayload) => void;
  onOpenBuy: (buy: BuyPayload) => void;
}

// On mobile the Explore tokens card now lives inside the portfolio section
// (above Customise Portfolio), so this section is desktop-only.
export function SpotSection({ onOpenDetail, onOpenBuy }: SpotSectionProps) {
  const { mode } = useSpotMode();
  const tSections = useTranslations("sections");

  return (
    <SectionVisibility className="mx-auto mt-8 w-full max-w-[1520px] p-4 sm:mt-0 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{tSections("spot")}</Eyebrow>
        <SpotModeSwitch />
      </div>
      <div className="mt-4">
        {mode === "pro" ? (
          <MarketsView />
        ) : (
          <SpotSimpleView onOpenDetail={onOpenDetail} onOpenBuy={onOpenBuy} />
        )}
      </div>
    </SectionVisibility>
  );
}
