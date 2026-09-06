"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { MarketLogo } from "@/components/ui/market-logo";
import { toast } from "@/lib/toast";

// Sign the user out after this long with no interaction, so a funded session
// left open on an unattended device doesn't stay open.
const IDLE_TIMEOUT_HOURS = 2;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_HOURS * 60 * 60 * 1000;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const t = useTranslations("auth");

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/auth");
    }
  }, [ready, authenticated, router]);

  // The message derives its figure from the same constant as the timer. The
  // two had drifted: the timer said two hours while the toast said fifteen
  // minutes, in English regardless of locale.
  useIdleLogout(IDLE_TIMEOUT_MS, ready && authenticated, () =>
    toast.info(t("idleSignedOut", { hours: IDLE_TIMEOUT_HOURS }))
  );

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-black">
        {/* The loop is the loading affordance: white paint, glitch, settle. */}
        <MarketLogo className="w-[170px]" />
        <span className="text-sm text-white/50">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}
