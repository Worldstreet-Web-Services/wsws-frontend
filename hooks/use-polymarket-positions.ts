"use client";

import { useCallback, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { usePolymarketSession } from "@/hooks/use-polymarket-session";
import type { SecureClient } from "@/lib/polymarket/secure-client";

type PositionsPage = Awaited<ReturnType<ReturnType<SecureClient["listPositions"]>["firstPage"]>>;
export type PolymarketPosition = PositionsPage["items"][number];

// Loads the user's open Polymarket positions on demand. Deliberately not
// auto-fetched: reading requires the trading session, and we don't want to
// trigger onboarding just from viewing the section.
export function usePolymarketPositions() {
  const { ensureReady } = usePolymarketSession();
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await ensureReady();
      const page = await client.listPositions().firstPage();
      setPositions(page.items);
      setLoaded(true);
    } catch (e) {
      setError(friendlyError(e, "Couldn't load your positions. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [ensureReady]);

  return { positions, loading, loaded, error, refresh };
}
