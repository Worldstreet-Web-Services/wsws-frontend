"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MarketLogo } from "@/components/ui/market-logo";
import { AssetIcon } from "@/components/ui/asset-icon";
import { PerpsSection } from "@/features/trade/components/perps-section";
import { MemeCoin, PctChange, priceLabel } from "@/features/trade/components/meme-bits";
import { parseBaseUnits } from "@/features/trade/components/meme-base-units";
import { MemeTradeSheet } from "@/features/trade/components/meme-trade-sheet";
import { TradeTicket, USD_DECIMALS } from "@/features/trade/components/meme-trade-ticket";
import { SpotTicket } from "@/features/trade/components/spot-ticket";
import { useSpotMarkets, type SpotMarket } from "@/features/trade/hooks/use-spot-markets";
import { useTrendingMemes } from "@/features/trade/hooks/use-meme-tokens";
import {
  useMemePreview,
  useMemeTrade,
  type MemeTradeInput,
} from "@/features/trade/hooks/use-meme-trade";
import { usePaged } from "@/hooks/use-paged";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePortfolio } from "@/hooks/use-portfolio";
import { displaySymbol } from "@/lib/buy";
import { friendlyError } from "@/lib/errors";
import { isValidTradeAmount, type MemeToken } from "@/lib/meme/api";
import { SOLANA_CHAIN_ID, networkOf } from "@/lib/meme/chain";
import { buyFunding } from "@/lib/meme/funding";
import { exceedsHeld } from "@/lib/meme/sell-amount";
import { toast } from "@/lib/toast";
import { belowMinimumBuy } from "@/lib/trade/minimums";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";
import type { BuyPayload, DetailPayload } from "@/lib/modal-types";

interface MobileMarketViewProps {
  /**
   * The route's modal openers. Neither is called any more: a spot row used to
   * open the asset sheet and buy from there, and it now opens the ticket on
   * this page instead. They stay in the contract, optional, so the route keeps
   * compiling until someone touches it and drops them.
   */
  onOpenDetail?: (detail: DetailPayload) => void;
  onOpenBuy?: (buy: BuyPayload) => void;
  /**
   * The Prediction tab's content, supplied by the route. Prediction is its own
   * feature, and features never import each other, so the route composes it.
   */
  predictionSlot: ReactNode;
}

// The Market design's phone Spot page (Figma 173:42337): its own MARKET head on
// the ray fan, a search box and the market-category tabs, then the full token
// list — every asset you can buy or sell, like the desktop desk. Tapping a token
// opens the spot ticket for it (Figma 1:7825) in the list's place, the way the
// Memecoins tab opens its trade sheet. The list is kept, not replaced.

// All four categories render inline on this page: nothing here navigates, so
// the strip is a tab control rather than a set of links.
//
// `searchable` says whether the search field can act on the panel below it.
// Spot and Memecoins are lists this view filters itself; the perps desk and
// prediction own their own selection, and neither takes a query from us.
const TABS = [
  { id: "spot", labelKey: "tabSpot", searchable: true },
  { id: "leverage", labelKey: "tabLeverage", searchable: false },
  { id: "memecoins", labelKey: "tabMemecoins", searchable: true },
  { id: "prediction", labelKey: "tabPrediction", searchable: false },
] as const;

type TabId = (typeof TABS)[number]["id"];

function changeLabel(chg: number): string {
  const v = Number.isFinite(chg) ? chg : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

// Rows per page for the Spot and Memecoins lists. The viewport is fixed (this
// is a phone screen, not the resizable desktop desk), so a measured hook is
// overkill: 60px rows in the space left under a 76px header, the search
// field, the tab strip and the pager itself comfortably fit 8 without the
// page needing to scroll past the tab strip, on both a 390px and a taller
// 430px+ phone.
const PAGE_SIZE = 8;

/**
 * Prev / "Page X of Y" / Next, sized for this screen's 44px targets. The
 * page count is announced through `aria-live` on the label so a screen
 * reader hears the change without focus moving off the button just pressed.
 *
 * A local control rather than components/ui/list-pagination.tsx: that
 * primitive's buttons run smaller than 44px, and this file cannot edit a
 * shared component to fix that for every other consumer. Both the Spot and
 * Memecoins tabs use this one control, so the two pagers still feel like the
 * same control.
 */
function ListPager({
  page,
  pageCount,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("markets");
  return (
    <div className="mt-1 flex shrink-0 items-center justify-between border-t border-white/6 px-1 pt-2 pb-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label={t("prev")}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
          canPrev
            ? "cursor-pointer text-white/75 active:bg-white/5"
            : "cursor-not-allowed text-white/25"
        }`}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span aria-live="polite" className="tnum text-[12px] font-semibold text-white/50">
        {t("pageOf", { page: page + 1, pages: pageCount })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label={t("next")}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
          canNext
            ? "cursor-pointer text-white/75 active:bg-white/5"
            : "cursor-not-allowed text-white/25"
        }`}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

/**
 * One page of `items`, paginated with `usePaged`, plus its own foot pager.
 * Keyed by the caller on the search query, so a term that narrows the list
 * remounts this and resets to page 1 rather than stranding the reader on a
 * page number the new, shorter list may not even have.
 */
function PagedRows<T>({ items, renderRow }: { items: T[]; renderRow: (item: T) => ReactNode }) {
  const paged = usePaged(items, PAGE_SIZE);
  if (items.length === 0) return null;
  return (
    <>
      {paged.pageItems.map(renderRow)}
      <ListPager
        page={paged.page}
        pageCount={paged.pageCount}
        canPrev={paged.canPrev}
        canNext={paged.canNext}
        onPrev={paged.goPrev}
        onNext={paged.goNext}
      />
    </>
  );
}

/**
 * The market-category strip.
 *
 * It is a real tablist: `role="tablist"`/`role="tab"` with `aria-selected`, and
 * a roving tabindex so a keyboard user steps into the strip once and arrows
 * across rather than pressing Tab past four controls. Home and End jump to the
 * ends. The strip is wider than the phone, so selecting a tab also scrolls it
 * into view; without that, choosing Prediction on a 390px screen left it
 * half-clipped at the right edge.
 *
 * This duplicates features/square/components/square-tabs.tsx, which solves the
 * same problem for the feed. The two should be merged into a shared primitive
 * under components/ui/ once the screens in flight have landed; features cannot
 * import each other, so neither can reuse the other where they sit today.
 */
function MarketTabs({
  active,
  onSelect,
  label,
  tabId,
  tabs,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
  label: string;
  tabId: (id: TabId) => string;
  tabs: { id: TabId; label: string }[];
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  const select = useCallback(
    (id: TabId, moveFocus: boolean) => {
      onSelect(id);
      const node = stripRef.current?.querySelector<HTMLButtonElement>(
        `[data-tab-id="${CSS.escape(id)}"]`
      );
      if (moveFocus) node?.focus();
      // Optional-called on purpose: bringing the tab into view is a nicety and
      // must never be the reason selection fails. jsdom does not implement it.
      node?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    },
    [onSelect]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const index = tabs.findIndex((tab) => tab.id === active);
      if (index < 0) return;
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;

      event.preventDefault();
      const target = tabs[next];
      if (target) select(target.id, true);
    },
    [tabs, active, select]
  );

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className="mt-4 flex shrink-0 [scrollbar-width:none] gap-4 overflow-x-auto border-b border-white/8 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            id={tabId(tab.id)}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(tab.id, false)}
            onKeyDown={onKeyDown}
            className="relative flex min-h-[44px] shrink-0 items-center justify-center px-3 focus-visible:outline-none"
          >
            <span
              className={`font-serif text-[13px] font-semibold tracking-[-0.36px] whitespace-nowrap ${
                selected ? "text-white" : "text-white/40"
              }`}
            >
              {tab.label}
            </span>
            {selected ? (
              <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-white" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function MobileMarketView({ predictionSlot }: MobileMarketViewProps) {
  const router = useRouter();
  const t = useTranslations("markets");
  const tCommon = useTranslations("common");
  const tSpot = useTranslations("spot");
  const tMeme = useTranslations("meme");
  const { markets, loading, error } = useSpotMarkets();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("spot");

  // A market's own ticket opens in the list's place. The market is held by
  // symbol rather than by object, so a price tick that rebuilds the catalogue
  // does not leave the ticket pointed at a stale copy.
  const [ticketSymbol, setTicketSymbol] = useState<string | null>(null);
  const ticketMarket = useMemo(
    () => (ticketSymbol ? (markets.find((m) => m.symbol === ticketSymbol) ?? null) : null),
    [markets, ticketSymbol]
  );

  // The list is hidden rather than unmounted, and its scroll offset is put back
  // by hand on the way out: `hidden` takes the element out of layout, which
  // drops the offset the browser was holding. Someone eighty rows down comes
  // back to where they were, not to the top.
  const listRef = useRef<HTMLDivElement>(null);
  const listScrollTop = useRef(0);

  const openTicket = useCallback((m: SpotMarket) => {
    listScrollTop.current = listRef.current?.scrollTop ?? 0;
    setTicketSymbol(m.symbol);
  }, []);

  const closeTicket = useCallback(() => setTicketSymbol(null), []);

  useLayoutEffect(() => {
    if (ticketMarket === null && listRef.current) {
      listRef.current.scrollTop = listScrollTop.current;
    }
  }, [ticketMarket]);

  const { tokens: memes, isLoading: memeLoading, error: memeError } = useTrendingMemes();

  // A memecoin's own ticket opens in the list's place, the same hide-not-
  // unmount and scroll-restore pattern the Spot tab uses above. Held by
  // address rather than by object for the same reason ticketSymbol is: a
  // trending-list refresh must not leave the ticket pointed at a stale copy.
  const [memeTicketAddress, setMemeTicketAddress] = useState<string | null>(null);
  const ticketMeme = useMemo(
    () => (memeTicketAddress ? (memes.find((m) => m.address === memeTicketAddress) ?? null) : null),
    [memes, memeTicketAddress]
  );

  const memeListRef = useRef<HTMLDivElement>(null);
  const memeListScrollTop = useRef(0);

  const openMemeTicket = useCallback((token: MemeToken) => {
    memeListScrollTop.current = memeListRef.current?.scrollTop ?? 0;
    setMemeTicketAddress(token.address);
  }, []);

  const closeMemeTicket = useCallback(() => setMemeTicketAddress(null), []);

  useLayoutEffect(() => {
    if (ticketMeme === null && memeListRef.current) {
      memeListRef.current.scrollTop = memeListScrollTop.current;
    }
  }, [ticketMeme]);

  const panelId = useId();
  const tabDomId = useCallback((id: TabId) => `${panelId}-tab-${id}`, [panelId]);

  const tabs = useMemo(() => TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) })), [t]);
  // Neither open ticket is a list this field can filter, so the same rule the
  // perps and prediction panels get applies to both.
  const searchable =
    (TABS.find((tab) => tab.id === activeTab)?.searchable ?? false) &&
    ticketSymbol === null &&
    memeTicketAddress === null;

  // Reset the query on a category change, so a term typed on Spot does not
  // silently filter (and blank) the Memecoins list, and vice versa.
  const selectTab = useCallback((id: TabId) => {
    setActiveTab(id);
    setQuery("");
    setTicketSymbol(null);
    setMemeTicketAddress(null);
  }, []);

  // The ticket's own trade state: which side, how much, and the trade
  // machine's phase/error. Mirrors the wiring meme-board.tsx does for the
  // same TradeTicket, since that is the orchestration this composes into.
  const [memeSide, setMemeSide] = useState<"BUY" | "SELL">("BUY");
  const [memeAmount, setMemeAmount] = useState("");
  // A Solana order is finished in the sheet; see submitMemeTrade below, same
  // split meme-board.tsx makes for its own TradeTicket.
  const [memeSheetToken, setMemeSheetToken] = useState<MemeToken | null>(null);
  const {
    walletFor: memeWalletFor,
    phase: memePhase,
    error: memeTradeError,
    trade: runMemeTrade,
  } = useMemeTrade();
  const memePortfolio = usePortfolio();
  const debouncedMemeAmount = useDebouncedValue(memeAmount, 600);

  const changeMemeSide = useCallback((side: "BUY" | "SELL") => {
    setMemeSide(side);
    setMemeAmount("");
  }, []);

  const memeBuying = memeSide === "BUY";
  const memeWallet = ticketMeme ? memeWalletFor(ticketMeme.chainId) : null;
  const memeUsdcOn = (network: string) =>
    memePortfolio.tokens.find((p) => p.network === network && p.symbol.toUpperCase() === "USDC")
      ?.balance ?? 0;
  const memeFunding = buyFunding({
    chainId: ticketMeme?.chainId ?? 0,
    payUsd: isValidTradeAmount(debouncedMemeAmount, USD_DECIMALS) ? Number(debouncedMemeAmount) : 0,
    baseUsdc: memeUsdcOn("base-mainnet"),
    solanaUsdc: memeUsdcOn("solana-mainnet"),
  });

  const memeNetwork = ticketMeme ? networkOf(ticketMeme.chainId) : null;
  const memeOnSolana = ticketMeme?.chainId === SOLANA_CHAIN_ID;
  const memeHeld =
    ticketMeme && memeNetwork
      ? memePortfolio.tokens.find(
          (p) =>
            p.network === memeNetwork &&
            (memeOnSolana
              ? p.address === ticketMeme.address
              : p.address?.toLowerCase() === ticketMeme.address.toLowerCase())
        )
      : undefined;
  const memeHeldRaw = memeHeld?.rawBalance ?? "0";
  const memeHeldDecimals = memeHeld?.decimals ?? ticketMeme?.decimals ?? 18;

  const memeMaxDecimals = memeBuying ? USD_DECIMALS : memeHeldDecimals;
  const memeAmountValid = isValidTradeAmount(debouncedMemeAmount, memeMaxDecimals);
  const memeSideEnabled = ticketMeme
    ? memeBuying
      ? ticketMeme.buyEnabled
      : ticketMeme.sellEnabled
    : false;
  const memeOverBalance =
    memeAmountValid &&
    (memeBuying
      ? Number(debouncedMemeAmount) > memeFunding.spendableUsd + 1e-9
      : parseBaseUnits(memeHeldRaw) === null ||
        exceedsHeld(debouncedMemeAmount, memeHeldRaw, memeHeldDecimals));
  const memeBelowMin =
    memeBuying && belowMinimumBuy(Number(debouncedMemeAmount || "0"), Boolean(memeOnSolana));

  // Only worth asking for a quote once the order could actually be placed,
  // same gate meme-board.tsx uses: the preview endpoint is rate limited
  // (20/min) and the trade service refuses to price a Solana buy short of
  // its pre-move USDC anyway.
  const memePreviewInput =
    ticketMeme &&
    memeWallet &&
    memeAmountValid &&
    memeSideEnabled &&
    !memeOverBalance &&
    !memeBelowMin &&
    !(memeBuying && memeFunding.needsFunding)
      ? {
          side: memeSide,
          tokenAddress: ticketMeme.address,
          amount: debouncedMemeAmount,
          walletAddress: memeWallet,
          chainId: ticketMeme.chainId,
        }
      : null;
  const memePreview = useMemePreview(memePreviewInput);

  // Base executes here in full. A Solana order does not: buying one may need
  // the USDC moved to the Solana wallet first, and selling one has to record
  // what the sale should deliver so the settlement tracker can route the
  // proceeds back to the USD balance. Both of those live in MemeTradeSheet,
  // so a Solana order is handed there rather than run here with half the
  // plumbing, the same split meme-board.tsx makes for its own TradeTicket.
  // The tap-to-screen fix stands either way: the sheet only ever appears from
  // a submit, never from the row tap that used to open it directly.
  async function submitMemeTrade(input: MemeTradeInput) {
    if (!ticketMeme) return;
    if (input.chainId === SOLANA_CHAIN_ID) {
      setMemeSheetToken(ticketMeme);
      return;
    }
    const symbol = displaySymbol(ticketMeme.symbol ?? "");
    const toastId = toast.loading(
      input.side === "BUY" ? tMeme("buyingToast", { symbol }) : tMeme("sellingToast", { symbol })
    );
    try {
      await runMemeTrade(input);
      toast.success(
        input.side === "BUY" ? tMeme("toastBought", { symbol }) : tMeme("toastSold", { symbol }),
        { id: toastId }
      );
      setMemeAmount("");
      void memePortfolio.refetchUntilChanged();
    } catch (e) {
      toast.error(friendlyError(e, tMeme("orderFailed")), { id: toastId });
      void memePortfolio.refetchFresh();
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? markets.filter((m) => `${m.symbol} ${m.name}`.toLowerCase().includes(q)) : markets;
  }, [markets, query]);

  const memeRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? memes.filter((m) => `${m.symbol ?? ""} ${m.name ?? ""}`.toLowerCase().includes(q))
      : memes;
  }, [memes, query]);

  // A phone design: full-bleed on a phone, but capped to a phone-width column on
  // desktop (centered, framed) instead of stretching edge to edge.
  return (
    <div className="fixed inset-0 mx-auto flex flex-col overflow-hidden bg-[#0f0f0f] md:max-w-[440px] md:border-x md:border-white/8">
      {/* MARKET head on the ray fan. 76px (was 100px): the ray art is a
          background-image stretched with bg-size-[100%_100%], so it crops and
          reflows with the box rather than distorting. */}
      <div className="relative flex h-[76px] shrink-0 items-end justify-center overflow-hidden bg-[#232323] bg-[url('/market/topbar-rays.svg')] bg-size-[100%_100%] bg-no-repeat pb-[15px]">
        <button
          type="button"
          // Inside either ticket, Back is the way out of the ticket. Only
          // from a list does it leave the page.
          onClick={() => {
            if (ticketSymbol !== null) {
              closeTicket();
              return;
            }
            if (memeTicketAddress !== null) {
              closeMemeTicket();
              return;
            }
            if (window.history.length > 1) router.back();
            else router.push("/portfolio");
          }}
          aria-label={tCommon("back")}
          // 44px hit area around a 20px glyph, kept centred in the shorter
          // header: (76 - 44) / 2 = 16px, i.e. bottom-4.
          className="absolute bottom-4 left-[14px] flex size-11 cursor-pointer items-center justify-center rounded-full text-white/80 hover:text-white"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <MarketLogo className="h-5 w-auto" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-6">
        {/* Search. The comp carries it on all four screens, so it stays mounted
            rather than unmounting and lurching the strip up by 51px. On a tab
            whose panel owns its own selection it is disabled: a field that
            cannot filter what is under it must say so rather than swallow what
            the user types. Giving perps and prediction a real query needs a
            prop on those panels, which this view does not own. */}
        <div
          className={`flex h-[51px] shrink-0 items-center gap-1 rounded-[50px] border-2 border-white/2 px-6 ${
            searchable ? "bg-white/5" : "bg-white/2"
          }`}
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="shrink-0"
          >
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.45)" strokeWidth="1.8" />
            <path
              d="m20 20-3.5-3.5"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchLabel")}
            aria-label={t("searchLabel")}
            disabled={!searchable}
            className="min-w-0 flex-1 bg-transparent font-serif text-[13px] font-semibold tracking-[-0.39px] text-white outline-none placeholder:text-white/45 disabled:cursor-not-allowed disabled:placeholder:text-white/25"
          />
        </div>

        <MarketTabs
          active={activeTab}
          onSelect={selectTab}
          label={t("tabsAria")}
          tabId={tabDomId}
          tabs={tabs}
        />

        {/* One panel, named by the tab that selected it. The perps desk is told
            it is a guest here so it drops its own page chrome; without the flag
            its gutters stack on this page's and every card loses 32px. */}
        <div
          role="tabpanel"
          aria-labelledby={tabDomId(activeTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {activeTab === "leverage" ? (
            <div className="mt-3 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
              <PerpsSection embedded />
            </div>
          ) : activeTab === "memecoins" ? (
            <>
              {ticketMeme ? (
                <div className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                  <div className="flex flex-col gap-3 px-1 pt-1 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0">
                          <MemeCoin token={ticketMeme} size={32} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-serif text-[14px] font-semibold text-white">
                            {ticketMeme.symbol ?? "?"}
                          </span>
                          <span className="block truncate text-[11.5px] font-normal text-white/50">
                            {ticketMeme.name ?? "—"}
                          </span>
                        </span>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="tnum block font-serif text-[15px] font-semibold text-white">
                          {priceLabel(ticketMeme.priceUsd)}
                        </span>
                        <span className="block text-[12px] font-semibold">
                          <PctChange value={ticketMeme.priceChange24hPercent} />
                        </span>
                      </span>
                    </div>

                    <div
                      role="group"
                      aria-label={tMeme("tradeAction")}
                      className="bg-grey-800 flex gap-2 rounded-full p-2"
                    >
                      {(["BUY", "SELL"] as const).map((option) => {
                        const on = memeSide === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => changeMemeSide(option)}
                            aria-pressed={on}
                            className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-3xl font-[family-name:var(--font-sportsbook)] text-base font-semibold transition-colors ${
                              on
                                ? `${option === "BUY" ? "bg-buy" : "bg-sell"} text-white`
                                : "border border-white/8 bg-[rgba(54,54,54,0.16)] text-[#e9fff7]"
                            }`}
                          >
                            {option === "BUY" ? tMeme("buy") : tMeme("sell")}
                          </button>
                        );
                      })}
                    </div>

                    <TradeTicket
                      token={ticketMeme}
                      side={memeSide}
                      amount={memeAmount}
                      onAmountChange={setMemeAmount}
                      funding={memeFunding}
                      heldRaw={memeHeldRaw}
                      heldDecimals={memeHeldDecimals}
                      preview={memePreview.data ?? null}
                      previewLoading={memePreview.isFetching}
                      previewError={memePreview.error}
                      onSubmit={submitMemeTrade}
                      phase={memePhase}
                      error={memeTradeError}
                    />
                  </div>
                </div>
              ) : null}
              <div
                ref={memeListRef}
                data-testid="meme-market-list"
                hidden={ticketMeme !== null}
                className="-mx-1 mt-2 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
              >
                {memeLoading && memeRows.length === 0 ? (
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex h-[60px] items-center gap-3 px-1">
                      <span className="size-9 shrink-0 animate-pulse rounded-full bg-white/8" />
                      <span className="h-4 w-24 animate-pulse rounded bg-white/8" />
                    </div>
                  ))
                ) : (
                  <PagedRows
                    key={query}
                    items={memeRows}
                    renderRow={(token) => (
                      <button
                        key={token.address}
                        type="button"
                        onClick={() => openMemeTicket(token)}
                        className="flex h-[60px] w-full items-center gap-3 border-b border-white/6 px-1 text-left transition-colors active:bg-white/5"
                      >
                        <span className="shrink-0">
                          <MemeCoin token={token} size={36} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-[14px] font-semibold text-white">
                            {token.symbol ?? "?"}
                          </span>
                          <span className="block truncate text-[11.5px] font-normal text-white/50">
                            {token.name ?? "—"}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="tnum block font-serif text-[13.5px] font-semibold text-white">
                            {priceLabel(token.priceUsd)}
                          </span>
                          <span className="block text-[12px] font-semibold">
                            <PctChange value={token.priceChange24hPercent} />
                          </span>
                        </span>
                      </button>
                    )}
                  />
                )}
                {!memeLoading && (memeError || memeRows.length === 0) ? (
                  <p className="mt-8 text-center text-[13px] font-normal text-white/45">
                    {memeError ? tMeme("unavailable") : tMeme("noResults")}
                  </p>
                ) : null}
              </div>
            </>
          ) : activeTab === "prediction" ? (
            // The prediction slot is the phone market list
            // (features/prediction/components/prediction-market-list.tsx). It is
            // mounted only while this tab is selected, so its feed is not
            // fetched for someone who never opens it.
            //
            // Geometry from the comp (Figma 1:16194): the card stack sits 24px
            // under the strip and in 16px gutters, four narrower than this
            // page's own 20px, which is the same bleed the spot and memecoin
            // lists take.
            <div
              data-testid="prediction-panel-scroll"
              className="-mx-1 mt-6 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
            >
              {predictionSlot}
            </div>
          ) : (
            <>
              {ticketMarket ? (
                <div className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                  <SpotTicket market={ticketMarket} onChangeMarket={closeTicket} />
                </div>
              ) : null}
              <div
                ref={listRef}
                data-testid="spot-market-list"
                hidden={ticketMarket !== null}
                className="-mx-1 mt-2 min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden"
              >
                {loading && rows.length === 0 ? (
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex h-[60px] items-center gap-3 px-1">
                      <span className="size-9 shrink-0 animate-pulse rounded-[10px] bg-white/8" />
                      <span className="h-4 w-24 animate-pulse rounded bg-white/8" />
                    </div>
                  ))
                ) : (
                  <PagedRows
                    key={query}
                    items={rows}
                    renderRow={(m) => {
                      const up = m.change24h >= 0;
                      return (
                        <button
                          key={m.symbol}
                          type="button"
                          onClick={() => openTicket(m)}
                          className="flex h-[60px] w-full items-center gap-3 border-b border-white/6 px-1 text-left transition-colors active:bg-white/5"
                        >
                          <span className="shrink-0 overflow-hidden rounded-[10px]">
                            <AssetIcon
                              sym={m.symbol}
                              bg={tokenBg(m.symbol)}
                              logo={m.logo}
                              fallback="gradient"
                              size={36}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-serif text-[14px] font-semibold text-white">
                              {m.symbol}
                            </span>
                            <span className="block truncate text-[11.5px] font-normal text-white/50">
                              {m.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="tnum block font-serif text-[13.5px] font-semibold text-white">
                              {m.priceUsd > 0 ? formatUsd(m.priceUsd) : "—"}
                            </span>
                            <span
                              className={`tnum block text-[12px] font-semibold ${up ? "text-up" : "text-down"}`}
                            >
                              {changeLabel(m.change24h)}
                            </span>
                          </span>
                        </button>
                      );
                    }}
                  />
                )}
                {!loading && rows.length === 0 ? (
                  <p className="mt-8 text-center text-[13px] font-normal text-white/45">
                    {error ? tSpot("unavailable") : t("noResults")}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* A Solana order handed off from submitMemeTrade above, self-rendered
          as an overlay on top of the ticket screen the same way it sits atop
          meme-board.tsx. */}
      {memeSheetToken ? (
        <MemeTradeSheet
          token={memeSheetToken}
          defaultSide={memeSide}
          onClose={() => setMemeSheetToken(null)}
        />
      ) : null}
    </div>
  );
}
