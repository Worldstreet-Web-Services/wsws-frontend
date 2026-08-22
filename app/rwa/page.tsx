import type { Metadata } from "next";
import Link from "next/link";
import { preconnect } from "react-dom";
import { AssetExplorer } from "@/features/rwas/components/asset-explorer";
import { MarketHighlights } from "@/features/rwas/components/market-highlights";
import { ClockHands } from "./clock-hands";
import { RwaWalletBalance } from "./rwa-wallet-balance";
import styles from "./rwa-nav.module.css";

export const metadata: Metadata = {
  title: "Real Assets | Ark",
  description:
    "Discover tokenized equities, treasuries, credit, and commodities across onchain markets.",
};

export default function RwaPage() {
  preconnect("https://xstocks-metadata.backed.fi", { crossOrigin: "anonymous" });

  return (
    <>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.inner}>
            <Link href="/rwa" className={styles.logo} aria-label="Ark Real Assets home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ark-logo.svg" alt="Ark" />
            </Link>

            <nav className={styles.navigation} aria-label="Real Assets navigation">
              <Link href="/rwa" aria-current="page">
                Explore
              </Link>
              <Link href="/dashboard#portfolio">Portfolio</Link>

              <details className={styles.menu}>
                <summary>Tools</summary>
                <div className={styles.popover}>
                  <a href="#markets">
                    <span className={styles.menuIcon} aria-hidden="true">
                      <SwapIcon />
                    </span>
                    <span>
                      <strong>Markets</strong>
                      <small>Trade tokenized real-world assets</small>
                    </span>
                  </a>
                  <Link href="/dashboard#portfolio">
                    <span className={styles.menuIcon} aria-hidden="true">
                      <PortfolioIcon />
                    </span>
                    <span>
                      <strong>Portfolio</strong>
                      <small>Track your tokenized holdings</small>
                    </span>
                  </Link>
                </div>
              </details>

              <details className={styles.menu}>
                <summary>Resources</summary>
                <div className={styles.popover}>
                  <Link href="/rwa">
                    <span className={styles.menuIcon} aria-hidden="true">
                      <BookIcon />
                    </span>
                    <span>
                      <strong>Asset guide</strong>
                      <small>Understand tokenized markets</small>
                    </span>
                  </Link>
                  <Link href="/dashboard">
                    <span className={styles.menuIcon} aria-hidden="true">
                      <ArkIcon />
                    </span>
                    <span>
                      <strong>Ark dashboard</strong>
                      <small>Return to the full Ark experience</small>
                    </span>
                  </Link>
                </div>
              </details>
            </nav>

            <label className={styles.search}>
              <SearchIcon />
              <span className="sr-only">Search assets and markets</span>
              <input type="search" placeholder="Search assets and markets" />
              <kbd>/</kbd>
            </label>

            <div className={styles.actions}>
              <RwaWalletBalance />
              <button type="button" className={styles.iconButton} aria-label="Select language">
                <GlobeIcon />
                <span>EN</span>
              </button>
              <button type="button" className={styles.mobileMenu} aria-label="Open navigation">
                <span />
                <span />
              </button>
            </div>
          </div>
        </header>

        <section className={styles.bannerShell} aria-labelledby="always-open-title">
          <div className={styles.banner}>
            <div className={styles.bannerCopy}>
              <div>
                <span className={styles.bannerEyebrow}>Global onchain markets</span>
                <h1 id="always-open-title">Trade Tokenized Stocks Onchain</h1>
                <p>Access xStocks through live secondary-market liquidity across supported chains.</p>
              </div>
              <Link href="/rwa?sort=most-popular&availability=24-7" className={styles.bannerAction}>
                Trade Now
                <ArrowIcon />
              </Link>
            </div>

            <div className={styles.bannerVisual} aria-hidden="true">
              <MarketClock />
            </div>
          </div>
        </section>

        <MarketHighlights />
        <AssetExplorer />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>Ark © {new Date().getFullYear()}</span>
          <span>Onchain access to global real-world assets.</span>
        </div>
        <div className={styles.footerDisclosure}>
          <p>
            ¹ Prices are illustrative market data and may differ from executable buy or sell prices.
            Tokenized assets involve market, issuer, liquidity, and smart-contract risk.
          </p>
        </div>
      </footer>
    </>
  );
}

function MarketClock() {
  return (
    <svg className={styles.marketClock} viewBox="0 0 430 430" fill="none">
      <defs>
        <linearGradient id="rwa-metal" x1="62" y1="50" x2="346" y2="373">
          <stop stopColor="#F1F1F3" />
          <stop offset="0.22" stopColor="#77777E" />
          <stop offset="0.48" stopColor="#D8D8DC" />
          <stop offset="0.72" stopColor="#525258" />
          <stop offset="1" stopColor="#A9A9AF" />
        </linearGradient>
        <linearGradient id="rwa-metal-dark" x1="94" y1="82" x2="331" y2="346">
          <stop stopColor="#5D5D64" />
          <stop offset="0.48" stopColor="#18181B" />
          <stop offset="1" stopColor="#77777D" />
        </linearGradient>
        <radialGradient
          id="rwa-face"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(181 143) rotate(51) scale(225)"
        >
          <stop stopColor="#353539" />
          <stop offset="0.55" stopColor="#111113" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
        <filter id="rwa-shadow" x="15" y="15" width="400" height="400">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#000" floodOpacity="0.42" />
        </filter>
      </defs>

      <g className={styles.clockOrbit}>
        <circle
          cx="215"
          cy="215"
          r="185"
          stroke="url(#rwa-metal)"
          strokeWidth="1.2"
          strokeDasharray="2 9"
        />
        <circle cx="215" cy="215" r="157" stroke="#D0D0D5" strokeOpacity="0.24" />
      </g>

      <g filter="url(#rwa-shadow)">
        <circle cx="215" cy="215" r="132" fill="url(#rwa-metal)" />
        <circle cx="215" cy="215" r="124" fill="url(#rwa-metal-dark)" />
        <circle
          cx="215"
          cy="215"
          r="112"
          fill="url(#rwa-face)"
          stroke="#ECECEF"
          strokeOpacity="0.26"
        />
      </g>

      <g stroke="#D8D8DD" strokeLinecap="round">
        <path d="M215 116v11" />
        <path d="M215 303v11" />
        <path d="M116 215h11" />
        <path d="M303 215h11" />
        <path d="m145 145 8 8" strokeOpacity="0.5" />
        <path d="m277 277 8 8" strokeOpacity="0.5" />
        <path d="m285 145-8 8" strokeOpacity="0.5" />
        <path d="m153 277-8 8" strokeOpacity="0.5" />
      </g>

      <ClockHands />
      <circle
        cx="215"
        cy="215"
        r="10"
        fill="url(#rwa-metal)"
        stroke="#FAFAFA"
        strokeOpacity="0.65"
      />

      <g className={styles.clockBadge}>
        <rect
          x="147"
          y="241"
          width="136"
          height="48"
          rx="24"
          fill="#0B0B0C"
          stroke="#CFCFD4"
          strokeOpacity="0.34"
        />
        <text
          x="215"
          y="272"
          textAnchor="middle"
          fill="#F3F3F4"
          fontSize="22"
          fontWeight="650"
          letterSpacing="3"
        >
          24 / 7
        </text>
      </g>

      <circle cx="347" cy="105" r="6" fill="#EEEEF0" />
      <circle cx="347" cy="105" r="13" stroke="#EEEEF0" strokeOpacity="0.2" />
      <text
        x="322"
        y="333"
        fill="#D2D2D6"
        fillOpacity="0.58"
        fontSize="9"
        fontWeight="600"
        letterSpacing="2"
      >
        ALWAYS OPEN
      </text>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.75" />
      <path d="m15.5 15.5 4.5 4.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.7 12h16.6M12 3.5c2.1 2.3 3.1 5.1 3.1 8.5s-1 6.2-3.1 8.5C9.9 18.2 8.9 15.4 8.9 12s1-6.2 3.1-8.5Z" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8h12M14 5l3 3-3 3M19 16H7M10 13l-3 3 3 3" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="13" rx="2" />
      <path d="M8 6V4.5h8V6M4 11h16" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12H7.5A2.5 2.5 0 0 1 5 16.5v-12Z" />
      <path d="M5 16.5A2.5 2.5 0 0 1 7.5 14H18" />
    </svg>
  );
}

function ArkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 18 8-12 8 12h-4l-4-6-4 6H4Z" />
    </svg>
  );
}
