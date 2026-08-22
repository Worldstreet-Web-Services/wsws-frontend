"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ButtonSpinner } from "@/components/ui/button-spinner";
import { ModalShell } from "@/components/ui/modal-shell";
import { SuccessPanel } from "@/components/ui/success-panel";
import { toast } from "@/lib/toast";
import { friendlyError } from "@/lib/errors";
import { useEvmSendBatch } from "@/hooks/use-evm-send";
import { usePortfolio } from "@/hooks/use-portfolio";
import { formatAmount, toBaseUnits } from "@/lib/trade/math";
import { encodeTransfer } from "@/lib/trade/erc20";
import { BUY_ORIGIN } from "@/lib/buy";
import { getWalletAddress } from "@/lib/user";
import type { GatewayApiError } from "@/lib/api/envelope";
import { isBridgeMinimumDetails } from "@/features/trade/lib/hyperliquid-types";
import {
  getArbitrumBalance,
  getDepositAddress,
  getDepositStatus,
} from "@/features/trade/lib/hyperliquid-api";

const BASE_CHAIN_ID = 8453;
const DECIMAL_INPUT = /^\d*\.?\d*$/;
// Dextopus deposits typically resolve in well under a minute; this bound is
// generous rather than declaring failure early.
const STATUS_POLL_TIMEOUT_MS = 5 * 60_000;
const STATUS_POLL_INTERVAL_MS = 3_000;
const PERCENTS = [25, 50, 75, 100];

// The one bridge failure worth naming specifically: BridgeService rejects a
// bridge below Hyperliquid's own minimum deposit floor. Everything else
// collapses to the generic "it'll move automatically" case — swallowing
// this ONE case silently is what made a real, permanent block ("you're
// under Hyperliquid's $5 floor") read exactly like the normal, temporary
// "not needed yet" case.
function belowBridgeMinimum(error: unknown): { haveUsdc: number; minUsdc: number } | null {
  const details = (error as GatewayApiError | undefined)?.details;
  if (!isBridgeMinimumDetails(details)) return null;
  return { haveUsdc: details.arbitrumBalanceUsdc, minUsdc: details.minDepositUsdc };
}

type BridgeResult =
  { bridged: true } | { bridged: false; belowMinimum?: { haveUsdc: number; minUsdc: number } };

type Stage =
  | { name: "form" }
  | { name: "sending" }
  | { name: "confirming" }
  | { name: "bridging"; amount: string }
  | ({ name: "done"; amount: string } & BridgeResult)
  | { name: "stuck"; amount: string };

interface HyperliquidFundModalProps {
  open: boolean;
  onClose: () => void;
  walletId: string | null;
  onBridge: (requiredUsdc: string) => Promise<{ bridged: boolean }>;
  onFunded: () => void;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One click to fund the perps wallet, all the way through to tradeable
// margin: a plain USDC transfer on Base, from this same embedded wallet, to
// the wallet's own static Dextopus deposit address — signed silently and
// gas-sponsored (useEvmSendBatch, same "no popup" mechanism every
// money-moving action in this app uses), no QR code, no separate send step
// outside the app. Dextopus bridges whatever lands there to this wallet's
// own Arbitrum address; FundingService's webhook records it, and this modal
// polls for that. Once it's confirmed, the existing Arbitrum -> HyperCore
// bridge step runs exactly as it did before this rail existed.
export function HyperliquidFundModal({
  open,
  onClose,
  walletId,
  onBridge,
  onFunded,
}: HyperliquidFundModalProps) {
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const { user } = usePrivy();
  const walletAddress = getWalletAddress(user, "ethereum");
  const portfolio = usePortfolio();
  const sendEvmBatch = useEvmSendBatch();

  const baseUsdc = portfolio.tokens.find(
    (t) => t.network === "base-mainnet" && t.symbol.toUpperCase() === "USDC"
  );
  const balance = baseUsdc?.balance ?? 0;

  const amountNum = Number(amount);
  const validAmount = amount !== "" && Number.isFinite(amountNum) && amountNum > 0;
  const busy = stage.name !== "form" && stage.name !== "done" && stage.name !== "stuck";
  // Once a top-up is actually running, the live main-wallet balance keeps
  // falling as the money leaves — comparing the (now-frozen) typed amount
  // against it would spuriously flag "exceeds your balance" for a transfer
  // that's already underway. The amount was already validated against the
  // balance the moment the user confirmed, so freeze the check there.
  const withinBalance = validAmount && (busy || amountNum <= balance);
  const canSubmit = Boolean(walletId) && Boolean(walletAddress) && withinBalance && !busy;

  const close = () => {
    setStage({ name: "form" });
    setAmount("");
    onClose();
  };

  const handleAmount = (raw: string) => {
    const next = raw.replace(/,/g, "");
    if (next === "" || DECIMAL_INPUT.test(next)) setAmount(next);
  };

  const setPercent = (pct: number) => {
    if (balance <= 0) return;
    // Floors to cents so 100% never rounds above the actual balance.
    setAmount((Math.floor(((balance * pct) / 100) * 100) / 100).toFixed(2));
  };

  // Polls two independent signals: the caller's own outgoing tx hash against
  // the webhook-driven ledger, AND a rising Arbitrum USDC balance — the same
  // on-chain truth the webhook would report. Dextopus's webhook can be
  // missed, delayed, or (in local development, always) simply unreachable
  // from a machine with no public URL, so the balance check is what actually
  // completes this flow there; either signal is treated as done.
  const waitForCompletion = async (
    txHash: string,
    startingBalance: string | null
  ): Promise<"completed" | "stuck"> => {
    const deadline = Date.now() + STATUS_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const status = await getDepositStatus(txHash);
        if (status?.status === "confirmed") return "completed";
        if (status?.status === "failed") return "stuck";
      } catch {
        // A transient poll failure just means try again on the next tick.
      }
      if (startingBalance !== null && walletAddress) {
        const current = await getArbitrumBalance(walletAddress).catch(() => null);
        if (current !== null && Number(current) > Number(startingBalance)) return "completed";
      }
      await delay(STATUS_POLL_INTERVAL_MS);
    }
    return "stuck";
  };

  const submit = async () => {
    if (!canSubmit || !walletId || !walletAddress) return;
    setStage({ name: "sending" });
    try {
      const [deposit, startingBalance] = await Promise.all([
        getDepositAddress(walletAddress),
        getArbitrumBalance(walletAddress).catch(() => null),
      ]);
      const txHash = await sendEvmBatch(
        [
          {
            to: BUY_ORIGIN.asset as `0x${string}`,
            data: encodeTransfer(deposit.address, toBaseUnits(amount, BUY_ORIGIN.decimals)),
          },
        ],
        BASE_CHAIN_ID
      );

      setStage({ name: "confirming" });
      const outcome = await waitForCompletion(txHash, startingBalance);
      if (outcome === "stuck") {
        setStage({ name: "stuck", amount });
        onFunded();
        return;
      }

      setStage({ name: "bridging", amount });
      let bridgeResult: BridgeResult;
      try {
        const result = await onBridge(amount);
        bridgeResult = { bridged: result.bridged };
      } catch (error) {
        const belowMinimum = belowBridgeMinimum(error);
        bridgeResult = belowMinimum ? { bridged: false, belowMinimum } : { bridged: false };
      }
      setStage({ name: "done", amount, ...bridgeResult });
      onFunded();
    } catch (error) {
      toast.error(friendlyError(error, "Transfer failed."));
      setStage({ name: "form" });
    }
  };

  const stageMessage: Record<Stage["name"], string> = {
    form: "",
    sending: "Sending…",
    confirming: "Confirming…",
    bridging: "Moving into your perps wallet…",
    done: "",
    stuck: "",
  };

  return (
    <ModalShell open={open} onClose={busy ? () => {} : close} size="lg">
      <div className="p-5 sm:p-6">
        {stage.name === "done" ? (
          <SuccessPanel title="Perps wallet funded" onDone={close}>
            {formatAmount(Number(stage.amount))} USDC has arrived
            {stage.bridged
              ? " and is ready in your perps wallet."
              : stage.belowMinimum
                ? ` — it's sitting safely in your account, but you need at least $${formatAmount(stage.belowMinimum.minUsdc)} total to activate your perps margin (you have $${formatAmount(stage.belowMinimum.haveUsdc)}). Top up a bit more and it activates automatically.`
                : " — it activates as margin automatically the moment a trade needs it."}
          </SuccessPanel>
        ) : stage.name === "stuck" ? (
          <SuccessPanel title="Still on its way" onDone={close}>
            {formatAmount(Number(stage.amount))} USDC left your wallet, but hasn&apos;t finished
            confirming yet. Check your perps wallet balance again shortly.
          </SuccessPanel>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <div className="ws-display text-[18px]">Top up</div>
              <p className="mt-1 text-[12.5px] font-normal text-white/50">
                Signed silently, no popup — moves straight into your perps wallet.
              </p>
            </div>

            {/* The amount is the whole point of this screen — everything else
                (label, balance, presets) stays small and out of its way. */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="ws-display tnum text-[28px] text-white/35">$</span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmount(e.target.value)}
                  placeholder="0"
                  disabled={busy}
                  autoFocus
                  size={Math.max(1, amount.length || 1)}
                  className="ws-display tnum max-w-full bg-transparent text-center text-[64px] leading-none text-white outline-none placeholder:text-white/15 disabled:opacity-60"
                />
              </div>
              <div className="tnum text-[12.5px] font-normal text-white/45">
                {formatAmount(balance)} USDC available
              </div>
              {validAmount && !withinBalance ? (
                <p className="text-down text-[12px] font-normal">
                  Exceeds your available {formatAmount(balance)} USDC.
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-2">
              {PERCENTS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setPercent(pct)}
                  disabled={balance <= 0 || busy}
                  className="tnum cursor-pointer rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-white/65 transition-colors hover:border-white/25 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </button>
              ))}
            </div>

            {!walletId || !walletAddress ? (
              <p className="text-center text-[12.5px] leading-[1.5] font-normal text-white/50">
                Your perps wallet isn&apos;t ready yet — try again in a moment.
              </p>
            ) : null}

            <button
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="text-ink mx-auto flex w-auto cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-8 py-3 font-sans text-[14.5px] font-semibold hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <>
                  <ButtonSpinner />
                  {stageMessage[stage.name]}
                </>
              ) : (
                "Top up"
              )}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
