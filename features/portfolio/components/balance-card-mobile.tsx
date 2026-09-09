"use client";

import { useState } from "react";
import { CurrencySelect, useMoney } from "@/components/ui/currency-select";
import { useTranslations } from "next-intl";
import { ArrowUpRightIcon, EyeIcon, EyeOffIcon, WalletIcon } from "@/components/ui/icons";
import { AppModalHost, useAppModals } from "@/components/layout/modals/app-modals";
import { ModalShell } from "@/components/ui/modal-shell";
import { HoldingsModal } from "@/features/portfolio/components/holdings-modal";
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
  const tPortfolio = useTranslations("portfolio");
  const money = useMoney();
  const modals = useAppModals();

  // The holdings list opens from the coins button beside the currency, the same
  // way the desktop card works. Nothing here mounts until the button is first
  // pressed: this card is on the dashboard's first paint, and neither the
  // holdings query nor the trade sheets belong in that load.
  const [holdingsOpen, setHoldingsOpen] = useState(false);
  const [tradeMounted, setTradeMounted] = useState(false);
  const openHoldings = () => {
    setTradeMounted(true);
    setHoldingsOpen(true);
  };
  const closeHoldings = () => setHoldingsOpen(false);

  // Portfolio Allocation toggle hidden on mobile for now (see the commented
  // button below); its state is parked until it returns.
  // const [allocationOpen, setAllocationOpen] = useState(false);

  const action =
    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-[13px] font-sans text-[14px] font-semibold tracking-[-0.14px] whitespace-nowrap transition-opacity";

  return (
    <div
      data-tour="balance"
      className="relative h-full overflow-hidden rounded-[19px] bg-[#0f0f0f]"
    >
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
            {/* What the wallet holds, one tap from the total it adds up to. The
                coins-01 glyph opens the holdings list, the same button and the
                same exported icon the desktop card carries beside the currency
                (Figma node 1:1534). Fixed-colour export, so no text colour. */}
            <button
              type="button"
              onClick={openHoldings}
              aria-label={tPortfolio("yourHoldings")}
              title={tPortfolio("yourHoldings")}
              aria-haspopup="dialog"
              aria-expanded={holdingsOpen}
              className="grid size-[30px] cursor-pointer place-items-center rounded-full border-[0.789px] border-white/14 bg-white/5 transition-colors active:bg-white/12"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/market/balance-icon-coins.svg" alt="" className="size-3 shrink-0" />
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

        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex w-full items-center gap-2">
            <button
              data-tour="add-funds"
              onClick={onOpenFunds}
              // bg-white is the base the ws-chrome gradient layers over; it also
              // keeps the button visible from md up, where ws-chrome (mobile
              // only) drops out but this card now still renders.
              className={`${action} ws-chrome text-ink bg-white shadow-[0_1.6px_3.3px_rgba(0,0,0,0.5)]`}
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

          {/* Portfolio Allocation toggle — hidden on mobile for now, at request.
          <button
            type="button"
            onClick={() => setAllocationOpen((open) => !open)}
            aria-expanded={allocationOpen}
            className="flex cursor-pointer items-center gap-1 px-1.5 text-[#7a7a7a] transition-colors active:text-white/80"
          >
            <span className="size-[3px] shrink-0 rounded-full bg-current" />
            <span className="font-serif text-[10px] font-medium tracking-[-0.075px]">
              {t("portfolioAllocation")}
            </span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className={`size-[14px] shrink-0 transition-transform ${allocationOpen ? "rotate-180" : ""}`}
              fill="none"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          */}
        </div>
      </div>

      {tradeMounted ? (
        <>
          <ModalShell open={holdingsOpen} onClose={closeHoldings}>
            <HoldingsModal
              onClose={closeHoldings}
              onOpenDetail={modals.openDetail}
              onOpenBuy={modals.openBuy}
              onOpenSell={modals.openSell}
              onOpenRwaTrade={modals.openRwaTrade}
              onOpenMemeSell={modals.openMemeSell}
              onAddFunds={() => {
                closeHoldings();
                modals.openFunds();
              }}
            />
          </ModalShell>

          <AppModalHost
            active={modals.modal}
            onClose={modals.close}
            onConfirmed={modals.showDone}
          />
        </>
      ) : null}
    </div>
  );
}
