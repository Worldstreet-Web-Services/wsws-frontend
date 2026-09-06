"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BalanceCard } from "@/features/portfolio/components/balance-card";
import { KashBanner } from "@/features/portfolio/components/kash-banner";
import { PromoBanner, PromoRail } from "@/components/ui/promo-rail";
import { KashCard } from "@/features/portfolio/components/kash-card";
import { KashBuyModal } from "@/features/portfolio/components/kash-buy-modal";
import { KashConvertModal } from "@/features/portfolio/components/kash-convert-modal";
import { KashHistoryModal } from "@/features/portfolio/components/kash-history-modal";
import { KashUpgradeModal } from "@/features/portfolio/components/kash-upgrade-modal";
import { KashSendModal } from "@/features/portfolio/components/kash-send-modal";
import { useKashAccount, useKashClaim } from "@/features/portfolio/hooks/use-kash";
import { track } from "@/lib/analytics/mixpanel";

interface PortfolioViewProps {
  onOpenFunds: () => void;
  onOpenWithdraw: () => void;
  /** Replays the walkthrough; owned by the route, see BalanceCardViewProps. */
  onTakeTour: () => void;
  /**
   * The cross-border announcement banner. Parked: the section that rendered it
   * is commented out at the board's request until cross-border is a live flow,
   * and the slot is kept so turning it back on is one line here and nothing at
   * the route.
   */
  crossBorderSlot: ReactNode;
}

// The head of the dashboard as the Market design draws it: the two balance
// cards, then the promo rail. The holdings table that used to sit under them
// is gone at the board's request, and with it the phone's holdings list; the
// design ends this block at the rail.
export function PortfolioView({ onOpenFunds, onOpenWithdraw, onTakeTour }: PortfolioViewProps) {
  const tDiscovery = useTranslations("discovery");
  const { wallet: kashWallet } = useKashAccount();
  const claimPoints = useKashClaim();
  const [kashModal, setKashModal] = useState<
    "buy" | "send" | "convert" | "history" | "upgrade" | null
  >(null);

  // Declared once because the rail shows it twice: see the note on the strip.
  const stakeBanner = (
    <PromoBanner
      href="/casino"
      title={tDiscovery("stakeTitle")}
      subtitle={tDiscovery("stakeSubtitle")}
      background="#ed2b07"
      glyph="/market/promo-stake-flame.svg"
      scallop="/market/promo-stake-scallop.svg"
      art={[
        {
          src: "/market/promo-stake-glow-left.svg",
          top: -17.38,
          left: -19.85,
          width: 253.22,
          height: 253.22,
        },
        {
          src: "/market/promo-stake-glow-right.svg",
          top: -71.99,
          left: 188.68,
          width: 439.41,
          height: 439.41,
        },
      ]}
    />
  );

  return (
    <div className="mx-auto w-full max-w-[1520px] p-4 sm:p-6 lg:p-8">
      <KashBuyModal
        open={kashModal === "buy"}
        wallet={kashWallet}
        onClose={() => setKashModal(null)}
      />
      <KashConvertModal open={kashModal === "convert"} onClose={() => setKashModal(null)} />
      <KashHistoryModal open={kashModal === "history"} onClose={() => setKashModal(null)} />
      <KashUpgradeModal open={kashModal === "upgrade"} onClose={() => setKashModal(null)} />
      <KashSendModal open={kashModal === "send"} onClose={() => setKashModal(null)} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <BalanceCard
          onOpenFunds={onOpenFunds}
          onOpenWithdraw={onOpenWithdraw}
          onTakeTour={onTakeTour}
        />
        <KashCard
          onBuy={() => setKashModal("buy")}
          onClaim={
            kashWallet
              ? () =>
                  claimPoints.mutate(
                    { wallet: kashWallet },
                    {
                      // Reported on settlement, so the figure is what the engine
                      // actually minted rather than what was claimable.
                      onSuccess: (result) =>
                        track("kash_earned", { kash_amount: Number(result.kashMinted) }),
                    }
                  )
              : undefined
          }
          claiming={claimPoints.isPending}
          onSend={() => setKashModal("send")}
          onConvert={() => setKashModal("convert")}
          onHistory={() => setKashModal("history")}
          onUpgrade={() => setKashModal("upgrade")}
        />
      </div>

      {/* The design's promo strip, under the balance cards. Desktop only: the
          phone has its own redesign. Market Square has no banner here while the
          square itself is switched off, so the rail carries two designs; the
          stake banner repeats as a third stop so the carousel has something to
          move to. */}
      <div className="mt-3 hidden md:block">
        <PromoRail label={tDiscovery("promoRailCarousel")}>
          {stakeBanner}
          <KashBanner onBuy={() => setKashModal("buy")} />
          {stakeBanner}
        </PromoRail>
      </div>

      {/* Commented out for now, at explicit request — cross-border is still
          just a "coming soon" announcement banner, not a live flow. */}
      {/* <div className="mt-3">{crossBorderSlot}</div> */}
    </div>
  );
}
