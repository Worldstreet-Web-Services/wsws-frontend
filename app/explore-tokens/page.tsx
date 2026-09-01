"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AssetIcon } from "@/components/ui/asset-icon";
import { ModalShell } from "@/components/ui/modal-shell";
import { DetailModal } from "@/components/layout/modals/detail-modal";
import { BuySheet } from "@/features/trade";
import { useSpotMarkets, type SpotMarket } from "@/features/trade/hooks/use-spot-markets";
import { tokenBg } from "@/lib/trade/assets";
import { formatUsd } from "@/lib/trade/math";
import type { BuyPayload, DetailPayload } from "@/lib/modal-types";

function changeLabel(chg: number): string {
  const v = Number.isFinite(chg) ? chg : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

type ExploreModal =
  | null
  | { type: "detail"; detail: DetailPayload }
  | { type: "buy"; buy: BuyPayload };

export default function ExploreTokensPage() {
  const router = useRouter();
  const t = useTranslations("markets");
  const { markets } = useSpotMarkets();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ExploreModal>(null);
  const close = useCallback(() => setModal(null), []);

  const filtered = markets.filter((m) =>
    `${m.symbol} ${m.name}`.toLowerCase().includes(search.toLowerCase())
  );

  const openToken = useCallback(
    (token: SpotMarket) => {
      setModal({
        type: "detail",
        detail: {
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
          ],
          cta: t("buyToken", { name: token.name }),
          onCta: () =>
            setModal({
              type: "buy",
              buy: {
                symbol: token.symbol,
                name: token.name,
                priceUsd: token.priceUsd,
                logo: token.logo,
              },
            }),
        },
      });
    },
    [t]
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] pt-[max(64px,env(safe-area-inset-top,64px))]">
      {/* Header */}
      <div className="relative flex h-[75px] items-center px-4 pb-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="z-10 grid size-8 cursor-pointer place-items-center rounded-full bg-[rgba(244,244,244,0.02)]"
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
        <p className="absolute inset-x-0 text-center text-[20px] font-bold leading-7 tracking-[-0.2px] text-[#f3f3f3]">
          Explore tokens
        </p>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex h-[38px] items-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[13.5px] text-white placeholder:text-white/40 outline-none"
          />
        </div>
      </div>

      {/* Token list card */}
      <div className="px-4 pt-2 pb-28">
        <div className="overflow-hidden rounded-[22px] border border-white/12 bg-white/5">
          {/* Table header */}
          <div className="flex items-center border-b border-white/7 px-4 py-3.5 text-[11.5px] font-medium uppercase tracking-[0.46px] text-white/40">
            <span className="min-w-0 flex-1">Asset</span>
            <span className="w-[110px] text-right">Balance</span>
            <span className="w-[75px] text-right">24h</span>
          </div>

          {/* Token rows */}
          {filtered.map((token) => {
            const up = token.change24h >= 0;
            return (
              <button
                key={token.symbol}
                type="button"
                onClick={() => openToken(token)}
                className="flex h-[62px] w-full cursor-pointer items-center border-b border-white/7 px-4 text-left transition-colors hover:bg-white/4"
              >
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
                <div className="flex w-[110px] flex-col items-end gap-1">
                  <span className="tnum text-[14px] font-semibold text-white">
                    {token.priceUsd > 0 ? formatUsd(token.priceUsd) : "—"}
                  </span>
                  <span className="tnum text-[12px] font-medium text-white/50">
                    {token.symbol}
                  </span>
                </div>
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
          })}

          {/* Manage tokens footer */}
          <button
            type="button"
            onClick={() => router.push("/manage-tokens")}
            className="w-full cursor-pointer border-t border-white/7 p-3.5 text-center transition-colors hover:bg-white/4"
          >
            <span className="font-sans text-[13px] font-medium text-[#f3f3f3]">
              Manage tokens
            </span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ModalShell open={modal !== null} onClose={close} contentKey={modal?.type ?? "none"}>
        {modal?.type === "detail" ? <DetailModal detail={modal.detail} /> : null}
        {modal?.type === "buy" ? <BuySheet payload={modal.buy} onClose={close} /> : null}
      </ModalShell>
    </div>
  );
}
