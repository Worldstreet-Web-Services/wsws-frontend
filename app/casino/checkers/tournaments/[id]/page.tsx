"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { CasinoPage } from "@/components/dashboard/casino/casino-page";
import { SwissDetailSection } from "@/components/dashboard/casino/chess/swiss/detail-section";

// The standings, pairings and round controls are game-agnostic; a draughts
// pairing simply opens its board on the checkers surface.
export default function CheckersTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const created = useSearchParams().get("created") === "1";
  return (
    <CasinoPage hideFooter>
      <SwissDetailSection tournamentId={id} showCreatedShare={created} />
    </CasinoPage>
  );
}
