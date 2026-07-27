"use client";

import { useCallback, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { usePolymarketSession } from "@/hooks/use-polymarket-session";
import { readCollateralUsd } from "@/lib/polymarket/collateral";
import type { SecureClient } from "@/lib/polymarket/secure-client";

type PositionsPage = Awaited<ReturnType<ReturnType<SecureClient["listPositions"]>["firstPage"]>>;
export type PolymarketPosition = PositionsPage["items"][number];

// Loads the user's open Polymarket positions on demand. Deliberately not
// auto-fetched: reading requires the trading session, and we don't want to
// trigger onboarding just from viewing the section. Also reports spendable pUSD
// (the balance funded bets draw from) so the user can see funds not yet in a
// position.
export function usePolymarketPositions() {
  const { ensureReady } = usePolymarketSession();
  const [positions, setPositions] = useState<PolymarketPosition[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await ensureReady();
      const [page, collateral] = await Promise.all([
        client.listPositions().firstPage(),
        readCollateralUsd(client).catch(() => null),
      ]);
      setPositions(page.items);
      setAvailable(collateral);
      setLoaded(true);
    } catch (e) {
      setError(friendlyError(e, "Couldn't load your positions. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [ensureReady]);

  return { positions, available, loading, loaded, error, refresh };
}
