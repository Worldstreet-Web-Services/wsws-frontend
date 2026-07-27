"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ModalShell } from "@/components/ui/modal-shell";
import { PredictionCard } from "@/components/dashboard/prediction/prediction-card";
import { PredictionSlider } from "@/components/dashboard/prediction/prediction-slider";
import { BetModal } from "@/components/dashboard/prediction/bet-modal";
import { BetSlipSheet } from "@/components/dashboard/prediction/bet-slip-sheet";
import { PositionsPanel } from "@/components/dashboard/prediction/positions-panel";
import { usePredictions } from "@/hooks/use-predictions";
import { usePolymarketAccess } from "@/hooks/use-polymarket-access";
import { usePolymarketPositions, type PolymarketPosition } from "@/hooks/use-polymarket-positions";
import { usePolymarketRedeem } from "@/hooks/use-polymarket-redeem";
import { PREDICTIONS } from "@/lib/data/dashboard";
import { toast } from "@/lib/toast";
import type { Prediction } from "@/lib/types";

export function PredictionView() {
  const [desktop, setDesktop] = useState(false);
  const [bet, setBet] = useState<{ p: Prediction; side: "yes" | "no" } | null>(null);
  const [slip, setSlip] = useState<PolymarketPosition | null>(null);
  const access = usePolymarketAccess();
  const positions = usePolymarketPositions();
  const redeem = usePolymarketRedeem();
  const { data: live } = usePredictions();

  const onRedeem = async (conditionId: string) => {
    try {
      await redeem.redeem(conditionId);
      // Winnings settle as pUSD in the prediction account (shown as "available to
      // bet"), not as USDC. Don't assert an amount: a resolved position that lost
      // claims nothing.
      toast.success("Claim submitted. Any winnings show up in your prediction balance.");
      setSlip(null);
      positions.refresh();
    } catch {
      toast.error(redeem.error ?? "Could not claim your winnings.");
    }
  };

  // Live Polymarket markets, with the static set as a fallback so the section
  // never blanks if the feed is briefly unavailable.
  const predictions = live && live.length > 0 ? live : PREDICTIONS;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const openBet = (p: Prediction, yes: boolean) => setBet({ p, side: yes ? "yes" : "no" });

  return (
    <div className="mx-auto w-full max-w-[1520px] p-4 sm:p-6 lg:p-8">
      <Eyebrow>Prediction markets</Eyebrow>
      <h2 className="ws-serif mt-2.5 text-[30px] tracking-[-0.02em]">Trade your conviction</h2>

      {!access.allowed ? (
        <div className="ws-card mt-[18px] flex flex-col items-center gap-2 px-6 py-12 text-center">
          <div className="ws-serif text-[22px]">Not available in your region</div>
          <p className="max-w-[360px] text-[13.5px] font-normal text-white/55">
            Prediction markets aren&apos;t offered where you are right now. The rest of World Street
            stays fully available.
          </p>
        </div>
      ) : (
        <div className="mt-[18px]">
          {desktop ? (
            // Non-mobile: a fixed 2 rows x 4 columns grid (up to 8 markets).
            <div className="grid grid-cols-4 gap-3.5">
              {predictions.slice(0, 8).map((p) => (
                <PredictionCard key={p.q} prediction={p} onBuy={(yes) => openBet(p, yes)} />
              ))}
            </div>
          ) : (
            <PredictionSlider predictions={predictions} onBuy={openBet} />
          )}

          <PositionsPanel
            positions={positions.positions}
            available={positions.available}
            loading={positions.loading}
            loaded={positions.loaded}
            error={positions.error}
            onRefresh={positions.refresh}
            onOpenSlip={setSlip}
            onRedeem={onRedeem}
            redeemingId={redeem.redeeming}
          />
        </div>
      )}

      <BetModal
        prediction={bet?.p ?? null}
        side={bet?.side ?? "yes"}
        onClose={() => setBet(null)}
        onPlaced={positions.refresh}
      />

      <ModalShell open={slip !== null} onClose={() => setSlip(null)}>
        {slip ? (
          <BetSlipSheet position={slip} onClaim={onRedeem} claiming={redeem.redeeming != null} />
        ) : null}
      </ModalShell>
    </div>
  );
}
