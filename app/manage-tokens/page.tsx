"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssetIcon } from "@/components/ui/asset-icon";
import { useSpotMarkets } from "@/features/trade/hooks/use-spot-markets";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative h-5 w-10 shrink-0 cursor-pointer rounded-[50px]"
    >
      <span
        className={`absolute inset-0 rounded-[50px] transition-colors ${
          checked ? "bg-[#ffcf33]" : "bg-[#f6f6f6]"
        }`}
        style={{ boxShadow: checked
          ? "inset 0 1.53px 2.04px rgba(0,0,0,0.1)"
          : "inset 0 0.39px 0.52px 0.77px rgba(0,0,0,0.1)"
        }}
      />
      <span
        className={`absolute top-1/2 block size-3.5 -translate-y-1/2 rounded-full shadow-sm transition-all ${
          checked
            ? "left-[22px] bg-[#1a1a1a]"
            : "left-[4px] bg-white"
        }`}
      />
    </button>
  );
}

export default function ManageTokensPage() {
  const router = useRouter();
  const { markets } = useSpotMarkets();
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  // Default all tokens to ON if not yet set.
  const isEnabled = (symbol: string) => enabled[symbol] ?? true;

  const filtered = markets.filter((m) =>
    `${m.symbol} ${m.name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] pt-[max(64px,env(safe-area-inset-top,64px))]">
      {/* Header */}
      <div className="flex items-center px-4 pb-1">
        <div className="flex h-[75px] w-full items-center justify-between">
          <div className="flex items-center gap-14">
            <button
              type="button"
              onClick={() => router.back()}
              className="grid size-8 cursor-pointer place-items-center rounded-full bg-white/5"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="#f3f3f3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <p className="text-[20px] font-bold leading-7 tracking-[-0.2px] text-white">
              Manage Tokens
            </p>
          </div>
        </div>
      </div>

      {/* Search + token list */}
      <div className="flex flex-col gap-4 px-4 pt-2">
        {/* Search */}
        <div className="flex h-[38px] items-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tokens"
            className="w-full bg-transparent text-[13.5px] text-white placeholder:text-white/40 outline-none"
          />
        </div>

        {/* Token list card */}
        <div className="overflow-hidden rounded-[22px] border border-white/12 bg-white/5">
          {/* Table header */}
          <div className="flex items-center border-b border-white/7 px-4 py-3.5 text-[11.5px] font-medium uppercase tracking-[0.46px] text-white/40">
            <span className="min-w-0 flex-1">Asset</span>
            <span className="w-[75px] text-right">Toggle</span>
          </div>

          {/* Token rows */}
          {filtered.map((token) => (
            <div
              key={token.symbol}
              className="flex items-center border-b border-white/7 px-4 py-3"
            >
              {/* Left: icon + name */}
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
                  <p className="truncate text-[12px] text-white/50">
                    <span>{token.name} </span>
                    <span className="text-white">
                      ({token.priceUsd > 0 ? `$${formatUsd(token.priceUsd).replace("$", "")}` : "$0.00"})
                    </span>
                  </p>
                </div>
              </div>

              {/* Right: toggle */}
              <Toggle
                checked={isEnabled(token.symbol)}
                onChange={() =>
                  setEnabled((prev) => ({
                    ...prev,
                    [token.symbol]: !isEnabled(token.symbol),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
