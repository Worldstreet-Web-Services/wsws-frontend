import type { Metadata } from "next";
import Link from "next/link";

import detailStyles from "@/features/rwas/components/asset-detail.module.css";
import { RoutedAssetDetail } from "./routed-asset-detail";
import navStyles from "../../rwa-nav.module.css";

type PageProps = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol} Real Asset | Ark`,
    description: `Market data, trading status, networks, documents, and price history for ${symbol}.`,
  };
}

export default async function RwaAssetPage({ params }: PageProps) {
  const { symbol } = await params;

  return (
    <>
      <main className={`${navStyles.page} ${detailStyles.detailRoutePage}`}>
        <header className={navStyles.header}>
          <div className={navStyles.inner}>
            <Link href="/rwa" className={navStyles.logo} aria-label="Ark Real Assets home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ark-logo.svg" alt="Ark" />
            </Link>

            <nav className={navStyles.navigation} aria-label="Real Assets navigation">
              <Link href="/rwa" aria-current="page">
                Explore
              </Link>
              <Link href="/dashboard#portfolio">Portfolio</Link>
              <Link href="/rwa#markets">Tools</Link>
              <Link href="/rwa#explore-assets-heading">Resources</Link>
            </nav>

            <Link
              href="/rwa#explore-assets-heading"
              className={`${navStyles.search} ${detailStyles.headerSearchLink}`}
              aria-label="Search assets and markets"
            >
              <SearchIcon />
              <span>Search assets and markets</span>
              <kbd>/</kbd>
            </Link>

            <div className={navStyles.actions}>
              <Link href="/rwa" className={navStyles.iconButton} aria-label="Language: English">
                <GlobeIcon />
                <span>EN</span>
              </Link>
              <Link
                href="/rwa#explore-assets-heading"
                className={navStyles.mobileMenu}
                aria-label="Open asset explorer"
              >
                <span />
                <span />
              </Link>
            </div>
          </div>
        </header>

        <RoutedAssetDetail symbol={symbol} />
      </main>

      <footer className={navStyles.footer}>
        <div className={navStyles.footerInner}>
          <span>Ark © {new Date().getFullYear()}</span>
          <span>Onchain access to global real-world assets.</span>
        </div>
        <div className={navStyles.footerDisclosure}>
          <p>
            ¹ Prices are illustrative market data and may differ from executable buy or sell prices.
            Tokenized assets involve market, issuer, liquidity, and smart-contract risk.
          </p>
        </div>
      </footer>
    </>
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

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9S14.4 18.4 12 21c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3Z" />
    </svg>
  );
}
