"use client";

import { startTransition, useId, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";

import { fetchMarketAssets, type MarketAssetSort } from "@/features/rwas/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { MarketAssetSummary } from "@/lib/api/schemas/rwas";

import styles from "./asset-explorer.module.css";

type AssetView = "grid" | "table";

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 180;
const MAX_SUGGESTIONS = 6;

const CATEGORIES = [
  { label: "All assets", value: "" },
  { label: "24/7 Available", value: "24-7-available" },
  { label: "Stocks", value: "stock" },
  { label: "ETF", value: "etf" },
  { label: "Equities", value: "equity" },
  { label: "Commodities", value: "commodity" },
  { label: "xStocks", value: "xstocks" },
] as const;

const SORT_OPTIONS: readonly { label: string; value: MarketAssetSort }[] = [
  { label: "Most Popular", value: "most-popular" },
  { label: "Least Popular", value: "least-popular" },
  { label: "Top Gainer", value: "top-gainer" },
  { label: "Top Loser", value: "top-loser" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Price: High to Low", value: "token-price-high-low" },
  { label: "Price: Low to High", value: "token-price-low-high" },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const wholeUsdFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function AssetExplorer() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<MarketAssetSort>("most-popular");
  const [view, setView] = useState<AssetView>("grid");
  const [page, setPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchListId = useId();
  const normalizedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(normalizedSearch, SEARCH_DEBOUNCE_MS);

  const query = useQuery({
    queryKey: ["rwas-market-assets", debouncedSearch, category, sort, page, PAGE_SIZE],
    queryFn: ({ signal }) =>
      fetchMarketAssets(
        {
          search: debouncedSearch,
          tagFilters: category ? [category] : [],
          sort,
          page,
          pageSize: PAGE_SIZE,
        },
        { signal }
      ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const updateCategory = (value: string) => {
    startTransition(() => {
      setCategory(value);
      setPage(1);
    });
  };

  const updateSort = (value: MarketAssetSort) => {
    startTransition(() => {
      setSort(value);
      setPage(1);
    });
  };

  const updateSearch = (value: string) => {
    setSearch(value);
    setActiveSuggestion(-1);
    setPage(1);
  };

  const responseAssets = query.data?.items ?? [];
  const assets = normalizedSearch
    ? responseAssets.filter((asset) => assetMatchesSearch(asset, normalizedSearch))
    : responseAssets;
  const suggestions = normalizedSearch ? assets.slice(0, MAX_SUGGESTIONS) : [];
  const showSuggestions = searchOpen && normalizedSearch.length > 0;
  const searchIsSettling =
    normalizedSearch.length > 0 &&
    (normalizedSearch !== debouncedSearch || query.isPlaceholderData || query.isFetching);

  const selectSuggestion = (asset: MarketAssetSummary) => {
    updateSearch(asset.symbol);
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && activeSuggestion >= 0 && suggestions[activeSuggestion]) {
      event.preventDefault();
      document.getElementById(`${searchListId}-${activeSuggestion}`)?.click();
      return;
    }
    if (event.key === "Escape") {
      setSearchOpen(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="explore-assets-heading">
      <div className={styles.headingRow}>
        <h2 id="explore-assets-heading">
          Explore Assets
          <sup>*, 1</sup>
        </h2>
        <RegistryStatus fetching={query.isFetching} total={query.data?.total} />
      </div>

      <div className={styles.toolbar}>
        <div
          className={styles.searchShell}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
          }}
        >
          <label className={styles.searchBox}>
            <SearchIcon />
            <span className="sr-only">Search asset name or ticker</span>
            <input
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls={showSuggestions ? searchListId : undefined}
              aria-activedescendant={
                activeSuggestion >= 0 && suggestions[activeSuggestion]
                  ? `${searchListId}-${activeSuggestion}`
                  : undefined
              }
              value={search}
              placeholder="Search asset name or ticker"
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              onChange={(event) => {
                updateSearch(event.target.value);
                setSearchOpen(true);
              }}
            />
          </label>
          {showSuggestions ? (
            <div id={searchListId} className={styles.searchSuggestions} role="listbox">
              {suggestions.map((asset, index) => (
                <Link
                  key={asset.symbol}
                  id={`${searchListId}-${index}`}
                  href={`/rwa/assets/${encodeURIComponent(asset.symbol)}`}
                  role="option"
                  aria-selected={activeSuggestion === index}
                  className={activeSuggestion === index ? styles.suggestionActive : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveSuggestion(index)}
                  onClick={() => selectSuggestion(asset)}
                >
                  <SuggestionIdentity asset={asset} />
                  <span className={styles.suggestionPrice}>
                    {formatPrice(asset.primaryMarket.priceUsd)}
                  </span>
                </Link>
              ))}
              {suggestions.length === 0 ? (
                <div className={styles.suggestionMessage} role="status">
                  {searchIsSettling ? "Searching assets…" : "No matching assets"}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={styles.categoryScroller} aria-label="Filter assets by category">
          {CATEGORIES.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              className={category === option.value ? styles.categorySelected : undefined}
              aria-pressed={category === option.value}
              onClick={() => updateCategory(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={styles.displayControls}>
          <div className={styles.viewToggle} aria-label="Asset view">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <GridIcon />
            </button>
            <button
              type="button"
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <ListIcon />
            </button>
          </div>

          <label className={styles.sortControl}>
            <span className="sr-only">Sort assets</span>
            <select
              value={sort}
              onChange={(event) => updateSort(event.target.value as MarketAssetSort)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </label>
        </div>
      </div>

      <div className={styles.results} aria-live="polite" aria-busy={query.isPending}>
        {query.isPending ? <AssetGridSkeleton /> : null}
        {!query.isPending && query.isError ? (
          <div className={styles.messageState}>
            <p>Assets are temporarily unavailable.</p>
            <button type="button" onClick={() => void query.refetch()}>
              Retry
            </button>
          </div>
        ) : null}
        {!query.isPending && !query.isError && assets.length === 0 && searchIsSettling ? (
          <div className={styles.messageState}>
            <p>Searching assets…</p>
          </div>
        ) : null}
        {!query.isPending && !query.isError && assets.length === 0 && !searchIsSettling ? (
          <div className={styles.messageState}>
            <p>No assets match those filters.</p>
          </div>
        ) : null}
        {!query.isPending && !query.isError && assets.length > 0 ? (
          view === "grid" ? (
            <AssetGrid assets={assets} />
          ) : (
            <AssetTable assets={assets} startIndex={(page - 1) * PAGE_SIZE} />
          )
        ) : null}
      </div>

      {query.data && query.data.totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Asset pages">
          <span className={styles.itemRange}>
            {Math.min((page - 1) * PAGE_SIZE + 1, query.data.total)}–
            {Math.min(page * PAGE_SIZE, query.data.total)} of {query.data.total}
          </span>
          <div className={styles.pageButtons}>
            <button
              type="button"
              className={styles.paginationArrow}
              aria-label="Previous page"
              disabled={!query.data.hasPreviousPage || query.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <PaginationChevron />
            </button>
            {paginationItems(page, query.data.totalPages).map((item) =>
              typeof item === "number" ? (
                <button
                  key={item}
                  type="button"
                  className={item === page ? styles.currentPage : undefined}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  disabled={query.isFetching}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className={styles.ellipsis} aria-hidden="true">
                  …
                </span>
              )
            )}
            <button
              type="button"
              className={`${styles.paginationArrow} ${styles.paginationArrowNext}`}
              aria-label="Next page"
              disabled={!query.data.hasNextPage || query.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              <PaginationChevron />
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}

function RegistryStatus({ fetching, total }: { fetching: boolean; total?: number }) {
  return (
    <div className={styles.registryStatus} role="status">
      <MarketOpenIcon />
      <span>{fetching ? "Refreshing registry" : "Registry live"}</span>
      <small>{fetching ? "(Syncing)" : `(${total ? `${total} assets · ` : ""}60s refresh)`}</small>
    </div>
  );
}

function AssetGrid({ assets }: { assets: MarketAssetSummary[] }) {
  return (
    <div className={styles.assetGrid}>
      {assets.map((asset, index) => (
        <AssetCard key={asset.symbol} asset={asset} priority={index < 6} />
      ))}
    </div>
  );
}

function AssetCard({ asset, priority }: { asset: MarketAssetSummary; priority: boolean }) {
  const change = asset.primaryMarket.change24hAvailable
    ? numberValue(asset.primaryMarket.priceChange24hPercent)
    : Number.NaN;
  const trend = asset.tradingPaused || !Number.isFinite(change) ? "neutral" : trendFor(change);

  return (
    <Link
      href={`/rwa/assets/${encodeURIComponent(asset.symbol)}`}
      className={styles.assetCard}
      data-symbol={asset.symbol}
      aria-label={`View ${asset.name}`}
    >
      <AssetIdentity asset={asset} priority={priority} />
      <div className={`${styles.pricePanel} ${styles[trend]}`} data-trend={trend}>
        <div className={styles.cardPriceCopy}>
          <strong>{formatPrice(asset.primaryMarket.priceUsd)}</strong>
          <ChangeMetric value={change} suffix=" 24H" trendOverride={trend} />
        </div>
        <Sparkline asset={asset} trend={trend} />
      </div>
    </Link>
  );
}

function AssetTable({ assets, startIndex }: { assets: MarketAssetSummary[]; startIndex: number }) {
  return (
    <div className={styles.tableScroll}>
      <div className={styles.assetTable} role="table" aria-label="Assets">
        <div className={styles.tableHeader} role="row">
          <span>#</span>
          <span>Asset Name</span>
          <span>Token Price</span>
          <span>24h ($)</span>
          <span>24h (%)</span>
          <span>24h Volume</span>
        </div>
        {assets.map((asset, index) => {
          const changeUsd = asset.primaryMarket.change24hAvailable
            ? numberValue(asset.primaryMarket.priceChange24hUsd)
            : Number.NaN;
          const changePercent = asset.primaryMarket.change24hAvailable
            ? numberValue(asset.primaryMarket.priceChange24hPercent)
            : Number.NaN;
          const volume = numberValue(asset.underlyingMarket?.volume24hUsd);
          const trendOverride = asset.tradingPaused ? "neutral" : undefined;
          return (
            <Link
              key={asset.symbol}
              href={`/rwa/assets/${encodeURIComponent(asset.symbol)}`}
              className={styles.tableRow}
              role="row"
              aria-label={`View ${asset.name}`}
            >
              <span className={styles.rowNumber}>{startIndex + index + 1}</span>
              <AssetIdentity asset={asset} compact />
              <span>{formatPrice(asset.primaryMarket.priceUsd)}</span>
              <ChangeMetric value={changeUsd} currency trendOverride={trendOverride} />
              <ChangeMetric value={changePercent} trendOverride={trendOverride} />
              <span>
                {asset.primaryMarket.change24hAvailable && Number.isFinite(volume)
                  ? `$${wholeUsdFormatter.format(volume)}`
                  : "—"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AssetIdentity({
  asset,
  compact = false,
  priority = false,
}: {
  asset: MarketAssetSummary;
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    <div className={`${styles.assetIdentity} ${compact ? styles.compactIdentity : ""}`}>
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
        <span>{asset.symbol}</span>
        <small>{asset.name}</small>
      </h3>
    </div>
  );
}

function SuggestionIdentity({ asset }: { asset: MarketAssetSummary }) {
  return (
    <span className={styles.suggestionIdentity}>
      <span className={styles.suggestionAvatar}>
        <span aria-hidden="true">{asset.symbol.slice(0, 2)}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.iconUrl}
          alt=""
          width={32}
          height={32}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      </span>
      <span className={styles.suggestionCopy}>
        <strong>{asset.symbol}</strong>
        <small>{asset.name}</small>
      </span>
    </span>
  );
}

function ChangeMetric({
  value,
  currency = false,
  suffix = "",
  trendOverride,
}: {
  value: number;
  currency?: boolean;
  suffix?: string;
  trendOverride?: Trend;
}) {
  if (!Number.isFinite(value)) return <span className={styles.mutedMetric}>—</span>;
  const trend = trendOverride ?? trendFor(value);
  const formatted = currency
    ? `$${priceFormatter.format(Math.abs(value))}`
    : `${Math.abs(value).toFixed(2)}%`;
  return (
    <span className={`${styles.changeMetric} ${styles[trend]}`} data-trend={trend}>
      {value !== 0 && trend !== "neutral" ? <TrendIcon direction={trend} /> : null}
      {formatted}
      {suffix}
    </span>
  );
}

function Sparkline({ asset, trend }: { asset: MarketAssetSummary; trend: Trend }) {
  const points = sparklinePoints(asset);
  const reduceMotion = useReducedMotion();
  const gradientId = `sparkline-${useId().replaceAll(":", "")}`;
  if (!points) {
    return (
      <div className={styles.sparklineUnavailable} aria-label="Market chart unavailable">
        <span>Market chart unavailable</span>
      </div>
    );
  }
  return (
    <motion.div
      className={styles.sparklineReveal}
      initial={reduceMotion ? false : { clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: reduceMotion ? 0 : 1.5, ease: [0.645, 0.045, 0.355, 1] }}
    >
      <svg
        className={styles.sparkline}
        viewBox="0 0 320 110"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className={styles.sparklineArea}
          d={`${points.path} L320 110 L0 110 Z`}
          fill={`url(#${gradientId})`}
        />
        <path
          data-testid="asset-sparkline-line"
          className={`${styles.sparklineLine} ${styles[trend]}`}
          d={points.path}
        />
      </svg>
    </motion.div>
  );
}

function AssetGridSkeleton() {
  return (
    <div className={styles.assetGrid} aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className={`${styles.assetCard} ${styles.skeletonCard}`}>
          <span className={styles.skeletonHeader} />
          <span className={styles.skeletonPanel} />
        </div>
      ))}
    </div>
  );
}

type Trend = "positive" | "negative" | "neutral";

function trendFor(value: number): Trend {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function numberValue(value: string | null | undefined): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function formatPrice(value: string): string {
  const price = numberValue(value);
  return Number.isFinite(price) && price > 0 ? `$${priceFormatter.format(price)}` : "—";
}

function sparklinePoints(asset: MarketAssetSummary): { path: string } | null {
  if (!asset.primaryMarket.chartAvailable) return null;
  const values = asset.primaryMarket.priceHistory24h
    .map((point) => numberValue(point.priceUsd))
    .filter(Number.isFinite);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, Number.EPSILON);
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 320;
      const y = 96 - ((value - min) / range) * 78;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return { path };
}

function assetMatchesSearch(asset: MarketAssetSummary, search: string): boolean {
  const term = search.toLocaleLowerCase();
  return [asset.symbol, asset.ticker, asset.name, asset.underlyingMarket?.name]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(term));
}

function paginationItems(page: number, totalPages: number): Array<number | string> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  if (page >= totalPages - 3) {
    return [1, "ellipsis-left", ...Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)];
  }
  return [1, "ellipsis-left", page - 1, page, page + 1, "ellipsis-right", totalPages];
}

function TrendIcon({ direction }: { direction: Trend }) {
  if (direction === "neutral") return null;
  return (
    <svg
      className={direction === "negative" ? styles.trendDown : undefined}
      viewBox="0 0 9 8"
      aria-hidden="true"
    >
      <path d="M3.55664 1.03405C3.96466.455283 4.83534.455284 5.24337 1.03405L8.61559 5.81746C9.08702 6.48617 8.60003 7.39998 7.77223 7.39998H1.02777C.199975 7.39998-.287019 6.48617.184406 5.81746L3.55664 1.03405Z" />
    </svg>
  );
}

function MarketOpenIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M14 12.307v1H2v-1h12ZM4.25 9.958v1H2v-1h2.25Zm9.75 0v1h-2.25v-1H14ZM8 8.083a2.75 2.75 0 0 1 2.75 2.75h-1a1.75 1.75 0 0 0-3.5 0h-1A2.75 2.75 0 0 1 8 8.083ZM5.445 7.571l-.707.707-1.592-1.591.708-.707 1.59 1.591Zm7.5-.884-1.592 1.591-.707-.707 1.592-1.591.707.707Z" />
      <path
        className={styles.risingArrow}
        d="m10.188 4.443-.625.781L8.5 4.374v2.71h-1v-2.71l-1.063.85-.625-.781L8 2.693l2.188 1.75Z"
      />
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

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 3.75h6v7.5H4v-7.5Zm0 11h6v5.5H4v-5.5Zm10-11h6v5.5h-6v-5.5Zm0 9h6v7.5h-6v-7.5Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v4H4V4Zm0 6h16v4H4v-4Zm0 6h16v4H4v-4Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}

function PaginationChevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}
