"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePrivy } from "@privy-io/react-auth";
import { usePortfolio } from "@/hooks/use-portfolio";
import { getWalletAddress } from "@/lib/user";
import { DecaneSignIn } from "@/features/migrate/components/decane-sign-in";
import { AssetReview } from "@/features/migrate/components/asset-review";
import { SweepProgress } from "@/features/migrate/components/sweep-progress";
import { useDecaneDestinations } from "@/features/migrate/hooks/use-decane-destinations";
import { useSweep } from "@/features/migrate/hooks/use-sweep";
import { buildSweepPlan, type ChainSweep } from "@/features/migrate/lib/plan";

// The whole migration flow: sign in to the OLD Privy account (whose wallets
// sign the transfers), sign in to Decane (mints the new wallets), review every
// balance that will move, sweep, then a summary with per-item retry. Runs
// inside app/migrate/layout.tsx, the app's only remaining PrivyProvider.
export function MigrateFlow() {
  const t = useTranslations("migrate");
  const router = useRouter();
  const privy = usePrivy();
  // The balances on review are the OLD wallets', not the app session's.
  const oldWallets = {
    evm: getWalletAddress(privy.user, "ethereum"),
    solana: getWalletAddress(privy.user, "solana"),
  };
  const portfolio = usePortfolio(oldWallets);
  const decane = useDecaneDestinations();
  const sweep = useSweep();
  // "prepare" covers both sign-in and review: which one shows is derived from
  // whether the Decane wallets exist yet, so a returning user who already
  // holds a Decane identity lands straight on review.
  const [stage, setStage] = useState<"prepare" | "sweeping" | "done">("prepare");

  const planResult = useMemo((): { plan: ChainSweep[]; error: string | null } => {
    try {
      return { plan: buildSweepPlan(portfolio.tokens), error: null };
    } catch (e) {
      return { plan: [], error: e instanceof Error ? e.message : t("planErrorTitle") };
    }
  }, [portfolio.tokens, t]);

  const startSweep = async () => {
    if (!decane.evmAddress || !decane.solanaAddress) return;
    setStage("sweeping");
    await sweep.start(planResult.plan, {
      evm: decane.evmAddress,
      solana: decane.solanaAddress,
    });
    setStage("done");
    // Background: pull the drained balances into the portfolio query so the
    // dashboard the user returns to shows the after state, not a stale cache.
    void portfolio.refetchUntilChanged();
  };

  const retryFailed = async () => {
    setStage("sweeping");
    await sweep.retryFailed();
    setStage("done");
    void portfolio.refetchUntilChanged();
  };

  let content: React.ReactNode;
  if (stage !== "prepare") {
    content = (
      <SweepProgress
        items={sweep.items}
        running={sweep.running}
        onRetry={retryFailed}
        onBackToDashboard={() => router.push("/dashboard")}
      />
    );
  } else if (!privy.ready) {
    content = (
      <div className="ws-card px-6 py-10 text-center text-[13.5px] text-white/55">
        {t("loadingBalances")}
      </div>
    );
  } else if (!privy.authenticated) {
    content = (
      <div className="ws-card flex flex-col gap-4 px-6 py-6">
        <div>
          <div className="ws-display text-[20px]">{t("legacyTitle")}</div>
          <p className="mt-1.5 text-[13.5px] leading-[1.5] text-white/55">{t("legacyBody")}</p>
        </div>
        <button
          onClick={() => privy.login()}
          className="h-12 w-full cursor-pointer rounded-[14px] bg-white text-[14.5px] font-medium text-black transition-opacity hover:opacity-90"
        >
          {t("legacySignIn")}
        </button>
      </div>
    );
  } else if (!decane.ready) {
    content = <DecaneSignIn />;
  } else {
    if (portfolio.loading) {
      content = (
        <div className="ws-card px-6 py-10 text-center text-[13.5px] text-white/55">
          {t("loadingBalances")}
        </div>
      );
    } else if (planResult.error) {
      content = (
        <div className="ws-card px-6 py-8 text-center">
          <div className="ws-display text-[20px]">{t("planErrorTitle")}</div>
          <p className="mt-2 text-[13.5px] text-white/55">{planResult.error}</p>
        </div>
      );
    } else if (planResult.plan.length === 0) {
      content = (
        <div className="flex flex-col gap-4">
          <div className="ws-card px-6 py-8 text-center">
            <div className="ws-display text-[20px]">{t("nothingTitle")}</div>
            <p className="mt-2 text-[13.5px] text-white/55">{t("nothingBody")}</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="h-13 w-full cursor-pointer rounded-[14px] border border-white/14 bg-white/8 text-[15px] font-medium transition-colors hover:border-white/30"
          >
            {t("backToDashboard")}
          </button>
        </div>
      );
    } else {
      content = (
        <AssetReview
          plan={planResult.plan}
          evmAddress={decane.evmAddress ?? ""}
          solanaAddress={decane.solanaAddress ?? ""}
          onConfirm={startSweep}
        />
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col gap-5 px-4 py-10">
      <header>
        <div className="ws-display text-[26px]">{t("title")}</div>
        <p className="mt-2 text-[14px] leading-[1.55] text-white/55">{t("subtitle")}</p>
      </header>
      {content}
    </main>
  );
}
