"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PREFILL_PARAMS, readTradePrefill } from "@/lib/voice/prefill";
import type { TradePrefill } from "@/lib/voice/intent";

// Reads a voice trade prefill from the URL once, then strips the params so a
// reload or back-navigation doesn't re-open the trade. Returns the prefill (a
// stable snapshot captured on mount) or null. The section that consumes it
// resolves the symbol against its registry and opens the panel.
//
// Reads window.location directly rather than useSearchParams so the consuming
// section does not need a Suspense boundary for static prerender — the params
// only ever arrive client-side (a voice command in the browser).
export function useTradePrefill(): TradePrefill | null {
  const router = useRouter();
  const pathname = usePathname();
  const [prefill] = useState<TradePrefill | null>(() => {
    if (typeof window === "undefined") return null;
    return readTradePrefill(new URLSearchParams(window.location.search));
  });

  useEffect(() => {
    if (!prefill) return;
    const next = new URLSearchParams(window.location.search);
    let changed = false;
    for (const key of PREFILL_PARAMS) {
      if (next.has(key)) {
        next.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [prefill, router, pathname]);

  return prefill;
}
