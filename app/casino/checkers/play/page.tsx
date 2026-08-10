"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CasinoPage } from "@/components/dashboard/casino/casino-page";
import { CheckersPlay } from "@/components/dashboard/casino/draughts/checkers-play";
import { isMatchId } from "@/lib/casino/api/draughts-wire";

// A board is addressed by /casino/checkers/play?match=<id>, which is what an
// invite link carries.
function PlayRoute() {
  const params = useSearchParams();
  const matchId = params.get("match");
  const valid = matchId && isMatchId(matchId) ? matchId : null;

  if (!valid) {
    return (
      <p className="py-16 text-center font-sans text-[14px] text-white/50">
        That game link isn&rsquo;t valid.
      </p>
    );
  }
  return <CheckersPlay matchId={valid} />;
}

export default function CheckersPlayPage() {
  return (
    <CasinoPage hideFooter hideBackLink>
      <Suspense
        fallback={<p className="py-16 text-center font-sans text-[14px] text-white/50">Loading…</p>}
      >
        <PlayRoute />
      </Suspense>
    </CasinoPage>
  );
}
