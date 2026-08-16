"use client";

import { useTranslations } from "next-intl";
import { useMoney } from "@/components/ui/currency-select";
import { AssetIcon } from "@/components/ui/asset-icon";
import { tokenBg } from "@/lib/trade/assets";
import { fromBaseUnits } from "@/lib/trade/math";
import { networkLabel, shortAddress } from "@/features/migrate/lib/labels";
import type { ChainSweep } from "@/features/migrate/lib/plan";

interface AssetReviewProps {
  plan: ChainSweep[];
  evmAddress: string;
  solanaAddress: string;
  onConfirm: () => void;
}

// Step two: everything that will move, chain by chain, and where it lands.
export function AssetReview({ plan, evmAddress, solanaAddress, onConfirm }: AssetReviewProps) {
  const t = useTranslations("migrate");
  const money = useMoney();
  const totalUsd = plan.reduce(
    (sum, chain) => sum + chain.assets.reduce((s, a) => s + a.valueUsd, 0),
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="ws-card px-6 py-5">
        <div className="ws-display text-[20px]">{t("reviewTitle")}</div>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-white/55">{t("reviewBody")}</p>
        <div className="mt-4 grid gap-2 text-[13px]">
          <div className="flex items-center justify-between rounded-[12px] bg-white/5 px-4 py-3">
            <span className="text-white/55">{t("newEvmWallet")}</span>
            <span className="font-mono">{shortAddress(evmAddress)}</span>
          </div>
          <div className="flex items-center justify-between rounded-[12px] bg-white/5 px-4 py-3">
            <span className="text-white/55">{t("newSolanaWallet")}</span>
            <span className="font-mono">{shortAddress(solanaAddress)}</span>
          </div>
        </div>
      </div>

      {plan.map((chain) => (
        <div key={chain.network} className="ws-card px-6 py-5">
          <div className="text-[13px] font-medium tracking-[0.04em] text-white/55 uppercase">
            {networkLabel(chain.network)}
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {chain.assets.map((asset) => (
              <li key={asset.id} className="flex items-center gap-3">
                <AssetIcon sym={asset.symbol} bg={tokenBg(asset.symbol)} size={30} />
                <span className="flex-1 text-[14.5px] font-medium">{asset.symbol}</span>
                <span className="text-right">
                  <span className="block text-[14px]">
                    {fromBaseUnits(asset.amount, asset.decimals)}
                  </span>
                  <span className="block text-[12.5px] text-white/45">
                    {money.format(asset.valueUsd)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="ws-card px-6 py-4">
        <p className="text-[13px] leading-[1.55] text-white/55">{t("kashNote")}</p>
      </div>

      <button
        onClick={onConfirm}
        className="h-13 w-full cursor-pointer rounded-[14px] bg-white text-[15px] font-medium text-black transition-opacity hover:opacity-90"
      >
        {t("confirmSweep", { total: money.format(totalUsd) })}
      </button>
    </div>
  );
}
