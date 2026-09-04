"use client";

import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PerpModeSwitch } from "@/features/trade/components/perp-mode";
import { PerpsView } from "@/features/trade/components/perps-view";
import { useInView } from "@/hooks/use-in-view";

// Perpetuals as its own sidebar section: the header carries the simple/pro
// switch, the body is the perps desk. Spot lives in its own section now.
//
// Both interfaces are offered at every width; each moves its chart and order
// ticket into a full-screen sheet on a phone, so the section stays a short
// market list until a market is chosen.
export function PerpsSection() {
  const tSections = useTranslations("sections");
  // The dashboard renders every section at once, so this one is mounted from
  // the moment the page loads even for someone reading their balance. Its
  // reads are the fastest in the app, a five second price poll plus a price
  // socket, so they wait until the desk is actually on screen.
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1520px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{tSections("perps")}</Eyebrow>
        <PerpModeSwitch />
      </div>
      <div className="mt-4">
        <PerpsView active={inView} />
      </div>
    </div>
  );
}
