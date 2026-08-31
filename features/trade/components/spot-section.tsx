"use client";

import { SpotModeSwitch, useSpotMode } from "@/features/trade/components/spot-mode";
// Dynamic: the pro desk carries lightweight-charts and a data-table, and it
// only renders for someone who has flipped the mode switch. Statically
// imported it shipped in every dashboard payload, including the default
// simple view that draws no chart at all.
const MarketsView = dynamic(
  () => import("@/features/trade/components/markets-view").then((m) => m.MarketsView),
  { ssr: false }
);
import { SpotSimpleView } from "@/features/trade/components/spot-simple-view";
import type { BuyPayload, DetailPayload } from "@/lib/modal-types";

interface SpotSectionProps {
  onOpenDetail: (detail: DetailPayload) => void;
  onOpenBuy: (buy: BuyPayload) => void;
}

// On mobile the Explore tokens card now lives inside the portfolio section
// (above Customise Portfolio), so this section is desktop-only.
export function SpotSection({ onOpenDetail, onOpenBuy }: SpotSectionProps) {
  const { mode } = useSpotMode();

  return (
    <div className="mx-auto hidden w-full max-w-[1520px] p-4 sm:p-6 md:block lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <SpotModeSwitch />
      </div>
      <div className="mt-4">
        {mode === "pro" ? (
          <MarketsView />
        ) : (
          <SpotSimpleView onOpenDetail={onOpenDetail} onOpenBuy={onOpenBuy} />
        )}
      </div>
    </div>
  );
}
