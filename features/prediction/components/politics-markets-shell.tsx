"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { MarketLogo } from "@/components/ui/market-logo";
import { PredictionCategoryDrawer } from "@/features/prediction/components/prediction-category-drawer";
import { usePolymarketAccess } from "@/features/prediction/hooks/use-polymarket-access";
import type { PredictionMarketCategory } from "@/features/prediction/categories";
import { useDiscoveryEvents } from "@/features/prediction/markets/hooks/use-discovery-markets";
import type { Prediction } from "@/lib/types";
import { useHouseSlip } from "../house-slip-store";
import { marketPrediction, type CategoryPrediction } from "../category-market-presenter";
import { CategoryEventRow } from "./category-event-row";
import { HorizontalNavRail } from "./horizontal-nav-rail";
import {
  CategoryBetSidebar,
  CategorySearchIcon as SearchIcon,
  CategoryTopNav,
} from "./category-market-shared";

interface MarketTopic {
  key: string;
  label: string;
  keywords: string[];
}

const CATEGORY_TOPICS: Record<PredictionMarketCategory, MarketTopic[]> = {
  politics: [
    { key: "all", label: "All Politics", keywords: [] },
    {
      key: "elections",
      label: "Elections",
      keywords: ["election", "vote", "primary", "nominee", "senate", "congress"],
    },
    {
      key: "united-states",
      label: "United States",
      keywords: ["united states", "u.s.", "trump", "biden", "congress", "white house"],
    },
    {
      key: "geopolitics",
      label: "Geopolitics",
      keywords: ["war", "nato", "russia", "ukraine", "israel", "iran", "china", "taiwan", "gaza"],
    },
    {
      key: "policy",
      label: "Policy",
      keywords: ["policy", "law", "bill", "court", "tariff", "immigration", "regulation", "tax"],
    },
    {
      key: "leaders",
      label: "Leaders",
      keywords: ["president", "prime minister", "leader", "chancellor", "governor", "mayor"],
    },
  ],
  crypto: [
    { key: "all", label: "All Crypto", keywords: [] },
    { key: "bitcoin", label: "Bitcoin", keywords: ["bitcoin", "btc"] },
    { key: "ethereum", label: "Ethereum", keywords: ["ethereum", "ether", "eth"] },
    {
      key: "altcoins",
      label: "Altcoins",
      keywords: ["solana", "sol", "xrp", "doge", "cardano", "token"],
    },
    { key: "defi", label: "DeFi", keywords: ["defi", "uniswap", "aave", "stablecoin", "protocol"] },
    {
      key: "regulation",
      label: "Regulation",
      keywords: ["sec", "regulation", "etf", "reserve", "ban"],
    },
  ],
  finance: [
    { key: "all", label: "All Finance", keywords: [] },
    { key: "stocks", label: "Stocks", keywords: ["stock", "shares", "s&p", "nasdaq", "dow"] },
    {
      key: "companies",
      label: "Companies",
      keywords: ["company", "earnings", "revenue", "ceo", "ipo"],
    },
    { key: "rates", label: "Rates", keywords: ["rate", "fed", "yield", "interest"] },
    { key: "commodities", label: "Commodities", keywords: ["gold", "oil", "silver", "commodity"] },
    { key: "markets", label: "Markets", keywords: ["market", "index", "close", "trading"] },
  ],
  tech: [
    { key: "all", label: "All Tech", keywords: [] },
    { key: "ai", label: "AI", keywords: ["ai", "artificial intelligence", "openai", "model"] },
    { key: "products", label: "Products", keywords: ["launch", "release", "product", "device"] },
    {
      key: "big-tech",
      label: "Big Tech",
      keywords: ["apple", "google", "meta", "microsoft", "amazon"],
    },
    { key: "space", label: "Space", keywords: ["space", "spacex", "nasa", "rocket", "mars"] },
    {
      key: "internet",
      label: "Internet",
      keywords: ["internet", "social media", "app", "platform"],
    },
  ],
  culture: [
    { key: "all", label: "All Culture", keywords: [] },
    {
      key: "entertainment",
      label: "Entertainment",
      keywords: ["movie", "film", "television", "show", "actor"],
    },
    { key: "awards", label: "Awards", keywords: ["award", "oscar", "grammy", "emmy"] },
    { key: "music", label: "Music", keywords: ["music", "album", "song", "artist", "billboard"] },
    { key: "gaming", label: "Gaming", keywords: ["game", "gaming", "esports", "console"] },
    { key: "media", label: "Media", keywords: ["media", "streaming", "youtube", "netflix"] },
  ],
  economy: [
    { key: "all", label: "All Economy", keywords: [] },
    { key: "inflation", label: "Inflation", keywords: ["inflation", "cpi", "prices"] },
    { key: "growth", label: "Growth", keywords: ["gdp", "growth", "recession"] },
    { key: "jobs", label: "Jobs", keywords: ["jobs", "employment", "unemployment", "payroll"] },
    { key: "trade", label: "Trade", keywords: ["trade", "tariff", "import", "export"] },
    {
      key: "central-banks",
      label: "Central Banks",
      keywords: ["central bank", "federal reserve", "fed", "ecb", "rate"],
    },
  ],
};

function TopicIcon({ topic }: { topic: string }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (topic === "all") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-12 md:size-16" {...shared}>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <rect x="27" y="8" width="13" height="13" rx="2" />
        <rect x="8" y="27" width="13" height="13" rx="2" />
        <rect x="27" y="27" width="13" height="13" rx="2" />
      </svg>
    );
  }
  if (topic === "elections") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-12 md:size-16" {...shared}>
        <path d="M11 22h26l3 18H8l3-18ZM15 22l5-13h10l4 13M19 15l4 4 8-9" />
      </svg>
    );
  }
  if (topic === "united-states") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-12 md:size-16" {...shared}>
        <path d="M8 12h32v24H8zM8 18h32M8 24h32M8 30h32M8 12h15v13H8zM12 16h.1M18 16h.1M12 21h.1M18 21h.1" />
      </svg>
    );
  }
  if (topic === "geopolitics") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-12 md:size-16" {...shared}>
        <circle cx="24" cy="24" r="17" />
        <path d="M7 24h34M24 7c5 5 8 10.7 8 17s-3 12-8 17M24 7c-5 5-8 10.7-8 17s3 12 8 17" />
      </svg>
    );
  }
  if (topic === "policy") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-12 md:size-16" {...shared}>
        <path d="M13 8h17l6 6v26H13zM30 8v7h6M19 22h11M19 28h11M19 34h8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-12 md:size-16" {...shared}>
      <circle cx="24" cy="17" r="8" />
      <path d="M9 40c1.5-8 6.5-12 15-12s13.5 4 15 12" />
    </svg>
  );
}

function matchesTopic(prediction: Prediction, topic: string, topics: MarketTopic[]): boolean {
  if (topic === "all") return true;
  const text = `${prediction.q} ${prediction.tag}`.toLowerCase();
  return (
    topics.find(({ key }) => key === topic)?.keywords.some((keyword) => text.includes(keyword)) ??
    false
  );
}

function PoliticsTopicRail({
  predictions,
  topics,
  active,
  onChange,
}: {
  predictions: Prediction[];
  topics: MarketTopic[];
  active: string;
  onChange: (topic: string) => void;
}) {
  return (
    <HorizontalNavRail
      ariaLabel="Market topics"
      itemCount={topics.length}
      className="mx-auto max-w-[1440px] py-2"
      viewportClassName="px-2 md:px-0"
    >
      <div className="flex min-w-max items-center gap-1">
        {topics.map((topic) => {
          const selected = topic.key === active;
          const count = predictions.filter((prediction) =>
            matchesTopic(prediction, topic.key, topics)
          ).length;
          return (
            <button
              key={topic.key}
              type="button"
              onClick={() => onChange(topic.key)}
              className={`group relative flex h-[100px] min-w-[100px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-md px-2 transition-colors md:h-[140px] md:min-w-[125px] ${selected ? "bg-[#171717]" : "hover:bg-[#171717]"}`}
            >
              <span
                className={`absolute top-2 text-[10px] md:top-3 ${selected ? "text-white" : "text-[#999]"}`}
              >
                {count}
              </span>
              <span className={selected ? "text-[#b9fcff]" : "text-[#777] group-hover:text-[#bbb]"}>
                <TopicIcon topic={topic.key} />
              </span>
              <span
                className={`absolute bottom-2 text-[10px] whitespace-nowrap md:bottom-3.5 md:text-xs ${selected ? "text-white" : "text-[#999]"}`}
              >
                {topic.label}
              </span>
            </button>
          );
        })}
      </div>
    </HorizontalNavRail>
  );
}

function TopicFilterRail({
  tags,
  active,
  search,
  category,
  onTag,
  onSearch,
}: {
  tags: string[];
  active: string;
  search: string;
  category: PredictionMarketCategory;
  onTag: (tag: string) => void;
  onSearch: (search: string) => void;
}) {
  const itemClass =
    "h-10 shrink-0 cursor-pointer rounded-lg px-5 text-sm font-light whitespace-nowrap text-white transition-colors";
  return (
    <HorizontalNavRail
      ariaLabel="Market filters"
      itemCount={tags.length + 2}
      className="mx-auto mb-6 max-w-[1440px]"
      viewportClassName="flex items-center gap-2 px-2"
    >
      <button
        type="button"
        onClick={() => onTag("")}
        className={`${itemClass} ${active ? "bg-[#2d3748] hover:bg-[#3a4556]" : "bg-[#3182ce]"}`}
      >
        All
      </button>
      <label className="relative flex h-10 min-w-[210px] shrink-0 items-center rounded-lg border border-[#4a5568] bg-[#2d3748] px-3 text-[#718096] focus-within:border-[#3182ce]">
        <span className="sr-only">Filter {category} markets</span>
        <SearchIcon className="size-5 shrink-0" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Filter topics..."
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-[#718096]"
        />
      </label>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onTag(active === tag ? "" : tag)}
          className={`${itemClass} ${active === tag ? "bg-[#3182ce]" : "bg-[#2d3748] hover:bg-[#3a4556]"}`}
        >
          {tag}
        </button>
      ))}
    </HorizontalNavRail>
  );
}

export function CategoryMarketsShell({ category }: { category: PredictionMarketCategory }) {
  const catalog = useDiscoveryEvents(category, "volume_24h", { limit: 20, marketLimit: 2 });
  const access = usePolymarketAccess();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [desktopBetOpen, setDesktopBetOpen] = useState(false);
  const [mobileBetOpen, setMobileBetOpen] = useState(false);
  const [topic, setTopic] = useState("all");
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const slip = useHouseSlip();
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const topics = CATEGORY_TOPICS[category];
  const predictions = catalog.events.flatMap((event) =>
    event.markets.flatMap((market) => {
      const prediction = marketPrediction(event, market, category);
      return prediction ? [prediction] : [];
    })
  );
  const eventPredictions = catalog.events.flatMap((event) => {
    const market = event.markets[0];
    const prediction = market ? marketPrediction(event, market, category) : null;
    return prediction ? [{ ...prediction, q: `${event.title} ${prediction.q}` }] : [];
  });
  const tags = Array.from(new Set(predictions.map((prediction) => prediction.tag))).sort();
  const matches = (prediction: CategoryPrediction) =>
    matchesTopic(prediction, topic, topics) &&
    (!tag || prediction.tag === tag) &&
    (!deferredSearch || `${prediction.q} ${prediction.tag}`.toLowerCase().includes(deferredSearch));
  const visibleEvents = catalog.events.filter((event) => {
    const eventPredictions = event.markets.flatMap((market) => {
      const prediction = marketPrediction(event, market, category);
      return prediction ? [prediction] : [];
    });
    if (event.marketCount <= 1) return eventPredictions.some(matches);
    const preview = eventPredictions[0];
    return preview ? matches({ ...preview, q: `${event.title} ${preview.q}` }) : false;
  });
  const openBet = (prediction: CategoryPrediction, side: "yes" | "no") => {
    slip.toggle(prediction, side);
    if (window.matchMedia("(min-width: 1280px)").matches) setDesktopBetOpen(true);
    else setMobileBetOpen(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#222] text-[#ebebeb]">
      <div
        className={`relative transition-[padding] duration-300 ease-in-out ${desktopBetOpen ? "xl:pr-[326px]" : ""}`}
      >
        <CategoryTopNav
          categoriesOpen={categoriesOpen}
          onOpenCategories={() => setCategoriesOpen(true)}
          category={category}
        />
        <PoliticsTopicRail
          predictions={eventPredictions}
          topics={topics}
          active={topic}
          onChange={(nextTopic) => {
            setTopic(nextTopic);
            setTag("");
          }}
        />
        <TopicFilterRail
          tags={tags}
          active={tag}
          search={search}
          category={category}
          onTag={setTag}
          onSearch={setSearch}
        />

        <section className="mx-auto w-full max-w-[1440px] bg-[#171717] pb-16 font-[family-name:var(--font-sportsbook)]">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] px-2 py-2">
            <div className="flex h-8 items-center rounded-lg border border-[#2e2e2e] bg-[#242424] px-3 text-sm font-medium">
              Open
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 items-center rounded-lg border border-[#2e2e2e] bg-[#242424] px-3 text-xs text-[#bbb]">
                All
              </div>
              <div className="flex h-8 items-center gap-2 rounded-lg border border-[#2e2e2e] bg-[#242424] px-3 text-xs text-[#bbb]">
                <span className="grid grid-cols-3 items-end gap-0.5" aria-hidden="true">
                  <i className="h-2 w-0.5 bg-current" />
                  <i className="h-3 w-0.5 bg-current" />
                  <i className="h-4 w-0.5 bg-current" />
                </span>
                Volume
              </div>
            </div>
          </div>

          <div className="mb-1 hidden grid-cols-[1fr_28rem_1fr] items-center px-4 py-2 min-[1280px]:grid">
            <span />
            <span className="text-center text-xs font-semibold text-[#adadad]">Outcome</span>
            <span className="w-[6.5rem] justify-self-end text-center text-[13px] font-semibold text-[#adadad]">
              Volume
            </span>
          </div>

          {catalog.loading ? (
            <div className="flex flex-col gap-1 p-2">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-[94px] animate-pulse bg-[#242424]" />
              ))}
            </div>
          ) : catalog.error ? (
            <div className="px-5 py-20 text-center">
              <p className="text-sm font-medium text-[#999]">
                {category[0].toUpperCase() + category.slice(1)} markets could not load.
              </p>
              <button
                type="button"
                onClick={() => void catalog.refetch()}
                className="mt-4 cursor-pointer rounded-lg bg-[#b9fcff] px-5 py-2 text-xs font-semibold text-[#171717]"
              >
                Try again
              </button>
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="px-5 py-20 text-center text-sm text-[#7e7e7e]">
              No matching {category} markets in the loaded results.
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {visibleEvents.map((event) => (
                <CategoryEventRow
                  key={event.id}
                  event={event}
                  category={category}
                  matches={matches}
                  accessAllowed={access.allowed}
                  onBuy={openBet}
                  selectedSide={slip.selectedSide}
                />
              ))}
            </div>
          )}

          {!catalog.loading && !catalog.error ? (
            <footer className="flex items-center justify-between px-4 py-3 text-[10px] text-[#7e7e7e]">
              <span>{catalog.events.length} events loaded</span>
              {catalog.hasMore ? (
                <button
                  type="button"
                  onClick={() => void catalog.loadMore()}
                  disabled={catalog.loadingMore}
                  className="cursor-pointer rounded-lg border border-[#333] px-4 py-2 text-[#aaa] hover:border-[#555] hover:text-white disabled:cursor-wait disabled:opacity-50"
                >
                  {catalog.loadingMore ? "Loading markets..." : "Load more markets"}
                </button>
              ) : null}
            </footer>
          ) : null}
          {catalog.loadMoreError ? (
            <p role="alert" className="px-4 pb-4 text-xs text-[#ef9ca5]">
              More markets could not load. Please try again.
            </p>
          ) : null}
          {!access.allowed ? (
            <p className="px-4 pb-4 text-xs text-[#ef9ca5]">
              Trading is unavailable in your region. You can still browse open markets.
            </p>
          ) : null}
        </section>

        <footer className="mx-auto hidden max-w-[1440px] items-end justify-between px-5 py-8 text-[#7e7e7e] md:flex">
          <div>
            <MarketLogo className="h-6 w-auto opacity-90" />
            <p className="mt-5 text-[10px]">© 2026 Ark · Prediction markets.</p>
          </div>
          <div className="flex gap-4 text-[10px]">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
        </footer>
      </div>

      <CategoryBetSidebar
        selections={slip.selections}
        desktopOpen={desktopBetOpen}
        mobileOpen={mobileBetOpen}
        onDesktopOpenChange={setDesktopBetOpen}
        onMobileOpenChange={setMobileBetOpen}
        onRemove={slip.remove}
        onClear={slip.clear}
      />
      <PredictionCategoryDrawer
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        activeCategory={category}
      />
    </main>
  );
}
