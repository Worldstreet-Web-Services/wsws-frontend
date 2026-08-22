"use client";

import { useId, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import Link from "next/link";

import { fetchMarketAssets, type MarketAssetSort } from "@/features/rwas/lib/api";
import type { MarketAssetSummary } from "@/lib/api/schemas/rwas";

import styles from "./market-highlights.module.css";

interface HighlightList {
  title: string;
  sort: MarketAssetSort;
  showPeriod: boolean;
}

const HIGHLIGHT_LISTS: readonly HighlightList[] = [
  { title: "Top Gainers", sort: "top-gainer", showPeriod: true },
  { title: "Trending", sort: "most-popular", showPeriod: true },
  { title: "Newly Added", sort: "newest", showPeriod: false },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const volumeFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function MarketHighlights() {
  const queries = useQueries({
    queries: HIGHLIGHT_LISTS.map((list) => ({
      queryKey: ["rwas-market-assets", list.sort, 3],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchMarketAssets({ sort: list.sort, pageSize: 3, pricedOnly: true }, { signal }),
      select: (data: Awaited<ReturnType<typeof fetchMarketAssets>>) => data.items.slice(0, 3),
      staleTime: 30_000,
      refetchInterval: 60_000,
    })),
  });

  return (
    <section id="markets" className={styles.section} aria-label="Market highlights">
      <div className={styles.grid}>
        {HIGHLIGHT_LISTS.map((list, index) => {
          const query = queries[index];
          return (
            <HighlightPanel
              key={list.sort}
              list={list}
              assets={query.data ?? []}
              loading={query.isPending}
              error={query.isError}
              retry={() => void query.refetch()}
              defaultExpanded={index === 0}
            />
          );
        })}
      </div>
    </section>
  );
}

function HighlightPanel({
  list,
  assets,
  loading,
  error,
  retry,
  defaultExpanded,
}: {
  list: HighlightList;
  assets: MarketAssetSummary[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentId = useId();
  const hasFullDayChange = list.sort !== "top-gainer" || assets.some(has24HourChange);
  const title = hasFullDayChange ? list.title : "Live Markets";
  const showPeriod = list.showPeriod && hasFullDayChange;
  const heading = (
    <span className={styles.headingCopy}>
      <span>{title}</span>
      {showPeriod ? <span className={styles.period}>24H</span> : null}
    </span>
  );

  return (
    <article className={styles.panel}>
      <h2 className={styles.desktopHeading}>{heading}</h2>
      <button
        type="button"
        className={styles.mobileHeading}
        aria-label={`Toggle ${title} list`}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
      >
        {heading}
        <ChevronIcon expanded={expanded} />
      </button>

      <div
        id={contentId}
        className={`${styles.rowsViewport} ${expanded ? "" : styles.rowsCollapsed}`}
      >
        <div className={styles.rows} aria-busy={loading}>
          {loading ? <LoadingRows /> : null}
          {!loading && error ? <ErrorRow retry={retry} /> : null}
          {!loading && !error && assets.length === 0 ? (
            <div className={styles.emptyRow}>No assets available.</div>
          ) : null}
          {!loading && !error
            ? assets.map((asset, index) => (
                <AssetRow
                  key={asset.symbol}
                  asset={asset}
                  type={list.sort}
                  priority={index === 0}
                />
              ))
            : null}
        </div>
      </div>
    </article>
  );
}

function AssetRow({
  asset,
  type,
  priority,
}: {
  asset: MarketAssetSummary;
  type: MarketAssetSort;
  priority: boolean;
}) {
  return (
    <Link
      href={`/rwa/assets/${encodeURIComponent(asset.symbol)}`}
      className={styles.assetRow}
      data-symbol={asset.symbol}
      aria-label={`View ${asset.name}`}
    >
      <div className={styles.assetIdentity}>
        <div className={styles.avatar}>
          <span aria-hidden="true">{asset.symbol.slice(0, 2)}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.iconUrl}
            alt={`${asset.name} logo`}
            width={40}
            height={40}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        </div>
        <h3>
          <span className={styles.symbol}>{asset.symbol}</span>
          <span className={styles.assetName}>{asset.name}</span>
        </h3>
      </div>

      <div className={styles.marketValue}>
        <span className={styles.price}>{formatPrice(asset.primaryMarket.priceUsd)}</span>
        <SecondaryMetric asset={asset} type={type} />
      </div>
    </Link>
  );
}

function SecondaryMetric({ asset, type }: { asset: MarketAssetSummary; type: MarketAssetSort }) {
  if (type === "top-gainer") {
    if (!has24HourChange(asset)) {
      return <span className={styles.secondary}>Live price</span>;
    }
    const change = Number(asset.primaryMarket.priceChange24hPercent);
    const trend = change < 0 ? "loss" : "gain";
    return Number.isFinite(change) ? (
      <span className={styles[trend]}>
        <svg
          className={`${styles.gainArrow} ${change < 0 ? styles.lossArrow : ""}`}
          viewBox="0 0 9 8"
          aria-hidden="true"
        >
          <path d="M3.55664 1.03405C3.96466.455283 4.83534.455284 5.24337 1.03405L8.61559 5.81746C9.08702 6.48617 8.60003 7.39998 7.77223 7.39998H1.02777C.199975 7.39998-.287019 6.48617.184406 5.81746L3.55664 1.03405Z" />
        </svg>
        {Math.abs(change).toFixed(2)}%
      </span>
    ) : null;
  }

  if (type === "most-popular") {
    const volume = Number(asset.underlyingMarket?.volume24hUsd);
    return Number.isFinite(volume) && volume > 0 ? (
      <span className={styles.secondary}>${volumeFormatter.format(volume)}</span>
    ) : (
      <span className={styles.secondary}>xStocks market</span>
    );
  }

  if (type === "newest") {
    const assetClass = asset.tags.find((tag) => tag.categoryLayer === "1")?.tagLabel;
    const instrument = asset.tags.find((tag) => tag.categoryLayer === "2")?.tagLabel;
    const label = [assetClass, instrument].filter(Boolean).join(" ");
    return label ? <span className={styles.secondary}>{label}</span> : null;
  }

  return null;
}

function has24HourChange(asset: MarketAssetSummary): boolean {
  if (asset.primaryMarket.change24hAvailable) return true;
  const history = asset.primaryMarket.priceHistory24h;
  const firstPoint = history[0];
  const lastPoint = history.at(-1);
  const firstTimestamp = firstPoint ? Date.parse(firstPoint.timestamp) : Number.NaN;
  const lastTimestamp = lastPoint ? Date.parse(lastPoint.timestamp) : Number.NaN;
  return (
    history.length >= 2 &&
    Number.isFinite(firstTimestamp) &&
    Number.isFinite(lastTimestamp) &&
    lastTimestamp - firstTimestamp >= 23 * 60 * 60 * 1_000
  );
}

function formatPrice(value: string): string {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? `$${priceFormatter.format(price)}` : "—";
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <div key={row} className={styles.assetRow} aria-hidden="true">
          <div className={styles.assetIdentity}>
            <span className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
            <span className={styles.skeletonCopy}>
              <span className={`${styles.skeleton} ${styles.skeletonPrimary}`} />
              <span className={`${styles.skeleton} ${styles.skeletonSecondary}`} />
            </span>
          </div>
          <span className={styles.skeletonCopy}>
            <span className={`${styles.skeleton} ${styles.skeletonValue}`} />
            <span className={`${styles.skeleton} ${styles.skeletonMetric}`} />
          </span>
        </div>
      ))}
    </>
  );
}

function ErrorRow({ retry }: { retry: () => void }) {
  return (
    <div className={styles.errorRow}>
      <span>Market data is temporarily unavailable.</span>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}
