"use client";

// Temporary preview harness for the ported promo rail (from new-approach-ui).
// Delete once verified.
import { KashBanner } from "@/features/portfolio/components/kash-banner";
import { PromoBanner, PromoRail } from "@/components/ui/promo-rail";

export default function PromoRailPreview() {
  const stakeBanner = (
    <PromoBanner
      href="/casino"
      title="Set the stake"
      subtitle="Everyone plays to win"
      background="#ed2b07"
      glyph="/market/promo-stake-flame.svg"
      scallop="/market/promo-stake-scallop.svg"
      art={[
        {
          src: "/market/promo-stake-glow-left.svg",
          top: -17.38,
          left: -19.85,
          width: 253.22,
          height: 253.22,
        },
        {
          src: "/market/promo-stake-glow-right.svg",
          top: -71.99,
          left: 188.68,
          width: 439.41,
          height: 439.41,
        },
      ]}
    />
  );

  return (
    <div className="min-h-screen bg-[#0b0b0b] p-8">
      <div className="mx-auto w-full max-w-[1520px]">
        <PromoRail label="Promotions">
          {stakeBanner}
          <KashBanner onBuy={() => {}} />
          {stakeBanner}
        </PromoRail>
      </div>
    </div>
  );
}
