"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { PerpsView } from "@/features/trade/components/perps-view";
import { PerpMarketList } from "@/features/trade/components/perp-market-list";
import { HyperliquidProPerps } from "@/features/trade/components/hyperliquid-pro-perps";
import { useFitRows } from "@/features/trade/hooks/use-fit-rows";

// Perpetuals as its own sidebar section: an eyebrow over the perps desk. Spot
// lives in its own section now.
//
// There is one perps interface. The simple/pro switch that used to sit in this
// header was removed, so the desk below is the same at every width: two columns
// from 1080px, and a single stacked, scrolling column under it.
//
// This file owns the CHROME around that desk and nothing else: the heading, the
// gutters, the width cap and the gap between them. It has two hosts, and they
// disagree about who draws that chrome, which is what `embedded` settles.
//
// The embedded host also gets a list-first flow the standalone route does not:
// a market list (perp-market-list.tsx) stands in front of the ticket, and
// tapping a row opens HyperliquidProPerps pinned to that symbol. This mirrors
// mobile-market-view.tsx's own Spot tab (list held, ticket swapped in over it,
// `hidden` rather than unmounted so its scroll offset survives the round trip)
// exactly, scoped to the `embedded` branch alone. The non-embedded /perps route
// below is untouched: same PerpsView call it always was, reachable on a phone
// exactly as before.

export interface PerpsSectionProps {
  /**
   * True when the host already draws the page chrome, so this section must draw
   * none of its own.
   *
   * The phone Market page (Figma 1:7580 "Leverage Trading", 1:7701 with the
   * chart open) is that host. It puts the MARKET head, the search field and the
   * category tabs above the desk and holds the whole page in a 20px gutter, and
   * the comp then runs straight from the tab rule to the BTC/USDT pill. Left to
   * draw its own chrome inside that page this section added an eyebrow reading
   * "Perpetuals" under a tab already reading "Leverage Trading", and stacked
   * `p-4` on the page's own `px-5`: measured in headless Chrome at a 402px
   * viewport, the desk sat at x=36 in 330px against the comp's x=20 in 362px,
   * so every card on the screen lost 32px of width.
   *
   * The /perps route is the other host. There is nothing above the desk there
   * but a hamburger, so the eyebrow is the only thing naming the screen and the
   * gutters are the only ones there are. That is the default, and it is
   * unchanged.
   */
  embedded?: boolean;
}

export function PerpsSection({ embedded = false }: PerpsSectionProps = {}) {
  const tSections = useTranslations("sections");
  const tCommon = useTranslations("common");

  // Which market's ticket is open, list-first. This state, and everything
  // below that reads it, only exists on the embedded branch: the
  // non-embedded return further down never looks at it, so /perps cannot
  // pick up list-first behavior by width or by accident, only by the
  // `embedded` prop the caller passes.
  const [symbol, setSymbol] = useState<string | null>(null);

  // The list is hidden rather than unmounted on the way to a ticket, and its
  // scroll offset is put back by hand on the way out: `hidden` takes the
  // element out of layout, which drops the offset the browser was holding.
  // Same technique mobile-market-view.tsx's own Spot tab uses for the same
  // reason.
  const listRef = useRef<HTMLDivElement>(null);
  const listScrollTop = useRef(0);

  const openTicket = useCallback((sym: string) => {
    listScrollTop.current = listRef.current?.scrollTop ?? 0;
    setSymbol(sym);
  }, []);

  const closeTicket = useCallback(() => setSymbol(null), []);

  useLayoutEffect(() => {
    if (symbol === null && listRef.current) {
      listRef.current.scrollTop = listScrollTop.current;
    }
  }, [symbol]);

  // The list shows as many rows as its box can hold, so the perps list fills
  // the phone the same way the Spot and Memecoins lists do. listRef is that
  // box. Harmless on the non-embedded route below, where the ref never attaches
  // and the count falls back to a default this branch does not read anyway.
  const listPageSize = useFitRows(listRef);

  if (embedded) {
    // pt-3 against the host's own mt-3 makes the 24px the comp leaves between
    // the tab rule and the pair pill. No horizontal padding and no width cap:
    // both are the host's, and adding a second copy of either is what pushed
    // the desk in.
    //
    // `h-full`/`flex-1`/`overflow-y-auto` on the two panels below make this
    // section its own scroll owner rather than leaning on the host's own
    // scrolling div: the host hands this section a definite height (its own
    // wrapper is `min-h-0 flex-1`), so a child that fills it and scrolls
    // internally is what lets the list's scroll offset be captured and
    // restored from inside this file, without a ref into a host this file
    // does not own.
    return (
      <div className="flex h-full min-h-0 w-full flex-col pt-3">
        {symbol !== null ? (
          <div className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={closeTicket}
              aria-label={tCommon("back")}
              // 44px hit area around a 20px glyph, matching the host page's own
              // back control (mobile-market-view.tsx).
              className="-ml-2.5 flex size-11 cursor-pointer items-center justify-center rounded-full text-white/80 hover:text-white"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <HyperliquidProPerps initialSymbol={symbol} />
          </div>
        ) : null}
        <div
          ref={listRef}
          hidden={symbol !== null}
          className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
        >
          <PerpMarketList onSelect={openTicket} pageSize={listPageSize} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1920px] p-4 sm:p-6 lg:p-8">
      <Eyebrow>{tSections("perps")}</Eyebrow>
      <div className="mt-4">
        <PerpsView />
      </div>
    </div>
  );
}
