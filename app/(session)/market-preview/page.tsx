"use client";

// Temporary preview for the mobile market page (under (session) for providers,
// no AuthGuard so it renders headless). Delete once verified.
import { MobileMarketView } from "@/features/trade/components/mobile-market-view";

export default function MarketPreview() {
  return <MobileMarketView onOpenDetail={() => {}} onOpenBuy={() => {}} predictionSlot={null} />;
}
