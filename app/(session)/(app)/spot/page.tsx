"use client";

import { SpotSection } from "@/features/trade/components/spot-section";

// Spot as its own page, like Prediction and Arkade: the market list and the pro
// terminal. Tapping a token in the simple list opens its own page (/spot/[id])
// rather than a popup, so the modal host that fed the old detail sheet is gone.
// The auth guard and the app shell come from the (app) layout.
export default function SpotPage() {
  return <SpotSection />;
}
