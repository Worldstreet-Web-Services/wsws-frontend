"use client";

import { PromoCarousel } from "@/components/ui/promo-deck";
import { KashBanner } from "@/features/portfolio/components/kash-banner";
import { SquareLiveBannerCard } from "@/components/ui/square-live-banner";

// TEMPORARY preview for the promo-deck banner animations (Kash coins, Market
// Square headline) inside the rotating deck: the 5s rotation runs and each
// banner's entrance replays when it returns to the front. Delete once the
// animations are signed off. View at phone width.
export default function KashAnimPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-md bg-black p-4">
      <PromoCarousel>
        <KashBanner onBuy={() => {}} />
        <SquareLiveBannerCard href="#preview" />
        <div className="h-[72px] w-full rounded-lg bg-white/10" />
      </PromoCarousel>
    </div>
  );
}
