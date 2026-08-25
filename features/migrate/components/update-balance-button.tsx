"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePrivy } from "@privy-io/react-auth";
import { LegacyPrivyProvider } from "@/components/providers/legacy-privy-provider";
import { useAuthSession } from "@/hooks/use-auth-session";
import { usePortfolio } from "@/hooks/use-portfolio";
import { toast } from "@/lib/toast";
import { scheduleSettlement } from "@/lib/migration/schedule";
import type { VenueAdapter } from "@/lib/migration/types";
import { discoverHoldings, ethPriceFromPortfolio } from "@/features/migrate/lib/discover";
import { markMigrationComplete } from "@/features/migrate/lib/visibility";
import { useOfferMigration } from "@/features/migrate/hooks/use-offer-migration";
import { useLegacySigner } from "@/features/migrate/hooks/use-legacy-signer";
import { legacyHoldingsKey } from "@/features/migrate/hooks/use-legacy-holdings";
import { useMigrationRun } from "@/features/migrate/hooks/use-migration-run";
import { MoveOldMoneyPanel } from "@/features/migrate/components/move-old-money-panel";
import { MoveOldMoneyFrame } from "@/features/migrate/components/move-old-money-sheet";

// The one-click migration. Sits between Add funds and Withdraw on the balance
// card for users whose money still lives in their old Privy wallets: one tap
// signs in to the old account if needed and moves every plain balance to the
// new Decane wallets (gas sponsored). When the old account also holds money
// inside a venue, or anything that needs a decision, the tap opens the full
// review instead. It retires itself when nothing is left to move.
export function UpdateBalanceButton({ adapters }: { adapters: readonly VenueAdapter[] }) {
  const offer = useOfferMigration();
  // Mounting Privy is not free and writes its own storage; only devices with
  // an unfinished migration ever load it here.
  if (!offer) return null;
  return (
    <LegacyPrivyProvider>
      <UpdateBalanceInner adapters={adapters} />
    </LegacyPrivyProvider>
  );
}

function UpdateBalanceInner({ adapters }: { adapters: readonly VenueAdapter[] }) {
  const t = useTranslations("migrate");
  const privy = usePrivy();
  const signer = useLegacySigner();
  const session = useAuthSession();
  const newPortfolio = usePortfolio();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Set when the click had to detour through the Privy login modal first; the
  // effect below resumes the update the moment that session lands.
  const resumeAfterLogin = useRef(false);

  const ethPriceUsd = ethPriceFromPortfolio(newPortfolio.tokens);
  const legacy = useMemo(() => signer?.addresses ?? { evm: null, solana: null }, [signer]);
  const current = useMemo(
    () => ({ evm: session.evmAddress, solana: session.solanaAddress }),
    [session.evmAddress, session.solanaAddress]
  );
  const runner = useMigrationRun({ adapters, legacy, current, signer, ethPriceUsd });

  const run = useCallback(async () => {
    if (!signer || !current.evm || !current.solana) {
      toast.error(t("updateNotReady"));
      return;
    }
    setBusy(true);
    const toastId = toast.loading(t("updating"));
    try {
      const ctx = { legacy, current, hasLegacySession: true, signer, ethPriceUsd };
      const discovered = await discoverHoldings(adapters, ctx);
      // Anything beyond plain balances deserves the review: a venue that could
      // not be read, money inside a venue, or a decision the user has to make.
      const needsReview =
        discovered.failures.length > 0 ||
        discovered.holdings.some((h) => h.venue !== "wallet" || !h.deterministic);
      if (needsReview) {
        queryClient.setQueryData(legacyHoldingsKey(legacy, true), discovered);
        toast.dismiss(toastId);
        setReviewOpen(true);
        return;
      }
      const plan = scheduleSettlement(discovered.holdings, new Set(), Date.now());
      const pendingOnramps = plan.settleLater.filter(
        (h) => h.settleability.state === "pending"
      ).length;
      if (plan.phases.length === 0) {
        // Nothing sweepable. Skipped holdings sit on networks the sponsor does
        // not cover; keeping the button forever would not change that. A bank
        // deposit still on its way keeps the door open, though.
        if (pendingOnramps === 0) markMigrationComplete();
        toast.success(
          plan.skipped.length > 0
            ? t("updateSkipped", { count: plan.skipped.length })
            : t("updateNothing"),
          { id: toastId }
        );
        return;
      }
      const result = await runner.run(plan);
      if (result.outcome !== "complete") {
        const firstError = [...result.results.values()].find((o) => !o.ok);
        toast.error(
          t("updateFailed", { message: firstError && !firstError.ok ? firstError.error : "" }),
          { id: toastId }
        );
        return;
      }
      markMigrationComplete();
      toast.success(
        plan.skipped.length > 0
          ? t("updateSkipped", { count: plan.skipped.length })
          : t("updateDone"),
        { id: toastId }
      );
      void newPortfolio.refetchUntilChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateNotReady"), { id: toastId });
    } finally {
      setBusy(false);
    }
  }, [signer, current, legacy, ethPriceUsd, adapters, queryClient, runner, newPortfolio, t]);

  useEffect(() => {
    if (resumeAfterLogin.current && signer) {
      resumeAfterLogin.current = false;
      void run();
    }
  }, [signer, run]);

  const click = () => {
    if (!privy.ready || busy) return;
    if (!signer) {
      resumeAfterLogin.current = true;
      privy.login();
      return;
    }
    void run();
  };

  return (
    <>
      <button
        onClick={click}
        disabled={busy}
        className="border-accent/40 bg-accent/15 hover:bg-accent/25 flex-1 cursor-pointer rounded-xl border px-4 py-2.5 font-sans text-[13px] font-semibold whitespace-nowrap text-white disabled:cursor-wait disabled:opacity-60 min-[560px]:flex-none"
      >
        {busy ? t("updating") : t("updateBalance")}
      </button>
      {reviewOpen ? (
        <MoveOldMoneyFrame onClose={() => setReviewOpen(false)}>
          <MoveOldMoneyPanel
            adapters={adapters}
            entry="balance_card"
            onClose={() => setReviewOpen(false)}
          />
        </MoveOldMoneyFrame>
      ) : null}
    </>
  );
}
