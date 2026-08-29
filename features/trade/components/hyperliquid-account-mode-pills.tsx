"use client";

import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import type { HlAbstractionMode, HlAbstractionModeStatus } from "@/features/trade/lib/hyperliquid-types";

interface HyperliquidAccountModePillsProps {
  walletId: string | null;
  walletReady: boolean;
  busy: boolean;
  onGetMode: () => Promise<HlAbstractionModeStatus>;
  onSetMode: (mode: HlAbstractionMode) => Promise<void>;
}

const MODES: [HlAbstractionMode, string][] = [
  ["disabled", "Manual"],
  ["unifiedAccount", "Unified"],
  ["portfolioMargin", "Portfolio"],
];

// HyperCore's own account-abstraction mode (NOT EIP-7702 — see
// hyperliquid-types.ts's HlAbstractionMode doc comment), surfaced as a 3-up
// pill row: only "Manual" mode is eligible to have Ark's builder fee attached
// to an order, so switching away from it costs the platform revenue on this
// wallet's trades. Same signed-EIP-712 round trip as builder-fee approval,
// but user-initiated from here rather than silent (see hyperliquid-actions.ts).
export function HyperliquidAccountModePills({
  walletId,
  walletReady,
  busy,
  onGetMode,
  onSetMode,
}: HyperliquidAccountModePillsProps) {
  const [status, setStatus] = useState<HlAbstractionModeStatus | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletReady || !walletId) return;
    let cancelled = false;
    onGetMode()
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        // Read-only status check — a failure here just leaves the pills
        // showing no active state rather than surfacing an error for
        // something the user didn't ask to do.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId, walletReady]);

  const handleSelect = async (mode: HlAbstractionMode) => {
    if (!walletReady || switching || busy || mode === status?.mode) return;
    setSwitching(true);
    setError(null);
    try {
      await onSetMode(mode);
      const result = await onGetMode();
      setStatus(result);
    } catch (err) {
      setError(friendlyError(err, "Could not switch account mode."));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="ws-card p-4 sm:p-5">
      <div className="mb-3 text-xs font-normal text-white/55">Account mode</div>
      <div className="flex gap-1 rounded-xl bg-white/4 p-1">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            disabled={!walletReady || switching || busy}
            className={`flex-1 cursor-pointer rounded-lg py-1.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              status?.mode === value ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {status && !status.eligibleForBuilderFees ? (
        <p className="mt-2 text-[12px] font-normal text-white/45">
          Switch to Manual mode to keep supporting builder-fee revenue on your trades.
        </p>
      ) : null}
      {error ? <p className="text-down mt-2 text-[12px] font-normal">{error}</p> : null}
    </div>
  );
}
