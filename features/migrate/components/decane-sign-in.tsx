"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDecaneDestinations } from "@/features/migrate/hooks/use-decane-destinations";

// Step one of the migration: create (or resume) the user's Decane account so
// the new wallet addresses exist to sweep into. Google or an email code, the
// two methods the Decane project has enabled.
export function DecaneSignIn() {
  const t = useTranslations("migrate");
  const decane = useDecaneDestinations();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError ?? decane.error;

  const run = async (action: () => Promise<unknown>) => {
    setLocalError(null);
    decane.clearError();
    try {
      await action();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t("signInFailed"));
    }
  };

  if (decane.creatingWallet) {
    return (
      <div className="ws-card flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="ws-display text-[20px]">{t("creatingTitle")}</div>
        <p className="max-w-[340px] text-[13.5px] text-white/55">{t("creatingBody")}</p>
      </div>
    );
  }

  return (
    <div className="ws-card flex flex-col gap-4 px-6 py-6">
      <div>
        <div className="ws-display text-[20px]">{t("signInTitle")}</div>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-white/55">{t("signInBody")}</p>
      </div>

      <button
        onClick={() => run(decane.signInWithGoogle)}
        disabled={decane.googleLoading}
        className="h-12 w-full cursor-pointer rounded-[14px] bg-white text-[14.5px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {decane.googleLoading ? t("signingIn") : t("continueWithGoogle")}
      </button>

      <div className="flex items-center gap-3 text-[12px] text-white/35">
        <span className="h-px flex-1 bg-white/10" />
        {t("or")}
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {codeSent ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-white/55">{t("codeSentTo", { email })}</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t("codePlaceholder")}
            className="h-12 w-full rounded-[14px] border border-white/14 bg-white/5 px-4 text-[15px] tracking-[0.2em] outline-none placeholder:tracking-normal focus:border-white/30"
          />
          <button
            onClick={() => run(() => decane.confirmEmailCode(email, code.trim()))}
            disabled={decane.emailLoading || code.trim().length === 0}
            className="h-12 w-full cursor-pointer rounded-[14px] border border-white/14 bg-white/8 text-[14.5px] font-medium transition-colors hover:border-white/30 disabled:opacity-50"
          >
            {decane.emailLoading ? t("verifying") : t("verifyCode")}
          </button>
          <button
            onClick={() => setCodeSent(false)}
            className="cursor-pointer text-[13px] text-white/45 hover:text-white/70"
          >
            {t("useDifferentEmail")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="h-12 w-full rounded-[14px] border border-white/14 bg-white/5 px-4 text-[15px] outline-none focus:border-white/30"
          />
          <button
            onClick={() =>
              run(() => decane.sendEmailCode(email.trim()).then(() => setCodeSent(true)))
            }
            disabled={decane.emailLoading || email.trim().length === 0}
            className="h-12 w-full cursor-pointer rounded-[14px] border border-white/14 bg-white/8 text-[14.5px] font-medium transition-colors hover:border-white/30 disabled:opacity-50"
          >
            {decane.emailLoading ? t("sendingCode") : t("sendCode")}
          </button>
        </div>
      )}

      {error ? <p className="text-[13px] text-red-400">{error}</p> : null}
    </div>
  );
}
