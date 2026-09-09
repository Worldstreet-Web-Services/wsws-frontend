"use client";

import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PerpsView } from "@/features/trade/components/perps-view";

// Perpetuals as its own sidebar section: an eyebrow over the perps desk. Spot
// lives in its own section now.
//
// There is one perps interface. The simple/pro switch that used to sit in this
// header was removed, so the desk below is the same at every width: two columns
// from 1080px, and a single stacked, scrolling column under it.
export function PerpsSection() {
  const tSections = useTranslations("sections");
  return (
    <div className="mx-auto w-full max-w-[1920px] p-4 sm:p-6 lg:p-8">
      <Eyebrow>{tSections("perps")}</Eyebrow>
      <div className="mt-4">
        <PerpsView />
      </div>
    </div>
  );
}
