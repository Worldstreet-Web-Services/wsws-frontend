"use client";

import { useState } from "react";
import { CurvedTabBar } from "@/components/layout/curved-tab-bar";
import type { SectionId } from "@/lib/sections";

// TEMPORARY preview harness for the curved bottom nav (Figma 104:2688). Buttons
// switch the active section to check the glow + label. Delete once signed off.
// NOTE: this harness renders `left-1/2` ~12% right of centre because of a
// layout-level containing-block offset that also shifts a bare marker; the real
// dashboard is unaffected. See the notes in the conversation.
export default function NavPreviewPage() {
  const [active, setActive] = useState<SectionId>("portfolio");
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0d0d0f] p-4">
      <div className="flex gap-2">
        {(["portfolio", "spot", "casino", "perps"] as SectionId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`rounded-full px-3 py-1.5 text-[12px] ${active === id ? "bg-white text-black" : "bg-white/10 text-white"}`}
          >
            {id}
          </button>
        ))}
      </div>
      <CurvedTabBar
        items={[]}
        activeSection={active}
        onNavigate={(id) => setActive(id)}
        onOpenMore={() => window.alert("open drawer")}
      />
    </div>
  );
}
