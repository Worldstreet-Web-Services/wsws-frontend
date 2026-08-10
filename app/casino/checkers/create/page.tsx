"use client";

import { CasinoPage } from "@/components/dashboard/casino/casino-page";
import { CheckersLobby } from "@/components/dashboard/casino/draughts/checkers-lobby";

// Setting up a game: time control, stake, then the invite link to share.
export default function CheckersCreatePage() {
  return (
    <CasinoPage hideFooter hideBackLink>
      <CheckersLobby />
    </CasinoPage>
  );
}
