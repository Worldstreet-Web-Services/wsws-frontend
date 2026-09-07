"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Carousel } from "@/components/ui/carousel";
import { DiscoveryRow } from "@/features/discovery/components/discovery-row";
import { DiscoveryCta } from "@/features/discovery/components/discovery-cta";
import type { TokenSpot } from "@/features/discovery/types";
import { useRotatingIndex } from "@/hooks/use-rotating-index";

// Every illustration on these cards is a Figma export under public/market.
// They are decorative, so they carry no alt text and never take a click.
//
// The design draws both cards 263px tall on a 1015px content column; the
// dashboard gives them the same height in a column half again as wide, so the
// artwork has to answer a card that is much wider but no taller.
//
// Only the cloud bank stretches. It is sky, so widening it reads as more sky.
// Everything figurative keeps its aspect ratio and is anchored instead: the
// coins scale whole with the card, the crowd holds the size it is drawn at, and
// between them they still cover the card. The discrete pieces on top (the
// rocket, the sparkles, the ticker, the tip, the pills) keep the size they are
// drawn at and hold the card edge they are drawn against.
const artLayer = "pointer-events-none absolute select-none";

// A card is now a carousel slide rather than a grid column. The slide sets the
// width, so the card takes it from the block it is in and never asks for one of
// its own; h-full squares it up against the taller slide in view, and the
// design's height stays the floor.
const CARD_BOX = "relative h-full min-h-[263px] overflow-hidden rounded-[18px]";

// How long one token holds the card. The design asks for ten seconds, which is
// also the rotation hook's own default; it is named here because it is a
// product decision about this card, not a detail of the hook.
const TOKEN_HOLD_MS = 10_000;

// The move's colour on the white ticker chip. The green is the one the design
// draws. There is no red drawn for this chip, because the design only ever
// shows a gainer here, so a loss borrows the redesign's own red, the one the
// stake banner is filled with. Both sit on white at about the same weight.
const GAIN_INK = "text-[#5aad00]";
const LOSS_INK = "text-[#ed2b07]";

interface TokenCallCardProps {
  token: TokenSpot;
  /** Called with true while the pointer or focus is on this card. */
  onHold: (held: boolean) => void;
}

// The call on one token: a rocket over a moon glow and a cloud bank, with the
// ticker, the tip and the buy pill laid over it. The rocket and its sparkles are
// drawn against the card's right edge, the copy against its left.
//
// Only the words move. The token supplies the logo, the symbol, the price, the
// move and the destination; the artwork, the geometry and the colours are the
// same card whichever token is featured.
function TokenCallCard({ token, onHold }: TokenCallCardProps) {
  const t = useTranslations("discovery");

  return (
    <article
      // WCAG 2.2.2: the card updates itself, so a reader needs a way to stop
      // it. Pointing at the card or tabbing into it holds the token in place
      // until the pointer or the focus leaves. onFocus and onBlur are React's
      // focusin and focusout, so they cover anything focused inside the card,
      // not just the card itself.
      onMouseEnter={() => onHold(true)}
      onMouseLeave={() => onHold(false)}
      onFocus={() => onHold(true)}
      onBlur={() => onHold(false)}
      className={`${CARD_BOX} bg-[linear-gradient(124deg,#ffd52d_37%,#f5c500_88%)]`}
    >
      <img
        src="/market/token-launch-spark.svg"
        alt=""
        aria-hidden
        className={`${artLayer} top-[131.7px] right-[178.69px] h-[29.7px] w-[30.66px]`}
      />
      {/* The moon glow is a soft ring stack centred near the card's lower
          left, so it keeps its drawn size and hangs off that corner. */}
      <img
        src="/market/token-launch-glow.svg"
        alt=""
        aria-hidden
        className={`${artLayer} top-[-171.68px] left-[-263.45px] h-[855.47px] w-[774.51px]`}
      />
      {/* The cloud bank is the card's backdrop and has to reach both edges. */}
      <img
        src="/market/token-launch-clouds.svg"
        alt=""
        aria-hidden
        className={`${artLayer} inset-0 h-full w-full`}
      />
      <img
        src="/market/token-rocket.svg"
        alt=""
        aria-hidden
        className={`${artLayer} top-0 right-0 h-full w-[258px] max-w-[53.53%] object-cover object-[right_center]`}
      />
      <img
        src="/market/token-launch-stars.svg"
        alt=""
        aria-hidden
        className={`${artLayer} top-[9.09px] right-[23.18px] h-[151.09px] w-[127.82px]`}
      />

      {/* The ticker chip, tilted as drawn. It sizes to its own text so a
          longer locale, or a longer symbol, extends it rather than clipping
          the figure.

          Its left inset is the design's 107.14px, which is 22.23% of the
          482px card it is drawn on. Below that width the percentage wins and
          the chip comes in with the card, so the longest ticker still ends
          inside the card instead of behind its right edge. The max-width is
          the backstop for a string longer than any locale ships. */}
      <div className="absolute top-[55.47px] left-[min(107.14px,22.23%)] flex w-fit max-w-[calc(100%_-_min(107.14px,22.23%)_-_14px)] rotate-[-3.07deg] items-center gap-[8.55px] rounded-[9.98px] bg-white p-[8.55px]">
        {/* The coin and the ticker never give up width, so symbol, price and
            move stay on the one line the design draws them on. */}
        <div className="flex shrink-0 items-center gap-[8px]">
          {token.logo ? (
            // Rounded because a listing logo is not always drawn round, and
            // the slot the design leaves for it is.
            <img
              src={token.logo}
              alt=""
              aria-hidden
              className="size-[34.22px] shrink-0 rounded-full object-cover"
            />
          ) : (
            // A token with no logo still gets the disc, so the chip keeps its
            // width and the line below it does not shift.
            <span
              aria-hidden
              className="flex size-[34.22px] shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] font-serif text-[11px] font-semibold text-[#656464]"
            >
              {token.symbol.slice(0, 3)}
            </span>
          )}
          <div>
            <p className="font-serif text-[12px] leading-[1.1] font-semibold tracking-[-0.12px] text-black">
              {token.symbol}
            </p>
            {/* The price is grey and the move is coloured. The colour comes
                from the <change> tag; without it next-intl returns the line
                whole and it stays grey. */}
            <p className="tnum text-[12px] leading-normal font-semibold text-[#9b9b9b]">
              {t.rich("tokenTicker", {
                price: token.price,
                delta: token.change,
                change: (chunks) => (
                  <span className={`font-medium ${token.up ? GAIN_INK : LOSS_INK}`}>{chunks}</span>
                ),
              })}
            </p>
          </div>
        </div>
        {/* The design's wide gap between the ticker and the avatar. It is the
            one piece of pure space in the chip, so it is what gives when the
            card is too narrow to hold the chip at its drawn width. The shrink
            factor is what puts it first in line: space closes to nothing
            before a single word of the ticker is asked to wrap. */}
        <span aria-hidden className="w-[25.67px] shrink-[999]" />
        <img
          src="/market/token-ticker-avatar.png"
          alt=""
          aria-hidden
          className="size-[22.81px] shrink-0"
        />
      </div>

      {/* The tip and the buy pill are the one part of this card that a
          locale can lengthen, so they run down the page instead of holding
          two fixed tops: a longer tip takes the lines it needs and carries
          the pill down with it. At English the block still lands on the
          design's 110.09px and 191.09px, and the card on its 263px. */}
      <div className="relative flex flex-col items-start pt-[110.09px] pr-6 pb-6 pl-[64px]">
        {/* 76.1px is the slot the design leaves the tip: three lines at
            13/1.5 plus its own 8px and 9.6px. Holding it here rather than on
            the tip itself keeps the white pill tight to its text. */}
        <div className="min-h-[76.1px] w-[262.59px] max-w-full">
          <p className="rounded-[11.97px] bg-white pt-[8px] pr-[17.6px] pb-[9.6px] pl-[39px] text-[13px] leading-normal font-medium text-[#656464]">
            {/* A gain and a loss are two whole messages rather than one with
                the direction slotted into it: these languages do not all put
                the verb in the same place, and a token that is down must
                never be read out as a token that is up. */}
            {t.rich(token.up ? "tokenTipUp" : "tokenTipDown", {
              symbol: token.symbol,
              move: token.movePercent,
              strong: (chunks) => (
                <strong className="font-semibold text-[#060606]">{chunks}</strong>
              ),
            })}
          </p>
        </div>

        <DiscoveryCta
          href={token.href}
          label={t("tokenCta", { symbol: token.symbol })}
          tone="dark"
          size={14}
          icon={
            <img src="/market/token-coins-icon.svg" alt="" aria-hidden className="size-[17.29px]" />
          }
          className="mt-[4.9px] ml-[18px] border-[2.47px] border-[#ffd52d]"
        />
      </div>
    </article>
  );
}

// Eth Africa: a dark card carrying a white panel, with the crowd and its two
// coins rising over the panel's lower edge. Each coin runs off one side of the
// card, so each holds that side; the crowd stands between them, and the card's
// bottom edge cuts all three.
function EthAfricaCard() {
  const t = useTranslations("discovery");

  return (
    <article className={`${CARD_BOX} border-[1.08px] border-[#989898] bg-[#0f0f0f]`}>
      {/* Each coin keeps the share of the card it has in the design, 212 and
          216 of 510, and takes its height from that width, so it stays round
          on any card. It hangs from the bottom edge and the card clips
          whatever height that leaves above: at 510px this lands exactly on
          the design's 28.93% top, and on a wider card the coins grow with
          the card rather than leaving a bare strip between them and the
          crowd. Nothing but the card's own corner is behind them. */}
      <img
        src="/market/token-coin.svg"
        alt=""
        aria-hidden
        className={`${artLayer} bottom-0 left-0 w-[41.569%]`}
      />
      <img
        src="/market/token-coin-right.svg"
        alt=""
        aria-hidden
        className={`${artLayer} right-0 bottom-0 w-[42.353%]`}
      />

      {/* The panel is laid out rather than pinned, so a locale that needs more
          panel makes the card taller instead of running out of the bottom of
          it. The insets are the design's: 21.09 above and 35 and 35.54 at the
          sides. Below is the design's 54.66 less the card's own 1.08px
          border top and bottom, which now counts towards a height the
          content sets rather than one min-h fixed, so the card still lands on
          its 263px when the panel is at its drawn height. */}
      <div className="relative pt-[21.09px] pr-[35.54px] pb-[52.5px] pl-[35px]">
        {/* The panel's bottom padding is the band of white the crowd stands
            in front of. Nothing is laid out in it, so however far the copy
            runs the crowd still meets it at the same place it does in the
            design instead of climbing over the words. */}
        <div className="min-h-[187.25px] overflow-hidden rounded-[17.87px] bg-white pt-[12.74px] pr-[23.48px] pb-[73.21px] pl-[24.2px]">
          {/* The buttons keep the width their own labels need, and the copy
              takes what is left: it opens up to a readable measure on a panel
              wider than the design, and gives width back down to 150px on a
              narrower one. Below that the two stop sharing a line and the
              buttons drop under the copy, each with the whole panel to sit
              in, rather than the copy being squeezed to a ribbon. */}
          <div className="flex flex-wrap items-end gap-x-[30.17px] gap-y-[18px]">
            <div className="max-w-[340px] min-w-[150px] flex-[1_1_203.49px]">
              <h3 className="text-[20px] leading-none font-bold tracking-[-1px] text-[#0f0f0f]">
                {t("ethAfricaTitle")}
              </h3>
              <p className="mt-[11px] text-[15px] leading-normal font-medium break-words text-[#777474]">
                {t.rich("ethAfricaBody", {
                  strong: (chunks) => (
                    <strong className="font-semibold text-black">{chunks}</strong>
                  ),
                })}
              </p>
            </div>
            <div className="ml-auto flex max-w-full min-w-[158.12px] shrink-0 flex-col items-end gap-[8.25px]">
              <DiscoveryCta
                href="/spot"
                label={t("ethAfricaBuy")}
                tone="dark"
                size={17}
                icon={
                  <img
                    src="/market/token-coins-icon.svg"
                    alt=""
                    aria-hidden
                    className="size-[19.25px]"
                  />
                }
              />
              <DiscoveryCta
                href="/prediction"
                label={t("ethAfricaJoin")}
                tone="light"
                size={17}
                className="w-full border-[1.375px] border-black"
              />
            </div>
          </div>
        </div>
      </div>

      {/* The crowd is a fixed 510x136 at every card width, centred, standing
          on the bottom edge. It is the one piece here that cannot be resized:
          widen it and the figures go stout, scale it up and the heads climb
          over the panel copy. The coins reach in far enough on either side to
          meet it, so it does not have to grow to cover the card. Below 510px
          the card clips its outer edges, which is the same cut the card's
          bottom edge already makes. */}
      <img
        src="/market/token-crowd.svg"
        alt=""
        aria-hidden
        className={`${artLayer} bottom-0 left-1/2 w-[510px] max-w-none -translate-x-1/2`}
      />
    </article>
  );
}

// "Stay Ahead of Token Moves": a read on a coin the user holds, and the
// community putting that read to work.
//
// The pair rides a carousel. Two cards cannot cycle, so the token call is dealt
// twice: it is the row's subject, the only card that reads a position the user
// actually holds, while Eth Africa is the aside beside it. The repeat is third
// rather than second so the first two views, the call then Eth Africa and Eth
// Africa then the call, are both a genuine pair. Both copies feature the same
// token, off one rotation, because they are one card seen twice.
export function TokenMovesRow({ tokens = [] }: { tokens?: readonly TokenSpot[] }) {
  const t = useTranslations("discovery");

  // The holds are counted rather than flagged. The row draws the card twice,
  // and a pointer and a focus can rest on it at once, so the rotation restarts
  // only when the last of them has left.
  const holds = useRef(0);
  const [paused, setPaused] = useState(false);
  const onHold = useCallback((held: boolean) => {
    holds.current = Math.max(0, holds.current + (held ? 1 : -1));
    setPaused(holds.current > 0);
  }, []);

  const featured = useRotatingIndex(tokens.length, { intervalMs: TOKEN_HOLD_MS, paused });

  // What the card shows before the route has live tokens: the design's own BTC
  // call. Its price and move stay in the message file, so each locale keeps the
  // number formatting it ships today and this card still formats nothing.
  const fallback: TokenSpot = {
    symbol: "BTC",
    name: "Bitcoin",
    price: t("tokenFallbackPrice"),
    change: t("tokenFallbackChange"),
    up: true,
    movePercent: t("tokenFallbackMove"),
    logo: "/market/token-btc-coin.png",
    href: "/spot",
  };

  const token = tokens.length > 0 ? tokens[featured] : fallback;

  return (
    <DiscoveryRow title={t("tokenMovesTitle")} href="/spot">
      <Carousel label={t("tokenMovesCarousel")} trimPx={50}>
        <TokenCallCard token={token} onHold={onHold} />
        <EthAfricaCard />
        <TokenCallCard token={token} onHold={onHold} />
      </Carousel>
    </DiscoveryRow>
  );
}
