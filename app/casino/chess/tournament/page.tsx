"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CasinoPage } from "@/components/dashboard/casino/casino-page";
import { SwissDetailSection } from "@/components/dashboard/casino/chess/swiss-detail-section";

function SwissFromParams() {
  return <SwissDetailSection swissId={useSearchParams()?.get("id") ?? null} />;
}

export default function ChessTournamentPage() {
  return (
    <CasinoPage>
      <Suspense fallback={null}>
        <SwissFromParams />
      </Suspense>
    </CasinoPage>
  );
}
