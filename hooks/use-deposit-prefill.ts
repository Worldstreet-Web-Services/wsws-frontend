"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PREFILL_PARAMS, readDepositPrefill } from "@/lib/voice/prefill";
import type { DepositPrefill } from "@/lib/voice/intent";

// Reads a voice crypto-deposit prefill from the URL once, then strips the params
// so a reload doesn't re-open the funds modal. Returns the prefill (a stable
// snapshot captured on mount) or null. The dashboard opens the funds modal on
// the crypto screen with this chain/token pre-selected.
//
// Reads window.location directly rather than useSearchParams so the consuming
// page does not need a Suspense boundary for static prerender — the params only
// ever arrive client-side (a voice command in the browser).
export function useDepositPrefill(): DepositPrefill | null {
  const router = useRouter();
  const pathname = usePathname();
  const [prefill] = useState<DepositPrefill | null>(() => {
    if (typeof window === "undefined") return null;
    return readDepositPrefill(new URLSearchParams(window.location.search));
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
