"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { AssetIcon } from "@/components/ui/asset-icon";
import { SearchIcon } from "@/components/ui/icons";
import { ListPagination } from "@/components/ui/list-pagination";
import { useSpotMarkets, type SpotMarket } from "@/features/trade/hooks/use-spot-markets";
import { useHiddenTokens } from "@/features/trade/hooks/use-hidden-tokens";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";
import type { BuyPayload, DetailPayload } from "@/lib/modal-types";

interface SpotSimpleViewProps {
  onOpenDetail: (detail: DetailPayload) => void;
  onOpenBuy: (buy: BuyPayload) => void;
  // Drop tokens the user switched off in Manage Tokens. Only the dashboard's
  // Explore tokens card opts in; the Spot section still lists everything.
  hideDisabled?: boolean;
}

const PER_PAGE = 3;

function changeLabel(chg: number): string {
  const v = Number.isFinite(chg) ? chg : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function compactUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)}`;
}

const columnHelper = createColumnHelper<SpotMarket>();
const columns = [
  columnHelper.accessor((r) => `${r.symbol} ${r.name}`, { id: "asset", enableSorting: false }),
  columnHelper.accessor("priceUsd", { id: "price" }),
  columnHelper.accessor("change24h", { id: "change" }),
  columnHelper.accessor("marketCap", { id: "mcap" }),
];

export function SpotSimpleView({ onOpenDetail, onOpenBuy, hideDisabled }: SpotSimpleViewProps) {
  const t = useTranslations("markets");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "mcap", desc: true }]);
  const router = useRouter();
  const { markets, loading, error } = useSpotMarkets();
  const { hidden } = useHiddenTokens();

  // When opted in, drop the tokens switched off in Manage Tokens. The Manage
  // Tokens page still lists them, so the choice is reversible.
  const visibleMarkets = useMemo(
    () => (hideDisabled ? markets.filter((m) => !hidden.has(m.symbol)) : markets),
    [markets, hidden, hideDisabled]
  );

  const table = useReactTable({
    data: visibleMarkets,
    columns,
    state: { globalFilter: search, sorting },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PER_PAGE } },
  });

  const rows = table.getRowModel().rows;
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();

  const openToken = (token: SpotMarket) =>
    onOpenDetail({
      sym: token.symbol,
      name: token.name,
      sub: token.symbol,
      price: token.priceUsd > 0 ? formatUsd(token.priceUsd) : "—",
      chg: changeLabel(token.change24h),
      bg: tokenBg(token.symbol),
      coingeckoId: token.coingeckoId ?? undefined,
      up: token.change24h >= 0,
      logo: token.logo,
      candlesOnly: true,
      stats: [
        { k: t("price"), v: token.priceUsd > 0 ? formatUsd(token.priceUsd) : "—" },
        { k: t("change24hFull"), v: changeLabel(token.change24h) },
        { k: t("marketCap"), v: compactUsd(token.marketCap) },
      ],
      cta: t("buyToken", { name: token.name }),
      onCta: () =>
        onOpenBuy({
          symbol: token.symbol,
          name: token.name,
          priceUsd: token.priceUsd,
          logo: token.logo,
        }),
    });

  return (
    <div data-sensitive="position">
      {/* "Explore tokens ›" header — mobile only, desktop keeps the eyebrow. */}
      <a href="/explore-tokens" className="mb-2 flex cursor-pointer items-center gap-[7px] md:hidden">
        <span className="font-sans text-[20px] font-bold leading-8 tracking-[-0.24px] text-white">
          Explore tokens
        </span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden className="-rotate-90">
          <path d="M6 9l6 6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>

      {/* Search — hidden on mobile where the card header replaces it. */}
      <div className="hidden justify-start sm:flex">
        <div className="flex w-full max-w-[340px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-normal text-white outline-none"
          />
        </div>
      </div>

      {/* Token list card */}
      <div className="overflow-hidden rounded-[22px] border border-white/12 bg-white/5 sm:mt-4 sm:rounded-2xl">
        {/* Table header */}
        <div className="flex items-center border-b border-white/7 px-4 py-3.5 text-[11.5px] font-medium uppercase tracking-[0.46px] text-white/40">
          <span className="min-w-0 flex-1">{t("asset")}</span>
          <span className="w-[110px] text-right">{t("price")}</span>
          <span className="w-[75px] text-right">{t("change24h")}</span>
        </div>

        {loading ? (
          <div className="border-t border-white/7 px-6 py-10 text-center text-[13.5px] text-white/45">
            {t("loadingMarkets")}
          </div>
        ) : error ? (
          <div className="border-t border-white/7 px-6 py-10 text-center text-[13.5px] text-white/45">
            {t("marketsUnavailable")}
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t border-white/7 px-6 py-10 text-center text-[13.5px] text-white/45">
            {t("noResults")}
          </div>
        ) : (
          rows.map((row) => {
            const token = row.original;
            const up = token.change24h >= 0;
            return (
              <button
                key={token.symbol}
                type="button"
                onClick={() => openToken(token)}
                className="flex h-[62px] w-full cursor-pointer items-center border-b border-white/7 px-4 text-left transition-colors hover:bg-white/4"
              >
                {/* Asset: icon + symbol + name */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="shrink-0 overflow-hidden rounded-[11px]">
                    <AssetIcon
                      sym={token.symbol}
                      bg={tokenBg(token.symbol)}
                      logo={token.logo}
                      fallback="gradient"
                      size={36}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[14.5px] font-medium text-white">
                      {token.symbol}
                    </p>
                    {token.name.toLowerCase() !== token.symbol.toLowerCase() ? (
                      <p className="truncate text-[12px] font-normal text-white/50">
                        {token.name}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Price column */}
                <div className="flex w-[110px] flex-col items-end gap-1">
                  <span className="tnum text-[14px] font-semibold text-white">
                    {token.priceUsd > 0 ? formatUsd(token.priceUsd) : "—"}
                  </span>
                  <span className="tnum text-[12px] font-medium text-white/50">
                    {compactUsd(token.marketCap)}
                  </span>
                </div>

                {/* 24h change column */}
                <div className="flex w-[75px] flex-col items-end">
                  <span
                    className={`tnum text-[13.5px] font-semibold ${
                      up ? "text-[#7ce7b0]" : "text-[#f6a5a5]"
                    }`}
                  >
                    {changeLabel(token.change24h)}
                  </span>
                  <span className="tnum text-[12px] font-medium text-white/50">
                    {token.priceUsd > 0
                      ? `$${Math.abs(token.priceUsd * (token.change24h / 100)).toFixed(2)}`
                      : "—"}
                  </span>
                </div>
              </button>
            );
          })
        )}

        {/* Footer */}
        {!loading && !error && rows.length > 0 ? (
          <button
            type="button"
            onClick={() => router.push("/manage-tokens")}
            className="w-full cursor-pointer border-t border-white/7 p-3.5 text-center transition-colors hover:bg-white/4"
          >
            <span className="font-sans text-[13px] font-medium text-[#f3f3f3]">
              Manage tokens
            </span>
          </button>
        ) : null}
      </div>

      {/* Desktop pagination — mobile uses "Manage tokens" footer. */}
      {!loading && !error && rows.length > 0 && pageCount > 1 ? (
        <div className="mt-2 hidden sm:block">
          <ListPagination
            page={pageIndex + 1}
            pages={pageCount}
            onPage={(p) => table.setPageIndex(p - 1)}
          />
        </div>
      ) : null}
    </div>
  );
}
