"use client";

import { CasinoPage } from "@/components/dashboard/casino/casino-page";
import { SwissListSection } from "@/components/dashboard/casino/chess/swiss/list-section";

// Swiss tournaments are one service-level feature shared by both board games,
// so the list is the same component filtered to the draughts ones.
export default function CheckersTournamentsPage() {
  return (
    <CasinoPage hideFooter>
      <SwissListSection game="draughts" />
    </CasinoPage>
  );
}
