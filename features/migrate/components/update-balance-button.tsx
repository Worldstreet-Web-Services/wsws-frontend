"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrivy } from "@privy-io/react-auth";
import { LegacyPrivyProvider } from "@/components/providers/legacy-privy-provider";
import { useAuthSession } from "@/hooks/use-auth-session";
import { usePortfolio } from "@/hooks/use-portfolio";
import { getWalletAddress } from "@/lib/user";
import { toast } from "@/lib/toast";
import { buildSweepPlan } from "@/features/migrate/lib/plan";
import { useSweep } from "@/features/migrate/hooks/use-sweep";
import { markMigrationComplete, useOfferMigration } from "@/features/migrate/lib/visibility";

// The one-click migration. Sits between Add funds and Withdraw on the balance
// card for users whose money still lives in their old Privy wallets: one tap
// signs in to the old account if needed, sweeps every balance to the new
// Decane wallets (gas sponsored), and retires itself when nothing is left to
// move. There is no separate page and no review step by design.
export function UpdateBalanceButton() {
  const offer = useOfferMigration();
  // Mounting Privy is not free and writes its own storage; only devices with
  // an unfinished migration ever load it here.
  if (!offer) return null;
  return (
    <LegacyPrivyProvider>
      <UpdateBalanceInner />
    </LegacyPrivyProvider>
  );
}

function UpdateBalanceInner() {
  const t = useTranslations("migrate");
  const privy = usePrivy();
  const session = useAuthSession();
  const oldWallets = {
    evm: getWalletAddress(privy.user, "ethereum"),
    solana: getWalletAddress(privy.user, "solana"),
  };
  // The balances to move are the OLD wallets'; the default portfolio (the new
  // wallets) is only touched to pull the swept funds into view afterwards.
  const oldPortfolio = usePortfolio(oldWallets);
  const newPortfolio = usePortfolio();
  const runSweep = useSweep();
  const [busy, setBusy] = useState(false);
  // Set when the click had to detour through the Privy login modal first; the
  // effect below resumes the update the moment that session lands.
  const resumeAfterLogin = useRef(false);

  const run = useCallback(async () => {
    if (!session.evmAddress || !session.solanaAddress) {
      toast.error(t("updateNotReady"));
      return;
    }
    setBusy(true);
    const toastId = toast.loading(t("updating"));
    try {
      const { data } = await oldPortfolio.refetch();
      const { chains, skipped } = buildSweepPlan(data?.tokens ?? []);
      if (chains.length === 0) {
        // Nothing sweepable. Any skipped holdings sit on networks the sponsor
        // does not cover; keeping the button forever would not change that,
        // so the balance unlocks and the toast says what stayed behind.
        markMigrationComplete();
        toast.success(
          skipped.length > 0 ? t("updateSkipped", { count: skipped.length }) : t("updateNothing"),
          {
            id: toastId,
          }
        );
        return;
      }
      const result = await runSweep(chains, {
        evm: session.evmAddress,
        solana: session.solanaAddress,
      });
      if (result.failed > 0) {
        toast.error(t("updateFailed", { message: result.firstError ?? "" }), { id: toastId });
        return;
      }
      markMigrationComplete();
      toast.success(
        skipped.length > 0 ? t("updateSkipped", { count: skipped.length }) : t("updateDone"),
        {
          id: toastId,
        }
      );
      void newPortfolio.refetchUntilChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateNotReady"), { id: toastId });
    } finally {
      setBusy(false);
    }
  }, [session.evmAddress, session.solanaAddress, oldPortfolio, newPortfolio, runSweep, t]);

  useEffect(() => {
    if (resumeAfterLogin.current && privy.ready && privy.authenticated) {
      resumeAfterLogin.current = false;
      void run();
    }
  }, [privy.ready, privy.authenticated, run]);

  const click = () => {
    if (!privy.ready || busy) return;
    if (!privy.authenticated) {
      resumeAfterLogin.current = true;
      privy.login();
      return;
    }
    void run();
  };

  return (
    <button
      onClick={click}
      disabled={busy}
      className="border-accent/40 bg-accent/15 hover:bg-accent/25 flex-1 cursor-pointer rounded-xl border px-4 py-2.5 font-sans text-[13px] font-semibold whitespace-nowrap text-white disabled:cursor-wait disabled:opacity-60 min-[560px]:flex-none"
    >
      {busy ? t("updating") : t("updateBalance")}
    </button>
  );
}
