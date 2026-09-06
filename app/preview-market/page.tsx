"use client";

// TEMPORARY visual harness for the Market desktop redesign. Not linked from
// anywhere and deleted before the branch is opened for review; it exists so the
// new surfaces can be seen without a Privy session.

import { BalanceCardDesktop } from "@/features/portfolio/components/balance-card-desktop";
import { KashCardDesktop } from "@/features/portfolio/components/kash-card-desktop";
import { PromoArtBanner, PromoBanner, PromoRail } from "@/components/ui/promo-rail";
import {
  ConversationRow,
  Next100xRow,
  PredictionStartsRow,
  TokenMovesRow,
} from "@/features/discovery";
import type { MemeSpot, TokenSpot } from "@/features/discovery/types";

// Stand-ins for what the route feeds these shelves on the real dashboard, so
// the harness shows the rotating state rather than only the editorial fallback.
const TOKENS: readonly TokenSpot[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: "$1,876,617",
    change: "+12.8%",
    up: true,
    movePercent: "12.8%",
    logo: "/market/token-btc-coin.png",
    href: "/spot",
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: "$184.20",
    change: "-3.40%",
    up: false,
    movePercent: "3.40%",
    logo: null,
    href: "/spot",
  },
];

const MEMECOINS: readonly MemeSpot[] = [
  { symbol: "SHIB", name: "Shiba Inu", change: "+412%", up: true, image: null, href: "/meme" },
  { symbol: "PEPE", name: "Pepe", change: "+188%", up: true, image: null, href: "/meme" },
  { symbol: "WAGZ", name: "Wagz", change: "-63%", up: false, image: null, href: "/meme" },
  { symbol: "MOOG", name: "Moogle", change: "+77%", up: true, image: null, href: "/meme" },
];

export default function PreviewMarketPage() {
  const stakeBanner = (
    <PromoBanner
      href="/casino"
      title="Set the stake"
      subtitle="Everyone plays to win"
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
    <div className="min-h-screen bg-black">
      {/* Mirrors the dashboard's own container, because that is the width these
          cards actually ship at. The design column is only 1015px wide, so any
          artwork pinned to a design pixel size leaves a gap here. Verify at this
          width, not at the artboard's. */}
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-11 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,550fr)_minmax(0,457fr)]">
          <BalanceCardDesktop
            totalUsd={0}
            readyToSpend={0}
            tokens={[]}
            loading={false}
            refreshing={false}
            errored={false}
            depositPending={false}
            withdrawHeld={false}
            hidden={false}
            onToggleHidden={() => {}}
            formatMasked={(amount) => `$${amount.toFixed(2)}`}
            onOpenFunds={() => {}}
            onOpenWithdraw={() => {}}
            onTakeTour={() => {}}
          />
          <KashCardDesktop
            balance="0"
            unitPrice="$7"
            onHistory={() => {}}
            onSend={() => {}}
            onBuy={() => {}}
            onConvert={() => {}}
          />
        </div>

        <PromoRail label="Promotions">
          {stakeBanner}
          <PromoArtBanner
            href="/earn"
            label="Get Kash+"
            src="/market/promo-kash-banner.svg"
            width={515.768}
            height={88}
          />
          {stakeBanner}
        </PromoRail>

        <TokenMovesRow tokens={TOKENS} />
        <ConversationRow />
        <Next100xRow memecoins={MEMECOINS} />
        <PredictionStartsRow />
      </div>
    </div>
  );
}
