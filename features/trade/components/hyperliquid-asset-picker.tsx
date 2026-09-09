"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AssetIcon } from "@/components/ui/asset-icon";
import { SearchIcon } from "@/components/ui/icons";
import { FlashPrice } from "@/features/trade/components/flash-price";
import { formatCompactUsd, formatUsd } from "@/lib/trade/math";
import { tokenBg } from "@/lib/trade/assets";
import {
  hlPairLabel,
  type HlAsset,
  type HlMarketContext,
} from "@/features/trade/lib/hyperliquid-types";

interface HyperliquidAssetPickerProps {
  assets: HlAsset[];
  prices: Record<string, string>;
  contexts: HlMarketContext[];
  selected: string;
  onSelect: (symbol: string) => void;
  loading: boolean;
  /** Renders as a bare trigger (no card chrome, no trailing price) so it can
   *  sit inline inside HyperliquidMarketHeader's own stats row instead of
   *  as its own standalone card above the chart. */
  compact?: boolean;
  /** Real measured width of some wider element the caller wants the compact
   *  dropdown to line up with (compact mode only), e.g. the chart column
   *  behind a wide desktop trigger. Only ever widens the dropdown past its
   *  own comfortable minimum: a value narrower than the six columns need,
   *  such as the bare trigger pill's own width on a phone, is ignored, and
   *  the result never exceeds the room actually available on screen. */
  dropdownWidth?: number;
  /** Optional controlled open state. Left undefined, the picker owns the flag
   *  itself and behaves exactly as it did before this existed. Passed, the
   *  caller owns it: the picker only ever asks through onOpenChange, which is
   *  what lets a screen close the menu from outside without remounting the
   *  whole picker to do it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface MarketRow {
  asset: HlAsset;
  price: number;
  changePct: number | null;
  fundingPct: number | null;
  volumeUsd: number | null;
  openInterestUsd: number | null;
}

// Fixed display order — native crypto first (the original, always-present
// market), then HIP-3 categories roughly by how common they are, "other"
// last as the catch-all. A category only gets a tab when at least one
// synced asset actually has it, so this list quietly does nothing until
// HIP-3 dexs are configured (PERPS_HIP3_DEXS).
const CATEGORY_LABELS: Record<string, string> = {
  crypto: "Crypto",
  // TEMPORARY ROLLOUT GATE — HIP-3 categories are hidden until verified for
  // release. Re-enable each label here together with its entry in
  // RELEASED_CATEGORIES (use-hyperliquid-markets.ts), which is the actual
  // gate; these labels only control which tabs can render.
  // equities: "Equities",
  // forex: "Forex",
  // commodities: "Commodities",
  // indices: "Indices",
  // other: "Other",
};
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

// The compact dropdown's own six-column table (Market/Last Price/24h
// Change/Funding/Volume/Open Interest) carries a `min-w-[560px]` further
// down so a narrow box scrolls horizontally rather than clipping a value
// mid-digit. 560 is that same figure: the width below which the dropdown
// gains nothing by shrinking further, because its content won't shrink with
// it. A trigger measured wider than this is left alone, up to a ceiling: a
// bare pair pill in a tablet-width fullscreen chart header can measure far
// wider than six columns of numbers ever need, and matching it verbatim
// would leave the dropdown absurdly wide for no benefit.
const COMPACT_DROPDOWN_COMFORTABLE_WIDTH = 560;
const COMPACT_DROPDOWN_MAX_WIDTH = 720;
// Same gutter the non-compact dropdown keeps from the viewport via
// `inset-x-4` (1rem = 16px), so the compact one never touches the edge
// either.
const COMPACT_DROPDOWN_EDGE_GUTTER = 16;

// Every figure on this list arrives as a string from the venue. An empty or
// unparseable one means the venue published nothing for that market, and
// Number("") is 0, which would print a rate, a volume or an open interest the
// venue never quoted. Only a real number gets through; everything else becomes
// null and the row shows its unavailable dash.
function publishedNumber(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

// Header-as-trigger with a searchable market list underneath — the list
// itself is the same Market/Last Price/24h Change/Funding/Volume/Open
// Interest table Hyperliquid's own pro UI shows, sourced from
// use-hyperliquid-market-contexts.ts (one metaAndAssetCtxs call for every
// asset). Sorted by volume, matching Hyperliquid's own default.
export function HyperliquidAssetPicker({
  assets,
  prices,
  contexts,
  selected,
  onSelect,
  loading,
  compact = false,
  dropdownWidth,
  open: controlledOpen,
  onOpenChange,
}: HyperliquidAssetPickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();

  const open = controlledOpen ?? uncontrolledOpen;

  // How much horizontal room actually exists to the right of the trigger,
  // measured from the real DOM rather than assumed from the viewport width
  // alone: the trigger can sit anywhere in its own header (the fullscreen
  // chart header, for one), so a width keyed off `100vw` can run past the
  // right edge of the screen when the trigger isn't flush against the left
  // edge. This is what actually caps the compact dropdown's width, below.
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open || !compact) return;
    const measure = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAvailableWidth(Math.max(0, window.innerWidth - rect.left - COMPACT_DROPDOWN_EDGE_GUTTER));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, compact]);

  // The trigger's own measured width (dropdownWidth) only ever widens the
  // dropdown past its comfortable minimum, never narrows it below what the
  // columns need: on a phone the trigger pill is a fraction of the table's
  // width, and matching it verbatim is the bug this fixes. Whatever comes
  // out still can't exceed the room actually available on screen.
  const compactDropdownWidth = compact
    ? Math.min(
        Math.max(
          dropdownWidth ?? COMPACT_DROPDOWN_COMFORTABLE_WIDTH,
          COMPACT_DROPDOWN_COMFORTABLE_WIDTH
        ),
        COMPACT_DROPDOWN_MAX_WIDTH,
        availableWidth ?? COMPACT_DROPDOWN_COMFORTABLE_WIDTH
      )
    : undefined;

  const setOpen = useCallback(
    (next: boolean) => {
      // Closing always leaves a clean search box behind, whoever closed it.
      if (!next) setSearch("");
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  // Click anywhere that is not the picker and the menu goes. Without this the
  // only ways out were the trigger and picking a row, which is why a screen
  // that wanted to close it from outside had to remount the picker instead.
  // pointerdown, not click: it closes on the press, before the thing under the
  // pointer reacts, and it covers touch and mouse in one listener.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, setOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !open) return;
    // The perps screen listens for Escape on window and means "leave
    // fullscreen" by it. One key closes one thing: the open menu takes this
    // press and stops it here, so the user is not thrown out of fullscreen as
    // well as out of the menu. A press with the menu already closed is not
    // ours and travels on untouched.
    event.stopPropagation();
    setOpen(false);
    triggerRef.current?.focus();
  };

  const availableCategories = useMemo(() => {
    const present = new Set(assets.map((a) => a.category ?? "other"));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [assets]);

  const contextBySymbol = useMemo(() => {
    const map = new Map<string, HlMarketContext>();
    for (const ctx of contexts) map.set(ctx.symbol, ctx);
    return map;
  }, [contexts]);

  const asset = assets.find((a) => a.symbol === selected) ?? assets[0] ?? null;
  const mark = asset ? (publishedNumber(prices[asset.symbol]) ?? 0) : 0;

  const rows = useMemo(() => {
    const built: MarketRow[] = assets.map((a) => {
      const ctx = contextBySymbol.get(a.symbol);
      const price = (ctx ? publishedNumber(ctx.markPrice) : publishedNumber(prices[a.symbol])) ?? 0;
      const prevDayPrice = ctx ? publishedNumber(ctx.prevDayPrice) : null;
      const changePct =
        prevDayPrice != null && prevDayPrice > 0 && price > 0
          ? ((price - prevDayPrice) / prevDayPrice) * 100
          : null;
      const fundingRate = ctx ? publishedNumber(ctx.fundingRate) : null;
      const openInterest = ctx ? publishedNumber(ctx.openInterest) : null;
      return {
        asset: a,
        price,
        changePct,
        fundingPct: fundingRate != null ? fundingRate * 100 : null,
        volumeUsd: ctx ? publishedNumber(ctx.dayVolumeUsd) : null,
        openInterestUsd: openInterest != null && price > 0 ? openInterest * price : null,
      };
    });
    const byCategory =
      category === "all" ? built : built.filter((r) => (r.asset.category ?? "other") === category);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? byCategory.filter((r) => r.asset.symbol.toLowerCase().includes(q))
      : byCategory;
    return filtered.sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0));
  }, [assets, contextBySymbol, prices, search, category]);

  const pick = (symbol: string) => {
    onSelect(symbol);
    // setOpen clears the search box on the way out, so a picked market and a
    // dismissed menu leave the same clean state behind.
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className={compact ? "relative" : "ws-card relative p-4 sm:p-5"}
    >
      <div className="flex items-center gap-3">
        <AssetIcon
          sym={asset?.symbol ?? "?"}
          bg={tokenBg(asset?.symbol ?? "?")}
          size={compact ? 28 : 34}
          fallback="gradient"
        />
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen(!open)}
          disabled={assets.length === 0}
          // This button owns a dropdown, so it has to say so. Without these a
          // screen reader announces it as a plain button and gives no hint that
          // anything opened. It matters more now that the same trigger is the
          // only way to change market from the fullscreen chart.
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          // The phone rules are the design's pair pill: 36px tall, 10px of
          // horizontal padding, a 15px radius and 13px text (the label carries
          // the type size). They are all max-sm:, so the desktop trigger, which
          // takes its chrome from the card around it, is untouched.
          className={`flex min-w-0 cursor-pointer items-center gap-2 text-left disabled:cursor-default ${
            compact
              ? ""
              : "max-sm:border-hairline max-sm:bg-surface max-sm:h-9 max-sm:rounded-[15px] max-sm:border max-sm:px-2.5"
          }`}
        >
          {compact ? (
            <div className="flex items-center gap-1.5 font-sans text-[17px] font-semibold whitespace-nowrap">
              {asset ? hlPairLabel(asset.symbol) : loading ? "Loading…" : "No markets"}
              {assets.length > 0 ? (
                <span aria-hidden className="text-white/40">
                  ▾
                </span>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-sans text-[16px] font-semibold max-sm:text-[13px]">
                {asset ? hlPairLabel(asset.symbol) : loading ? "Loading markets…" : "No markets"}
                {assets.length > 0 ? (
                  <span aria-hidden className="text-white/40">
                    ▾
                  </span>
                ) : null}
              </div>
              {/* The phone comp's pill is the pair and its caret, nothing else:
                  the leverage ceiling has no room inside a 36px pill and the
                  ticket states it again anyway. It stays on the desktop card,
                  which has the height for it. */}
              <div className="truncate text-xs font-normal text-white/50 max-sm:hidden">
                {asset ? `${asset.maxLeverage}x max leverage` : "—"}
              </div>
            </div>
          )}
        </button>
        {compact ? null : (
          <div className="ml-auto text-right">
            <FlashPrice value={mark} className="ws-display tnum block text-[19px]">
              {mark > 0 ? formatUsd(mark) : "—"}
            </FlashPrice>
          </div>
        )}
      </div>

      {open ? (
        <div
          style={compactDropdownWidth != null ? { width: compactDropdownWidth } : undefined}
          className={`bg-panel absolute top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/12 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9)] ${
            compact ? "left-0 max-w-[90vw]" : "inset-x-4"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-2.5">
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search markets"
              // A placeholder is not a name: it is gone the moment the user
              // types, and several screen readers never announce it at all.
              aria-label="Search markets"
              aria-controls={listboxId}
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-[13.5px] font-normal text-white outline-none"
            />
          </div>
          {availableCategories.length > 1 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/8 px-3.5 py-2">
              <button
                onClick={() => setCategory("all")}
                className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  category === "all"
                    ? "bg-white/14 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                All
              </button>
              {availableCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                    category === c ? "bg-white/14 text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {CATEGORY_LABELS[c] ?? c}
                </button>
              ))}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_0.9fr_1fr_1fr] gap-2 px-3.5 py-2 text-[10.5px] font-normal text-white/40">
                <span>Market</span>
                <span className="text-right">Last Price</span>
                <span className="text-right">24h Change</span>
                <span className="text-right">Funding</span>
                <span className="text-right">Volume</span>
                <span className="text-right">Open Interest</span>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {rows.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[13px] font-normal text-white/40">
                    No matches
                  </div>
                ) : null}
                {/* The rows are the listbox this picker's trigger says it owns.
                    The empty message and the column headings stay outside it,
                    because a listbox may hold nothing but its options. */}
                <div role="listbox" id={listboxId} aria-label="Markets">
                  {rows.slice(0, 100).map((row) => (
                    <button
                      key={row.asset.id}
                      type="button"
                      role="option"
                      aria-selected={row.asset.symbol === selected}
                      onClick={() => pick(row.asset.symbol)}
                      // 44px on a phone: the row is a touch target there, and
                      // its own padding leaves it two short of the minimum.
                      className="grid w-full cursor-pointer grid-cols-[1.6fr_1fr_1fr_0.9fr_1fr_1fr] items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-white/6 max-sm:min-h-11"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <AssetIcon
                          sym={row.asset.symbol}
                          bg={tokenBg(row.asset.symbol)}
                          size={22}
                          fallback="gradient"
                        />
                        <span className="truncate font-sans text-[13px] font-medium">
                          {hlPairLabel(row.asset.symbol)}
                        </span>
                      </span>
                      <span className="tnum text-right text-[12.5px]">
                        {row.price > 0 ? formatUsd(row.price) : "—"}
                      </span>
                      <span
                        className={`tnum text-right text-[12.5px] ${
                          row.changePct == null
                            ? "text-white/40"
                            : row.changePct >= 0
                              ? "text-up"
                              : "text-down"
                        }`}
                      >
                        {row.changePct != null
                          ? `${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(2)}%`
                          : "—"}
                      </span>
                      <span
                        className={`tnum text-right text-[12px] ${
                          row.fundingPct == null
                            ? "text-white/40"
                            : row.fundingPct >= 0
                              ? "text-up"
                              : "text-down"
                        }`}
                      >
                        {row.fundingPct != null ? `${row.fundingPct.toFixed(4)}%` : "—"}
                      </span>
                      <span className="tnum text-right text-[12.5px] text-white/70">
                        {row.volumeUsd != null ? formatCompactUsd(row.volumeUsd) : "—"}
                      </span>
                      <span className="tnum text-right text-[12.5px] text-white/70">
                        {row.openInterestUsd != null ? formatCompactUsd(row.openInterestUsd) : "—"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
