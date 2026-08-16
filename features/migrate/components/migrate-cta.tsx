"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRightIcon, ShieldIcon } from "@/components/ui/icons";

// The portfolio's entry point to the wallet migration, placed by the dashboard
// route in the portfolio view's migrate slot.
export function MigrateCta() {
  const t = useTranslations("migrate");
  return (
    <Link
      href="/migrate"
      className="group flex w-full cursor-pointer items-center gap-4 rounded-[20px] border border-white/14 px-5 py-5 text-left transition-colors hover:border-white/30"
      style={{
        background: "linear-gradient(105deg, #101408 0%, #1a2210 55%, #26331a 100%)",
      }}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-white/15 bg-white/10 text-white">
        <ShieldIcon size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2.5">
          <span className="ws-display text-[16.5px] text-white">{t("ctaTitle")}</span>
          <span className="rounded-full border border-white/25 bg-white/12 px-2 py-0.5 text-[10px] font-medium tracking-[0.06em] text-white uppercase">
            {t("ctaBadge")}
          </span>
        </span>
        <span className="mt-1 block text-[13px] leading-[1.5] font-normal text-white/70">
          {t("ctaSubtitle")}
        </span>
      </span>
      <ArrowRightIcon
        size={18}
        className="shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
