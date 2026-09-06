"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buildNav } from "@/components/layout/nav-items";
import { PortfolioView } from "@/features/portfolio";
import { DepositAnalytics } from "@/features/activity";
import { SectionVisibility } from "@/components/ui/section-visibility";
import { AppModalHost, useAppModals } from "@/components/layout/modals/app-modals";
import { BankDepositAnalytics } from "@/features/funds";
import { CrossBorderBanner } from "@/features/remit";
import { RwaSettlementTracker } from "@/features/rwa/components/rwa-settlement-tracker";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SquareComposeFab, SquareSection } from "@/features/square";
import {
  ConversationRow,
  Next100xRow,
  PredictionStartsRow,
  TokenMovesRow,
} from "@/features/discovery";
import { useTokenSpots } from "@/app/dashboard/discovery/tokens";
import { usePredictionSpots } from "@/app/dashboard/discovery/markets";
import { useMemeSpots } from "@/app/dashboard/discovery/memecoins";
import { useSpaceSpots } from "@/app/dashboard/discovery/spaces";
import { useSpotMarkets } from "@/features/trade/hooks/use-spot-markets";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { useDepositPrefill } from "@/hooks/use-deposit-prefill";
import { startDashboardTour, useDashboardTour } from "@/features/tour";
import { loadInterest } from "@/lib/preferences";
import { MARKET_SQUARE_HIDDEN } from "@/lib/market-square";
import type { SectionId } from "@/lib/sections";
import type { DashboardModal } from "@/lib/modal-types";
import type { DepositPrefill } from "@/lib/voice/intent";

const SECTION_CLASS = "scroll-mt-[124px] md:scroll-mt-[76px]";

// Portfolio is the only section still rendered in full here, so it is the only
// scroll-spy anchor: every other nav entry is now a route of its own.
const SCROLL_SECTIONS: readonly SectionId[] = ["portfolio"];

// Memoized so it skips re-rendering when the page re-renders for a modal
// open/close; it still re-renders on its own data.
const Portfolio = memo(PortfolioView);
export default function DashboardPage() {
  const tSections = useTranslations("sections");
  const tRemit = useTranslations("remitBanner");
  const nav = useMemo(() => buildNav(loadInterest(), tSections), [tSections]);
  const activeSection = useScrollSpy(SCROLL_SECTIONS);
  // The tradeable universe, so a $TICKER in a square post can open the real
  // buy sheet. The spot brief above already caches this, so it costs nothing
  // extra; the square slice takes a plain shape and never imports trade.
  const { markets: spotMarkets } = useSpotMarkets();
  // The square's feed tab lives here because two siblings drive it: the
  // section's own strip, and the plus sheet's discussions.
  const [squareTab, setSquareTab] = useState<string | undefined>(undefined);
  const openTopic = useCallback((key: string) => {
    setSquareTab(`topic:${key}`);
    // Otherwise the tab changes off-screen and the tap reads as doing nothing.
    document.getElementById("market-square")?.scrollIntoView({ behavior: "smooth" });
  }, []);
  const openDiscussion = useCallback((tag: string) => {
    setSquareTab(`tag:${tag}`);
    // Otherwise the tab changes off-screen and the tap reads as doing nothing.
    document.getElementById("market-square")?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useDashboardTour();

  // The rotating content for the discovery shelves. Each adapter reads its own
  // service's hook and hands back display-ready rows; an empty array is a
  // legitimate answer and leaves that shelf on its editorial card.
  const tokenSpots = useTokenSpots();
  const predictionSpots = usePredictionSpots();
  const memeSpots = useMemeSpots();
  const spaceSpots = useSpaceSpots();

  const modals = useAppModals();

  // A spoken deposit ("deposit USDC on Solana") lands here as URL params: open
  // the funds modal on the crypto screen with the chain/token pre-selected. The
  // hook returns a NEW prefill object each time a fresh deposit command arrives
  // and clears the URL params so a reload doesn't re-open it. We guard on the
  // prefill's identity (not a one-shot boolean) so a SECOND spoken deposit while
  // the page is still mounted re-opens the modal — the boolean latch used to
  // block every deposit after the first, which is why it only worked on refresh.
  const depositPrefill = useDepositPrefill();
  const openedDepositRef = useRef<DepositPrefill | null>(null);
  const openDeposit = modals.openDeposit;
  useEffect(() => {
    if (!depositPrefill || openedDepositRef.current === depositPrefill) return;
    openedDepositRef.current = depositPrefill;
    openDeposit(depositPrefill);
  }, [depositPrefill, openDeposit]);

  /**
   * `?buy=ETH` opens the buy sheet for that symbol.
   *
   * Market Square posts are full of $TICKER, and tapping one should land where
   * Ark would put you: the sheet that buys it. Without a URL for that, a
   * cross-product link could only drop somebody on a page and leave them to
   * find the coin themselves.
   *
   * DERIVED, not set in an effect. The catalogue arrives asynchronously, so an
   * effect would have to setState once it lands and trigger a second render
   * pass; deriving means the sheet is simply part of what this render already
   * knows. Dismissal is explicit rather than implied by clearing state, or the
   * derivation would immediately reopen what was just closed.
   *
   * An unknown symbol opens nothing: the square cannot know what this
   * deployment lists, and an empty sheet is worse than no sheet.
   */
  const buyParam = useSearchParams().get("buy");
  const [deepLinkDismissed, setDeepLinkDismissed] = useState(false);
  const deepLinkBuy = useMemo((): DashboardModal => {
    if (!buyParam || deepLinkDismissed) return null;
    const wanted = buyParam.toUpperCase();
    const market = spotMarkets.find((m) => m.symbol.toUpperCase() === wanted);
    if (!market) return null;
    return {
      type: "buy",
      buy: {
        symbol: market.symbol,
        name: market.name,
        priceUsd: market.priceUsd,
        logo: market.logo,
      },
    };
  }, [buyParam, deepLinkDismissed, spotMarkets]);

  // Strips the parameter so a refresh or a back does not reopen a sheet
  // somebody already dismissed. No setState here, only history.
  useEffect(() => {
    if (buyParam) window.history.replaceState(null, "", window.location.pathname);
  }, [buyParam]);

  // The deep-linked sheet only shows when nothing else is open.
  const active = modals.modal ?? deepLinkBuy;

  const closeModal = modals.close;
  const close = useCallback(() => {
    closeModal();
    setDeepLinkDismissed(true);
  }, [closeModal]);

  // Cross-border is not open yet. The banner stays as the announcement; a tap
  // says so rather than opening a flow that cannot complete.
  const openCrossBorder = useCallback(() => toast.info(tRemit("comingSoonToast")), [tRemit]);

  // The balance card carries the walkthrough's replay button in the new design.
  // The steps live on this page, so starting it here is a direct call; the
  // portfolio slice never imports the tour itself.
  const tTour = useTranslations("tour");
  const takeTour = useCallback(() => startDashboardTour(tTour), [tTour]);

  return (
    <AuthGuard>
      <DashboardShell nav={nav} activeSection={activeSection}>
        <RwaSettlementTracker />
        {/* Reports settled deposits. It used to ride on the recent-activity
            list that stood here; it is mounted on its own now that history
            lives only on its own page. */}
        <DepositAnalytics />
        {/* Follows a bank deposit to settlement so the arrival above can be
            reported as the Naira deposit it is, rather than as a chain one. */}
        <BankDepositAnalytics />

        {/* The account, in full. It is what someone opened Ark to see, and the
            only section that is not a doorway to somewhere else. */}
        <SectionVisibility id="portfolio" className={SECTION_CLASS}>
          <Portfolio
            onOpenFunds={modals.openFunds}
            onOpenWithdraw={modals.openWithdraw}
            onTakeTour={takeTour}
            crossBorderSlot={<CrossBorderBanner onClick={openCrossBorder} />}
          />
          {/* The design's discovery shelves, which sit under the balance cards
              on the Market desktop screen. Desktop only: the phone has its own
              redesign, and this layout is drawn for 1071px of main content.

              The route feeds them, not the shelves themselves: discovery must
              not import trade, prediction or meme, so the mapping from each
              service's own hook into the shapes the cards take lives beside
              this page. A shelf handed nothing keeps its editorial card. */}
          <div className="mx-auto hidden w-full max-w-[1520px] flex-col gap-11 px-4 pb-2 sm:px-6 md:flex lg:px-8">
            <TokenMovesRow tokens={tokenSpots} />
            <ConversationRow spaces={spaceSpots} />
            <Next100xRow memecoins={memeSpots} />
            <PredictionStartsRow markets={predictionSpots} />
          </div>
        </SectionVisibility>

        {/* The social floor of the dashboard. It sits AFTER the markets on
            purpose: someone opening Ark came for their money, and the square
            is what they scroll into once they are done reading it — met by
            browsing rather than by deciding to leave for another deployment.
            Hidden for now: see MARKET_SQUARE_HIDDEN in lib/market-square.ts. */}
        {MARKET_SQUARE_HIDDEN ? null : (
          <SquareSection
            onOpenBuy={modals.openBuy}
            markets={spotMarkets}
            tab={squareTab}
            onTabChange={setSquareTab}
          />
        )}
      </DashboardShell>
      {/* Outside the shell so it anchors to the viewport rather than the
          scrolling column. It reveals itself once the square is in reach. */}
      {MARKET_SQUARE_HIDDEN ? null : (
        <SquareComposeFab
          markets={spotMarkets}
          onPickTopic={openTopic}
          onPickDiscussion={openDiscussion}
        />
      )}

      <AppModalHost active={active} onClose={close} onConfirmed={modals.showDone} />
    </AuthGuard>
  );
}
