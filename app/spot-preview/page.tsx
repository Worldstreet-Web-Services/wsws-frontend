"use client";

import { useState } from "react";
import { MobileSpotPage } from "@/features/trade/components/mobile-spot-page";

// TEMPORARY preview harness for the mobile Spot Trading page (node 251:16288).
// The chart and order slots stand in for the section's real components. Delete
// this route once the page is signed off. View at a phone width.
export default function SpotPreviewPage() {
  const [open, setOpen] = useState(true);
  return (
    <div className="grid min-h-screen place-items-center bg-black">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
      >
        Open Spot page
      </button>
      <MobileSpotPage
        open={open}
        onClose={() => setOpen(false)}
        base="BTC"
        quote="USDC"
        price={64072.55}
        change24h={-2.2}
        balance={1240}
        chart={
          <div className="ws-card grid h-[250px] place-items-center text-[20px] font-medium text-white/25">
            Chart
          </div>
        }
      />
    </div>
  );
}
