"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocialAuth } from "decane-connect-kit";
import { useTranslations } from "next-intl";
import { Wordmark } from "@/components/ui/wordmark";
import { BRAND } from "@/lib/brand";
import { markKnownUser } from "@/lib/known-user";
import { MarketLogo } from "@/components/ui/market-logo";
import { SocialButtons } from "@/components/auth/social-buttons";
import { EmailForm } from "@/components/auth/email-form";
import { VisualPanel } from "@/components/auth/visual-panel";
import { useAuthSession } from "@/hooks/use-auth-session";
import { track } from "@/lib/analytics/mixpanel";

export default function AuthPage() {
  const t = useTranslations("auth");
  const { ready, authenticated } = useAuthSession();
  const { isNewUser, phase } = useSocialAuth();
  const router = useRouter();
  const handled = useRef(false);

  // The top of the funnel: the sign-in screen was reached. Reported once per
  // mount, before any method is chosen, so the drop-off to a completed sign-in
  // is measurable.
  useEffect(() => {
    track("auth_started");
  }, []);

  // Runs after any sign-in completes and for already-signed-in visitors.
  // Decane provisions the wallets during sign-in itself (no separate creation
  // step), so all that is left is routing: a first-time signup continues
  // onboarding at the interest page, a returning user goes to the dashboard.
  useEffect(() => {
    if (!ready || !authenticated || handled.current) return;
    handled.current = true;
    markKnownUser();
    router.replace(isNewUser ? "/interests" : "/dashboard");
  }, [ready, authenticated, isNewUser, router]);

  // Key generation runs inside the sign-in ("creating"); reopening a session
  // for a returning user is "unlocking". Both read as busy.
  const busy = phase !== null || (ready && authenticated);
  const creating = phase === "creating";

  return (
    <div className="grid min-h-screen grid-cols-1 bg-black lg:grid-cols-[1fr_1.05fr]">
      <div className="relative flex min-h-screen flex-col p-5 sm:px-10 sm:py-8">
        <div className="self-start">
          <Wordmark />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-9 sm:py-12">
          <h1 className="ws-display text-[clamp(38px,4.6vw,56px)] leading-none tracking-[-0.03em]">
            {t("welcome")}
            <MarketLogo className="mt-[0.22em] block h-[0.7em] w-auto" />
          </h1>
          <p className="mt-4 max-w-[38ch] text-[15.5px] leading-[1.55] text-white/72">
            {t("tagline")}
          </p>

          {busy ? (
            <div className="mt-[34px] flex items-center gap-3 rounded-[14px] border border-white/14 bg-white/6 p-4">
              <MarketLogo className="h-[15px] w-auto shrink-0" />
              <span className="text-sm text-white/80">
                {creating ? t("creatingAccount") : t("signingIn")}
              </span>
            </div>
          ) : (
            <>
              <div className="mt-[34px]">
                <SocialButtons />
              </div>

              <div className="my-[22px] flex items-center gap-3.5">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-xs tracking-[0.04em] text-white/40">{t("or")}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <EmailForm />
            </>
          )}
        </div>

        <p className="mx-auto max-w-[420px] text-center text-xs leading-normal text-white/35">
          {t.rich("agree", {
            brand: BRAND,
            terms: (chunks) => (
              <a href="#" className="text-white/60 underline">
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a href="#" className="text-white/60 underline">
                {chunks}
              </a>
            ),
          })}
          .
        </p>
      </div>

      <VisualPanel />
    </div>
  );
}
