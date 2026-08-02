"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ModalShell } from "@/components/ui/modal-shell";
import { PredictionCard } from "@/components/dashboard/prediction/prediction-card";
import { PredictionSlider } from "@/components/dashboard/prediction/prediction-slider";
import { PortfolioPanel } from "@/components/dashboard/prediction/positions-panel";
import { CreateMarketFlow } from "@/components/dashboard/prediction/create-market-flow";
import { useMarkets, useCategories } from "@/hooks/use-prediction-markets";

// Browse (Execution) view: the market grid with category filters, an entry to
// the create-market flow, and the portfolio panel underneath. Each card links to
// the market detail page where trading, liquidity, and resolution live.
export function PredictionView() {
  const t = useTranslations("prediction");
  const [desktop, setDesktop] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: markets, isLoading } = useMarkets("Open", category ?? undefined);
  const { data: categories } = useCategories();

  const tabs = useMemo(() => categories ?? [], [categories]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const list = markets ?? [];

  return (
    <div className="mx-auto w-full max-w-[1520px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 className="ws-display mt-2.5 text-[30px] tracking-[-0.02em]">{t("heading")}</h2>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="text-ink shrink-0 cursor-pointer rounded-xl bg-white px-4 py-2.5 font-sans text-[13px] font-semibold hover:opacity-90"
        >
          {t("createMarket")}
        </button>
      </div>

      {tabs.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              category === null
                ? "border-accent/45 bg-accent/12 text-white"
                : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8"
            }`}
          >
            {t("allCategories")}
          </button>
          {tabs.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                category === c
                  ? "border-accent/45 bg-accent/12 text-white"
                  : "border-white/10 bg-white/4 text-white/65 hover:bg-white/8"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-[18px]">
        {isLoading ? (
          <div className="ws-card px-6 py-12 text-center text-[13.5px] font-normal text-white/55">
            {t("loading")}
          </div>
        ) : list.length === 0 ? (
          <div className="ws-card px-6 py-12 text-center text-[13.5px] font-normal text-white/55">
            {t("noMarkets")}
          </div>
        ) : desktop ? (
          <div className="@container">
            <div className="grid grid-cols-2 gap-4 @min-[900px]:grid-cols-3 @min-[900px]:gap-6 @min-[1240px]:grid-cols-4 @min-[1240px]:gap-7">
              {list.map((m) => (
                <PredictionCard key={m.marketId.toString()} market={m} />
              ))}
            </div>
          </div>
        ) : (
          <PredictionSlider markets={list} />
        )}

        <PortfolioPanel />
      </div>

      <ModalShell open={creating} onClose={() => setCreating(false)} size="lg">
        <CreateMarketFlow onDone={() => setCreating(false)} />
      </ModalShell>
    </div>
  );
}
