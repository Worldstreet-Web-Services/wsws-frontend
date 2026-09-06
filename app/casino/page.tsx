"use client";

import { ArkadeMobile, CasinoPage, HubSection } from "@/features/casino";

export default function CasinoHubPage() {
  return (
    <CasinoPage>
      {/* Phone gets the mobile hub; from md up the desktop grid stands. Both are
          cheap to mount (they share the portfolio query), so this branches with
          markup rather than a viewport hook. */}
      <div className="md:hidden">
        <ArkadeMobile />
      </div>
      <div className="hidden md:block">
        <HubSection />
      </div>
    </CasinoPage>
  );
}
