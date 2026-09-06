"use client";

import { CurrencySelect, useMoney } from "@/components/ui/currency-select";
import { useTranslations } from "next-intl";
import { ArrowUpRightIcon, CoinIcon, EyeIcon, EyeOffIcon, WalletIcon } from "@/components/ui/icons";
import type { BalanceCardViewProps } from "@/features/portfolio/components/balance-card-view";

// The mobile balance card, drawn to the wallet comp (node 1:972): a starfield-
// and-cloud card with the currency pill and a tour button up top, the total in a
// rounded gradient figure, and the two money actions on a full-width row. The
// decorative sky is one exported asset — the comp builds it from masked cloud
// and star art that does not reduce to CSS cleanly.
export function BalanceCardMobile({
  totalUsd,
  loading,
  errored,
  refreshing,
  withdrawHeld,
  hidden,
  onToggleHidden,
  formatMasked,
  onOpenFunds,
  onOpenWithdraw,
}: BalanceCardViewProps) {
  const t = useTranslations("balance");
  const money = useMoney();

  const action =
    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-[13px] font-sans text-[14px] font-semibold tracking-[-0.14px] whitespace-nowrap transition-opacity";

  return (
    <div className="relative h-full overflow-hidden rounded-[19px] bg-[#0f0f0f]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wallet/balance-bg.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* h-full + justify-between so the card fills its carousel slide and stands
          exactly as tall as the Kash+ card beside it — otherwise the two cards
          disagree on height and their edges break against each other. */}
      <div className="relative flex h-full flex-col items-center justify-between px-4 pt-9 pb-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            <CurrencySelect value={money.currency} onSelect={money.setCurrency} />
            {/* Take-a-tour affordance from the comp. */}
            <button
              type="button"
              aria-label={t("takeTour")}
              className="grid size-[30px] cursor-pointer place-items-center rounded-full border border-white/14 bg-white/5 text-white/70 transition-colors active:bg-white/12"
            >
              <CoinIcon size={13} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-0.5">
              <span className="font-serif text-[13px] font-medium tracking-[-0.13px] text-white/60">
                {t("totalBalance")}
              </span>
              <button
                onClick={onToggleHidden}
                aria-label={hidden ? t("showBalance") : t("hideBalance")}
                className="grid size-6 cursor-pointer place-items-center rounded-full text-white/55 transition-colors active:bg-white/8"
              >
                {hidden ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
              </button>
              {refreshing ? (
                <span
                  className="bg-accent size-1.5 animate-pulse rounded-full"
                  title="Refreshing…"
                />
              ) : null}
            </div>

            {loading ? (
              <div className="mt-1 h-[42px] w-36 animate-pulse rounded-xl bg-white/8" />
            ) : errored ? (
              // Zero and a failed read look identical in the total, so name the
              // failure rather than showing a confident $0.00.
              <div className="ws-display text-[22px] leading-none tracking-[-0.02em] text-white/45">
                {t("couldntLoad")}
              </div>
            ) : (
              <div
                className="ws-chewy bg-gradient-to-b from-white to-[#c4c4c4] bg-clip-text text-[42px] leading-none tracking-[-0.84px] text-transparent"
                data-sensitive="balance"
              >
                {formatMasked(totalUsd)}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-center gap-2">
          <button
            onClick={onOpenFunds}
            className={`${action} ws-chrome text-ink shadow-[0_1.6px_3.3px_rgba(0,0,0,0.5)]`}
          >
            <WalletIcon size={17} />
            {t("addFunds")}
          </button>
          <button
            onClick={onOpenWithdraw}
            disabled={withdrawHeld}
            className={`${action} border-2 border-white bg-white/6 text-white active:bg-white/12 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <ArrowUpRightIcon size={17} />
            {t("withdraw")}
          </button>
        </div>
      </div>
    </div>
  );
}
