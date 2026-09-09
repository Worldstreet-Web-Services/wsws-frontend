"use client";

import { AppModalHost, useAppModals } from "@/components/layout/modals/app-modals";
import { SpotDesktopView } from "@/features/trade/components/spot-desktop-view";
import { SpotSection } from "@/features/trade/components/spot-section";
import { useIsMobile } from "@/hooks/use-is-mobile";

// Spot as its own page, like Prediction and Arkade. Two interfaces, picked by
// width rather than drawn on top of each other: the phone keeps SpotSection
// (the market list, the mode switch and the sheet flow), and a desktop gets the
// 2.0 desk, with the market list and the order ticket side by side.
//
// The branch runs on useIsMobile rather than `md:` classes because both trees
// mount a data hook and a hidden one would pay for a market feed nobody sees.
//
// The desk hands its Sell up to the modal host here: selling needs the origin
// network, the gas check and the exact held balance, all of which the existing
// sell sheet already knows how to ask for.
//
// The auth guard and the app shell come from the (app) layout.
export default function SpotPage() {
  const isMobile = useIsMobile();
  const modals = useAppModals();

  if (isMobile) return <SpotSection />;

  return (
    <>
      <SpotDesktopView onSell={modals.openSell} />
      <AppModalHost active={modals.modal} onClose={modals.close} onConfirmed={modals.showDone} />
    </>
  );
}
