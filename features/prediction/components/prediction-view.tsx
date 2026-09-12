"use client";

import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@/components/ui/icons";
import { PredictionCard } from "@/features/prediction/components/prediction-card";
import { BetModal } from "@/features/prediction/components/bet-modal";
import { predictionDetailHref } from "@/features/prediction/gamma-category";
import { PredictionPositions } from "@/features/prediction/components/prediction-positions";
import { LocalPredictionView } from "@/features/prediction/components/local-prediction-view";
import { usePredictions } from "@/features/prediction/hooks/use-predictions";
import { usePolymarketAccess } from "@/features/prediction/hooks/use-polymarket-access";
import { usePolymarketPositionsController } from "@/features/prediction/hooks/use-polymarket-positions-controller";
import { PREDICTIONS } from "@/lib/data/dashboard";
import type { Prediction } from "@/lib/types";

export function PredictionView({ showAll = false }: { showAll?: boolean }) {
  const t = useTranslations("prediction");
  const [desktop, setDesktop] = useState(false);
  // Which prediction system is shown: the live Polymarket markets or our own
  // on-chain CPMM markets ("Local"). Both coexist; the user picks.
  const [source, setSource] = useState<"polymarket" | "local">("polymarket");
  const [bet, setBet] = useState<{ p: Prediction; side: "yes" | "no" } | null>(null);
  const access = usePolymarketAccess();
  // The Polymarket positions flow (claim, sell, cash-out) lives in a shared
  // hook so this page and the phone Market prediction tab run the same code.
  const positionsCtl = usePolymarketPositionsController();
  const { data: live } = usePredictions();

  // Live Polymarket markets, with the static set as a fallback so the section
  // never blanks if the feed is briefly unavailable.
  const predictions = live && live.length > 0 ? live : PREDICTIONS;
  const visiblePredictions = showAll ? predictions : predictions.slice(0, 8);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Source switch: live Polymarket markets vs our on-chain CPMM markets. */}
        <div className="inline-flex gap-1 rounded-xl bg-white/5 p-1">
          {(["polymarket", "local"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`cursor-pointer rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                source === s ? "bg-white/12 text-white" : "text-white/50 hover:text-white/75"
              }`}
            >
              {t(`sourceTab_${s}`)}
            </button>
          ))}
        </div>

        {/* The way into the full Explore market: every category, the sportsbook
          and the combos desk, at /prediction/markets. */}
        {!showAll && source === "polymarket" ? (
          <Link
            href="/prediction/markets"
            className="group inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.055))] px-4 text-[13px] font-semibold text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color,color,transform] hover:-translate-y-px hover:border-white/20 hover:text-white"
          >
            {t("exploreAllMarkets")}
            <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>

      {source === "local" ? (
        <div className="mt-[18px]">
          <LocalPredictionView />
        </div>
      ) : !access.allowed ? (
        <div className="ws-card mt-[18px] flex flex-col items-center gap-2 px-6 py-12 text-center">
          <div className="ws-display text-[22px]">{t("regionBlockedTitle")}</div>
          <p className="max-w-[360px] text-[13.5px] font-normal text-white/55">
            {t("regionBlockedBody", { brand: BRAND })}
          </p>
        </div>
      ) : (
        <div className="mt-[18px]">
          {desktop ? (
            // Non-mobile: up to 8 markets in a grid whose column count follows
            // the CONTENT width, not the viewport — with the sidebar open an
            // iPad's 768-1024px viewport leaves ~520-780px of content, where a
            // fixed four-up crushed every card. Two columns is the floor;
            // three and four step in as the container genuinely fits them.
            <div className="@container">
              <div className="grid grid-cols-2 gap-4 @min-[900px]:grid-cols-3 @min-[900px]:gap-6 @min-[1240px]:grid-cols-4 @min-[1240px]:gap-7">
                {visiblePredictions.map((p) => (
                  <PredictionCard
                    key={p.q}
                    prediction={p}
                    onBuy={(yes) => openBet(p, yes)}
                    href={predictionDetailHref(p)}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Mobile: the cards stacked in a single vertical column rather than
            // a horizontal slider, so the whole set reads on one scroll.
            <div className="flex flex-col gap-3">
              {visiblePredictions.map((p) => (
                <PredictionCard
                  key={p.q}
                  prediction={p}
                  onBuy={(yes) => openBet(p, yes)}
                  href={predictionDetailHref(p)}
                />
              ))}
            </div>
          )}

          <PredictionPositions controller={positionsCtl} />
        </div>
      )}

      <BetModal
        prediction={bet?.p ?? null}
        side={bet?.side ?? "yes"}
        onClose={() => setBet(null)}
        onPlaced={positionsCtl.positions.refresh}
      />
    </div>
  );
}
