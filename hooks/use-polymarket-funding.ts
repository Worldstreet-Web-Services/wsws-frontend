"use client";

import { useCallback, useMemo, useState } from "react";
import { erc20Abi } from "viem";
import { friendlyError } from "@/lib/errors";
import { usePolymarketSession } from "@/hooks/use-polymarket-session";
import { useSendUsdc } from "@/hooks/use-withdraw";
import { usePortfolio } from "@/hooks/use-portfolio";
import { apiFetch } from "@/lib/api";
import { SETTLE_CHAINS } from "@/lib/deposit";
import { CONTRACTS, POLYGON_CHAIN_ID, PUSD_DECIMALS } from "@/lib/polymarket/config";
import { publicClientForChain } from "@/lib/trade/receipt";
import { toBaseUnits } from "@/lib/trade/math";

// Betting settles in pUSD inside the Polymarket account. We fund it from the
// user's USDC on Base only: the platform runs on Base, so every spend comes from
// there. Polymarket's deposit bridge is cross-chain and auto-wraps the incoming
// USDC to pUSD in the account's Deposit Wallet.
const FUNDING_NETWORK = "base-mainnet";
const FUNDING_SETTLE = SETTLE_CHAINS.base;

// The bridge credits pUSD asynchronously (a cross-chain hop, ~a minute), so after
// sending we poll the Deposit Wallet's pUSD until it covers the bet.
const POLL_MS = 4000;
const MAX_WAIT_MS = 120_000;

export type FundingStatus = "idle" | "funding" | "waiting";

// The bridge returns an address per VM family; keys have varied across versions,
// so pull each defensively. We only ever use the EVM address (Base origin).
function pickEvmAddress(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const nested = (d.addresses as Record<string, unknown>) ?? {};
  const re = /^0x[0-9a-fA-F]{40}$/;
  for (const k of ["evm", "evmAddress", "polygon"]) {
    for (const v of [d[k], nested[k]]) {
      if (typeof v === "string" && re.test(v)) return v;
    }
  }
  return null;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function usePolymarketFunding() {
  const { ensureReady } = usePolymarketSession();
  const { sendUsdc } = useSendUsdc();
  const { tokens, loading: portfolioLoading } = usePortfolio();
  const [status, setStatus] = useState<FundingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Spendable USDC on Base — the only funding source.
  const usdcTotal = useMemo(
    () =>
      tokens
        .filter((t) => t.symbol === "USDC" && t.network === FUNDING_NETWORK)
        .reduce((sum, t) => sum + t.balance, 0),
    [tokens]
  );

  // Reads the Deposit Wallet's pUSD balance in base units, on Polygon (where
  // pUSD lives), through a chain-pinned client rather than the wallet's provider.
  const readPusd = useCallback(async (wallet: string): Promise<bigint> => {
    const polygon = publicClientForChain(POLYGON_CHAIN_ID);
    return polygon.readContract({
      address: CONTRACTS.pusd as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [wallet as `0x${string}`],
    });
  }, []);

  // Ensures the Polymarket account holds at least `amountUsd` in pUSD, moving the
  // shortfall from Base USDC and waiting for it to arrive. A no-op when the
  // account already has enough, so a funded user places instantly.
  const fundToCover = useCallback(
    async (amountUsd: number): Promise<void> => {
      setError(null);
      try {
        const client = await ensureReady();
        const wallet = client.account.wallet;
        const needed = toBaseUnits(String(amountUsd), PUSD_DECIMALS);

        const current = await readPusd(wallet);
        if (current >= needed) return;

        // Shortfall in whole cents, so we never bridge a sub-cent dust amount.
        const shortfallUnits = needed - current;
        const shortfallUsd = Math.ceil(Number(shortfallUnits) / 10 ** (PUSD_DECIMALS - 2)) / 100;
        if (usdcTotal < shortfallUsd) {
          throw new Error(
            `You have $${usdcTotal.toFixed(2)} USDC on Base, which isn't enough. Add USDC to your wallet first.`
          );
        }

        setStatus("funding");
        const res = await apiFetch("/api/polymarket/deposit-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: wallet }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("Could not get a deposit address");
        const bridge = pickEvmAddress(data);
        if (!bridge) throw new Error("No deposit address returned");

        await sendUsdc({
          chainType: "ethereum",
          to: bridge,
          amount: toBaseUnits(String(shortfallUsd), 6),
          settle: FUNDING_SETTLE,
        });

        // Wait for the bridge to credit pUSD, then betting can spend it.
        setStatus("waiting");
        const started = Date.now();
        while (Date.now() - started < MAX_WAIT_MS) {
          await delay(POLL_MS);
          if ((await readPusd(wallet)) >= needed) return;
        }
        throw new Error(
          "Your funds are on the way. This can take a minute — try placing the bet again shortly."
        );
      } catch (e) {
        setError(friendlyError(e, "Couldn't add funds. Please try again."));
        throw e;
      } finally {
        setStatus("idle");
      }
    },
    [ensureReady, readPusd, sendUsdc, usdcTotal]
  );

  return { fundToCover, status, error, usdcTotal, portfolioLoading };
}
