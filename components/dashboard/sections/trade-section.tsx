"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PerpModeSwitch } from "@/components/dashboard/trade/perp-mode";
import { PerpsView } from "@/components/dashboard/trade/perps-view";
import { MarketsView } from "@/components/dashboard/views/markets-view";

// The trade hub: spot markets and perpetuals under one section, chosen with a
// top tab so the two surfaces don't clutter the sidebar. Spot shows the markets
// terminal; Perpetuals shows the perps desk, which keeps its own simple/pro
// switch (surfaced here in the header when that tab is active). Only the active
// tab's body mounts, so its data hooks don't run in the background.

type Tab = "spot" | "perps";

const TABS: { id: Tab; label: string }[] = [
  { id: "spot", label: "Spot" },
  { id: "perps", label: "Perpetuals" },
];

export function TradeSection() {
  const [tab, setTab] = useState<Tab>("spot");
  const onPerps = tab === "perps";

  return (
    <div className="mx-auto w-full max-w-[1520px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Trade</Eyebrow>
          <div
            className="ws-inset mt-3.5 inline-grid grid-cols-2 gap-1 p-1"
            role="tablist"
            aria-label="Trade market type"
          >
            {TABS.map(({ id, label }) => {
              const on = id === tab;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(id)}
                  className={`cursor-pointer rounded-xl px-6 py-2 font-sans text-[13.5px] font-semibold transition-colors ${
                    on
                      ? "bg-accent/16 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
                      : "text-white/55 hover:text-white/80"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        {onPerps ? <PerpModeSwitch /> : null}
      </div>

      <div className="mt-4">{onPerps ? <PerpsView /> : <MarketsView />}</div>
    </div>
  );
}
