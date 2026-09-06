"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

export interface KashCardDesktopProps {
  /**
   * The KASH holding, already formatted for display. A string rather than a
   * number: the card shows money and must not round or re-derive an amount.
   */
  balance: string;
  /**
   * What one KASH is worth, already formatted, e.g. "$7". Left out while the
   * price is unknown, and then the line is not drawn rather than guessed at.
   */
  unitPrice?: string;
  onHistory: () => void;
  onSend: () => void;
  onBuy: () => void;
  onConvert: () => void;
  /**
   * The "add KASH to MetaMask" control the design parks beside History. Passed
   * in rather than imported so this card stays presentational and never has to
   * know how the wallet handshake works.
   */
  metaMaskAction?: ReactNode;
}

// Step the balance type down as the number grows, so a six-figure holding
// stays on one line instead of wrapping under the KASH suffix. Each step is a
// clamp against the viewport, not a fixed size: this card is the narrow half of
// the dashboard row and the design's 60px is wider than the card at a 1024px
// window. The ceilings are the design's own sizes. Kept in step with
// kash-card.tsx, which is what the dashboard renders.
function balanceTextSize(balance: string) {
  if (balance.length > 12) return "text-[clamp(20px,2.05vw,34px)]";
  if (balance.length > 9) return "text-[clamp(22px,2.35vw,44px)]";
  return "text-[clamp(28px,3.15vw,60px)]";
}

// The Kash+ card as the Market desktop design draws it: a yellow panel under
// the designer's sparkles and cloud bank, with the holding centred and the
// three actions along the foot. Presentational only. The route feeds it the
// formatted figures and the handlers, which keeps the engine's hooks out of a
// component whose job is layout.
export function KashCardDesktop({
  balance,
  unitPrice,
  onHistory,
  onSend,
  onBuy,
  onConvert,
  metaMaskAction,
}: KashCardDesktopProps) {
  const t = useTranslations("kash");

  return (
    <div
      data-sensitive="balance"
      className="relative isolate flex h-full flex-col overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,#FEE685_0%,#FFD425_100%)] px-[24px] pt-[56px] pb-[48px] text-black"
    >
      {/* Decorative only: the designer's two passes of sparkles over the head
          of the card, her cloud bank along its foot. Each export is already
          cropped to the part of the card it covers, so the sizes below are that
          crop as a share of the design's 457x367 box. Percentages rather than
          pixels because this card is rendered wider than the artboard and the
          artwork has to grow with it, not sit as an island in a corner. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 -z-10 h-[56.95%] w-[71.55%] bg-[url('/market/kash-stars.svg')] bg-[length:100%_100%] bg-no-repeat"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 -z-10 h-[59.4%] w-[74.4%] bg-[url('/market/kash-stars-overlay.svg')] bg-[length:100%_100%] bg-no-repeat"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[91.01%] bg-[url('/market/kash-clouds.svg')] bg-cover bg-bottom bg-no-repeat"
      />

      {/* The header wraps rather than truncates: the title opposite "History"
          and the MetaMask pill does not fit a narrow desktop column in the
          longer locales, and an ellipsis through the card's own title is worse
          than dropping the right-hand cluster onto its own line. The 140px
          floor decides which happens: while the title can hold its longest
          word on one line beside the cluster it takes a second line and the
          row keeps its height; below that the cluster drops. Kept in step with
          kash-card.tsx. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 2xl:ml-[19.18px]">
        <div className="flex min-w-[140px] flex-1 items-center gap-[9.53px]">
          <span className="grid size-[37.8px] shrink-0 place-items-center rounded-full bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/market/kash-coin.png"
              alt=""
              className="size-[32.68px] rounded-full object-cover"
            />
          </span>
          <span className="font-serif text-[19px] leading-[1.35] font-medium tracking-[-0.152px]">
            {t("balanceTitle")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-[10px]">
          <button
            onClick={onHistory}
            className="ws-pressable cursor-pointer rounded-full px-[10px] py-[5px] font-sans text-[19px] leading-[1.3] font-normal whitespace-nowrap text-black"
          >
            {t("history")}
          </button>
          {metaMaskAction}
        </div>
      </div>

      {/* The holding, centred, the way the design stacks this card. It grows
          into the height the row settles on: this card and the balance card are
          grid siblings and stretch to the taller of the two, so the spare
          height belongs around the holding rather than as a bare band under the
          action row. */}
      <div className="mt-[22.5px] flex grow flex-col items-center justify-center">
        {/* Side padding and a wrap, so the ticker drops below a very long
            holding instead of the pair running into the card's edges. */}
        <div
          className={`tnum flex max-w-full flex-wrap items-baseline justify-center gap-x-2 gap-y-1 px-2 py-[16.63px] font-serif leading-[1.1] font-bold tracking-[-0.05em] ${balanceTextSize(balance)}`}
        >
          {balance}
          {/* The ticker, not a translated word. */}
          <span className="whitespace-nowrap">KASH +</span>
        </div>
        {unitPrice ? (
          // The unit price, so the holding above is checkable rather than a
          // number the user has to trust.
          <div className="flex max-w-full flex-wrap items-center justify-center gap-[6.05px] px-2 font-serif text-[16px] leading-[21.93px] font-medium tracking-[-0.08px] text-black/80">
            <span className="tnum">1 KASH</span>
            <span className="block size-[24.19px] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/market/kash-icon-approx-equals.svg" alt="" className="size-full" />
            </span>
            <span className="tnum">{unitPrice}</span>
          </div>
        ) : null}
      </div>

      {/* The design runs the three actions the full width of the card, so they
          share the row in its proportions rather than clustering in the middle
          of a card that is wider than the artboard.

          Each pill carries 22px of side padding and holds its label on one
          line. Because a flex item never shrinks below its own content, that
          padding is a floor rather than slack: "Umwandeln" keeps the same room
          around it that "Convert" gets, and when three padded pills no longer
          fit the row wraps instead of squeezing them. min-h rather than h so a
          wrapped row still cannot clip a label. */}
      <div className="mt-[24px] ml-[2.18px] flex flex-wrap gap-[10.23px]">
        <button
          onClick={onSend}
          className="ws-pressable flex min-h-[52.41px] flex-1 basis-[114.12px] cursor-pointer items-center justify-center gap-[6px] rounded-full border-[1.28px] border-[#FFD52D] bg-white px-[22px] py-[13px] font-serif text-[16px] leading-[24.92px] font-medium whitespace-nowrap text-black"
        >
          <span className="block size-[20.45px] shrink-0 rotate-180">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/market/kash-icon-arrow-send.svg" alt="" className="size-full" />
          </span>
          {t("send")}
        </button>
        <button
          onClick={onBuy}
          className="ws-pressable flex min-h-[52.41px] flex-1 basis-[121.73px] cursor-pointer items-center justify-center gap-[6px] rounded-full border-[1.92px] border-[#FFD52D] bg-white px-[22px] py-[13px] font-serif text-[16px] leading-[24.92px] font-medium whitespace-nowrap text-black"
        >
          <span className="block size-[20.45px] shrink-0 -scale-y-100 rotate-180">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/market/kash-icon-arrow-buy.svg" alt="" className="size-full" />
          </span>
          {t("buy")}
        </button>
        <button
          onClick={onConvert}
          className="ws-pressable flex min-h-[52.41px] flex-1 basis-[147.09px] cursor-pointer items-center justify-center gap-[10.23px] rounded-full border-[1.28px] border-white/14 bg-black px-[22px] py-[13px] font-serif text-[16px] leading-[24.92px] font-medium whitespace-nowrap text-white"
        >
          <span className="block size-[20.45px] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/market/kash-icon-convert.svg" alt="" className="size-full" />
          </span>
          {t("convert")}
        </button>
      </div>
    </div>
  );
}
