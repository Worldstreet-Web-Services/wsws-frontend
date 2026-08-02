"use client";

import { useCallback, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSignAndSendTransaction, useWallets } from "@privy-io/react-auth/solana";
import { getBase58Decoder } from "@solana/kit";
import { usePortfolio } from "@/hooks/use-portfolio";
import { confirmSolanaSignature } from "@/lib/trade/solana-confirm";
import { fetchLifiStatus, fetchSolanaBridgeQuote } from "@/lib/trade/lifi";
import { LIFI_BASE_CHAIN, BASE_USDC } from "@/lib/rwa/funding";
import { USDC_BY_CHAIN } from "@/lib/rwa-api";
import { toBaseUnits } from "@/lib/trade/math";
import { getWalletAddress } from "@/lib/user";

export type ProceedsPhase = "idle" | "quoting" | "signing" | "settling" | "done" | "failed";

const SLIPPAGE = 0.005;
const POLL_MS = 3_000;
// Wall-clock, not a poll count: a slow status endpoint would otherwise stretch
// the wait far past the intended ceiling. The route itself settles in ~7s.
const SETTLE_DEADLINE_MS = 150_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Brings USDC on Solana back to Base, where the rest of the account lives —
// the return half of the funding leg, used after selling a Solana asset.
//
// Unlike the outbound legs, this route originates on Solana: LI.FI returns a
// base64 transaction for the embedded Solana wallet to sign, so it costs a
// little SOL rather than being sponsored. The buy flow's gas top-up leaves
// enough behind to cover it.
export function useSolanaProceeds() {
  const { user } = usePrivy();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { wallets: solanaWallets } = useWallets();
  const portfolio = usePortfolio();
  const [phase, setPhase] = useState<ProceedsPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
  }, []);

  const bringHome = useCallback(
    async (usdc: number): Promise<boolean> => {
      const from = getWalletAddress(user, "solana");
      const to = getWalletAddress(user, "ethereum");
      const wallet = solanaWallets[0];
      if (!from || !to || !wallet || usdc <= 0) {
        setError("No wallet");
        setPhase("failed");
        return false;
      }

      setError(null);
      try {
        setPhase("quoting");
        const quote = await fetchSolanaBridgeQuote({
          fromToken: USDC_BY_CHAIN.solana.address,
          toChain: LIFI_BASE_CHAIN,
          toToken: BASE_USDC,
          fromAmount: toBaseUnits(usdc.toFixed(6), 6),
          fromAddress: from,
          toAddress: to,
          slippage: SLIPPAGE,
        });

        setPhase("signing");
        const { signature } = await signAndSendTransaction({
          transaction: base64ToBytes(quote.transaction),
          wallet,
        });
        const sig = getBase58Decoder().decode(signature);
        await confirmSolanaSignature(sig).catch(() => {
          // The bridge poll below is the real settlement signal.
        });

        setPhase("settling");
        const deadline = Date.now() + SETTLE_DEADLINE_MS;
        while (Date.now() < deadline) {
          await delay(POLL_MS);
          const status = await fetchLifiStatus(sig).catch(() => "PENDING" as const);
          if (status === "DONE") {
            void portfolio.refetch();
            setPhase("done");
            return true;
          }
          if (status === "FAILED") throw new Error("The transfer did not complete.");
        }
        throw new Error("The transfer is taking longer than expected.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "The transfer did not complete.");
        setPhase("failed");
        return false;
      }
    },
    [user, solanaWallets, signAndSendTransaction, portfolio]
  );

  return {
    bringHome,
    phase,
    error,
    reset,
    busy: phase !== "idle" && phase !== "done" && phase !== "failed",
  };
}
