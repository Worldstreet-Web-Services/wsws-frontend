"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MarketLogo } from "@/components/ui/market-logo";
import { SearchIcon, WalletIcon, CloseIcon } from "@/components/ui/icons";
import { formatUsd } from "@/lib/trade/math";

// The Market Square mark used as the purple tile in the bottom bar.
const SQUARE_MARK = "/market-square/bubble-mark.svg";
// Indicative taker fee, matching the order ticket.
const FEE_PCT = 0.001;

function ChevronDown({ size = 10, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M5 20V10m7 10V4m7 16v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M7 11h4M9 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6.5 7h11a3.5 3.5 0 0 1 3.44 2.86l.7 3.8A2.9 2.9 0 0 1 18.79 17c-.98 0-1.87-.55-2.3-1.43l-.28-.57H7.8l-.28.57A2.57 2.57 0 0 1 5.2 17a2.9 2.9 0 0 1-2.85-3.34l.7-3.8A3.5 3.5 0 0 1 6.5 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

// A pill-tab strip with an underline that tracks the active tab, per the comp.
function UnderlineTabs({
  items,
  active,
  onSelect,
  fill = true,
}: {
  items: string[];
  active: number;
  onSelect: (index: number) => void;
  fill?: boolean;
}) {
  const TAB_W = 100;
  const segment = fill
    ? { left: `${(active * 100) / items.length}%`, width: `${100 / items.length}%` }
    : { left: `${active * TAB_W}px`, width: `${TAB_W}px` };
  return (
    <div className="w-full">
      <div className="flex">
        {items.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(i)}
            style={fill ? undefined : { width: TAB_W }}
            className={`flex h-[38px] cursor-pointer items-center justify-center px-2.5 font-sans text-[12px] font-bold transition-colors ${
              fill ? "flex-1" : "shrink-0"
            } ${i === active ? "text-[#f4f4f4]" : "text-white/40"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative h-[2px] w-full bg-white/8">
        <div
          className="absolute top-0 h-[2px] bg-white transition-[left] duration-200"
          style={segment}
        />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-sans text-[13px] font-normal text-[#94a3b8]">{label}</span>
      <span className={`font-sans text-[13px] ${valueClass ?? "font-medium text-[#f8fafc]"}`}>
        {value}
      </span>
    </div>
  );
}

const NAV_TABS = ["Home", "Spot", "Perps", "Memecoins"];
const POS_TABS = ["Orders", "Positions", "History"];

interface MobileSpotPageProps {
  open: boolean;
  onClose: () => void;
  /** The traded pair, e.g. base "BTC" against quote "USDC". */
  base: string;
  quote?: string;
  /** Live mark price of the pair. */
  price: number;
  /** 24h change, percent. Coloured up/down like the rest of the app. */
  change24h: number;
  /** Spendable quote balance (USDC), shown against the Quantity field. */
  balance: number;
  /** The real chart, revealed by the View Chart toggle. */
  chart: ReactNode;
  /** The section's real holding card, shown under the Positions tab. */
  positions?: ReactNode;
  /** Buy / Sell. Wired by the caller to the app's existing order sheets. */
  onBuy?: () => void;
  onSell?: () => void;
  /** Reopen the market list to switch pairs. */
  onSwitchMarket?: () => void;
}

// The mobile Spot Trading screen, built to the comp (node 251:16288): the MARKET
// wordmark, search, the section tabs, the pair row, the chart and the order
// entry. The chart is the section's real chart; the order fields read live
// price and balance. Order submission opens the app's existing buy/sell sheets,
// so no money path is reimplemented here. Phone only; opens over the dashboard.
export function MobileSpotPage({
  open,
  onClose,
  base,
  quote = "USDC",
  price,
  change24h,
  balance,
  chart,
  positions,
  onBuy,
  onSell,
  onSwitchMarket,
}: MobileSpotPageProps) {
  const reduce = useReducedMotion();
  const [navTab, setNavTab] = useState(1); // Spot
  const [query, setQuery] = useState("");
  const [orderType, setOrderType] = useState(1); // 0 Limit, 1 Market
  const [chartOpen, setChartOpen] = useState(false);
  const [posTab, setPosTab] = useState(0);
  const [quantity, setQuantity] = useState("");

  // Lock the page behind the overlay and close on Escape, like the trade sheet.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const up = change24h >= 0;
  const changeText = `${up ? "+" : ""}${change24h.toFixed(2)}%`;
  const qtyNum = parseFloat(quantity) || 0;
  const priceText = price > 0 ? price.toLocaleString(undefined, { maximumFractionDigits: 8 }) : "—";
  const balanceText = balance.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${base}/${quote}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[200] overflow-y-auto bg-[#0f0f0f] text-white md:hidden"
        >
          <div className="mx-auto flex w-full max-w-[440px] flex-col gap-4 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-32">
            <div className="flex justify-center pt-2">
              <MarketLogo className="h-[22px] w-auto" />
            </div>

            {/* Search + section tabs */}
            <div className="flex flex-col gap-3">
              <div className="flex h-10 items-center gap-1.5 rounded-[50px] border border-white/12 bg-white/5 px-2.5">
                <span className="grid size-3.5 shrink-0 place-items-center text-white/45">
                  <SearchIcon />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="min-w-0 flex-1 border-none bg-transparent font-sans text-[13px] font-normal text-white outline-none placeholder:text-white/45"
                />
              </div>
              <UnderlineTabs items={NAV_TABS} active={navTab} onSelect={setNavTab} />
            </div>

            {/* Pair + order type + View Chart */}
            <div className="flex flex-col gap-[18px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onSwitchMarket}
                    className="flex h-9 cursor-pointer items-center gap-[5px] rounded-[15px] border border-white/20 bg-white/5 px-2.5 py-[5px]"
                  >
                    <span className="font-sans text-[13px] font-bold text-[#f4f4f4]">
                      {base}/{quote}
                    </span>
                    <ChevronDown size={10} className="text-white/70" />
                  </button>
                  <span
                    className={`font-sans text-[13.5px] font-medium ${up ? "text-up" : "text-down"}`}
                  >
                    {changeText}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-[16px] border border-white/12 bg-black/35 p-1">
                  {["Limit", "Market"].map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setOrderType(i)}
                      className={`cursor-pointer rounded-[12px] px-4 py-1.5 font-sans text-[12px] font-medium transition-colors ${
                        orderType === i ? "bg-white/10 text-white" : "text-white/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setChartOpen((v) => !v)}
                aria-expanded={chartOpen}
                className="flex cursor-pointer items-center gap-1"
              >
                <span className="bg-accent size-0.75 rounded-full" />
                <svg viewBox="0 0 16 16" aria-hidden className="h-[11px] w-[11px] text-white">
                  <path
                    d="M2 13V3m0 10h12M5 10l2.5-3 2 2L14 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-sans text-[11px] font-medium tracking-[-0.05px] text-white">
                  {chartOpen ? "Close Chart" : "View Chart"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-white transition-transform ${chartOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* The real chart, revealed by the toggle. */}
            {chartOpen ? chart : null}

            {/* Price */}
            <div className="flex items-center justify-between rounded-[15px] bg-white/5 p-[15px]">
              <span className="flex flex-col gap-2">
                <span className="font-sans text-[12px] font-medium text-[#94a3b8]/60">Price</span>
                <span className="tnum font-sans text-[13px] font-semibold text-white">
                  {priceText}
                </span>
              </span>
              <span className="font-sans text-[13px] font-bold text-white">{quote}</span>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-3 rounded-[20px] border border-white/12 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] font-medium text-[#94a3b8]/60">
                  Quantity
                </span>
                <span className="tnum font-sans text-[11px] font-medium text-[#b3bac4]/60">
                  Balance: {balanceText} {quote}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  placeholder="0"
                  className="tnum min-w-0 flex-1 border-none bg-transparent font-sans text-[28px] font-bold text-[#f8fafc] outline-none placeholder:text-white/25"
                />
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#1c1c1c] px-2.5 py-1.5">
                  <span className="grid size-4 place-items-center rounded-full bg-[#2775ca] text-[9px] font-bold text-white">
                    $
                  </span>
                  <span className="font-sans text-[13px] font-semibold text-[#f8fafc]">
                    {quote}
                  </span>
                </span>
              </div>
            </div>

            {/* Order summary */}
            <div className="flex flex-col gap-2.5 rounded-[20px] border border-[#2d2a3a] bg-[#0a0a0a] p-4">
              <SummaryRow
                label="Order Value"
                value={qtyNum > 0 ? `${qtyNum.toLocaleString()} ${quote}` : "—"}
                valueClass="font-semibold text-[#f8fafc]"
              />
              <SummaryRow label="Price" value={price > 0 ? formatUsd(price) : "—"} />
              <SummaryRow
                label="Est. receive"
                value={qtyNum > 0 && price > 0 ? `${(qtyNum / price).toFixed(6)} ${base}` : "—"}
              />
              <SummaryRow
                label="Opening fee"
                value={qtyNum > 0 ? formatUsd(qtyNum * FEE_PCT) : "—"}
              />
            </div>

            {/* Buy / Sell — the model's two action buttons, spot semantics. */}
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={onBuy}
                className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-[24px] bg-[#0ecb81] font-sans text-[16px] font-semibold text-white transition-[filter] active:brightness-95"
              >
                Buy {base}
              </button>
              <button
                type="button"
                onClick={onSell}
                className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-[24px] bg-[#d93025] font-sans text-[16px] font-semibold text-white transition-[filter] active:brightness-95"
              >
                Sell {base}
              </button>
            </div>

            {/* Orders / Positions / History. Positions shows the real holding. */}
            <UnderlineTabs items={POS_TABS} active={posTab} onSelect={setPosTab} fill={false} />
            {posTab === 1 ? positions : null}
          </div>

          {/* Bottom bar: the close button returns to the market list. */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <nav className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/12 bg-[#141416]/90 p-1.5 shadow-[0_18px_50px_-16px_rgba(0,0,0,0.95)] backdrop-blur-[18px]">
              <span className="grid size-11 place-items-center rounded-full text-white/70">
                <WalletIcon size={20} />
              </span>
              <span className="flex h-11 items-center gap-2 rounded-full bg-white/14 px-4 text-white">
                <BarChartIcon className="size-5" />
                <span className="font-sans text-[12.5px] font-medium">Market</span>
              </span>
              <span className="grid size-11 place-items-center rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SQUARE_MARK} alt="" className="h-6 w-[26px]" />
              </span>
              <span className="grid size-11 place-items-center rounded-full text-white/70">
                <GameIcon className="size-5" />
              </span>
            </nav>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="pointer-events-auto grid size-11 cursor-pointer place-items-center rounded-full border border-white/12 bg-white/6 text-white/70 transition-colors active:bg-white/12"
            >
              <CloseIcon />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
