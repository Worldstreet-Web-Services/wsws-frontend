"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { usePortfolio } from "@/hooks/use-portfolio";
import {
  useCreateWithdrawal,
  useDepositToCashier,
  useConfirmDeposit,
  usePendingDeposit,
  usePlayerBalance,
  useCashierConfig,
} from "@/hooks/use-chess-cashier";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";
import {
  formatUsdc,
  formatUsdcWithSymbol,
  isTxHash,
  requireUsdc,
  USDC_DECIMALS,
} from "@/lib/casino/cashier-money";
import { toBaseUnits } from "@/lib/trade/math";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";

const DECIMAL = /^\d*\.?\d*$/;

// The cashier settles on Base, same as the rest of the casino.
const EXPLORER_TX_URL = "https://basescan.org/tx/";

const INPUT =
  "ws-inset focus:border-accent/50 tnum w-full rounded-[12px] px-3.5 py-3 font-sans text-[18px] text-white outline-none placeholder:text-white/25";

type Tab = "deposit" | "withdraw";

// Funding and cashing out a chess balance.
//
// The balance is held by the chess service, not on-chain and not in the
// player's own wallet, so every screen here says so rather than letting it read
// as another wallet balance.
export function CashierSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("deposit");
  const { config, enabled } = useCashierConfig();

  return (
    <ModalShell open={open} onClose={onClose} contentKey={tab}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="ws-display text-[18px] text-white">Chess balance</h2>
          <p className="mt-1 font-sans text-[12.5px] font-normal text-white/50">
            Held by the chess service to settle staked games. Move money in to play, out whenever it
            isn&apos;t committed.
          </p>
        </div>

        {!enabled || !config ? (
          <div className="ws-inset px-4 py-6 text-center font-sans text-[13px] font-normal text-white/55">
            Staked chess isn&apos;t switched on yet.
          </div>
        ) : (
          <>
            <BalanceRow />
            <PendingDepositBanner />

            <div className="ws-inset flex gap-2 rounded-full p-1">
              {(["deposit", "withdraw"] as const).map((id) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 cursor-pointer rounded-full py-2.5 font-sans text-[13px] font-semibold capitalize transition-colors ${
                    tab === id ? "text-ink bg-white" : "text-white/50"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>

            {tab === "deposit" ? <DepositForm onDone={onClose} /> : <WithdrawForm />}
          </>
        )}
      </div>
    </ModalShell>
  );
}

function BalanceRow() {
  const { availableMicro, lockedMicro, isLoading } = usePlayerBalance();

  return (
    <div className="ws-card flex items-center justify-between gap-4 rounded-[14px] px-4 py-3">
      <div>
        <div className="font-sans text-[11.5px] font-normal text-white/45">Available</div>
        <div className="ws-display tnum text-[20px] text-white">
          {isLoading ? "…" : formatUsdcWithSymbol(availableMicro)}
        </div>
      </div>
      {lockedMicro && lockedMicro > 0n ? (
        <div className="text-right">
          <div className="font-sans text-[11.5px] font-normal text-white/45">In play</div>
          <div className="tnum font-sans text-[13px] font-medium text-white/70">
            {formatUsdc(lockedMicro)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// A transfer that reached the service's wallet but was never credited. Without
// this the player has simply lost the money as far as the UI is concerned.
function PendingDepositBanner() {
  const { pending, dismiss } = usePendingDeposit();
  const { confirm, confirming } = useConfirmDeposit();
  const [done, setDone] = useState(false);

  if (!pending || done) return null;

  const onFinish = async () => {
    const id = toast.loading("Crediting your deposit…");
    try {
      await confirm(pending.txHash);
      setDone(true);
      toast.success("Deposit credited.", { id });
    } catch (e) {
      toast.error(friendlyError(e, "That deposit still couldn't be credited."), { id });
    }
  };

  return (
    <div className="border-accent/35 rounded-[14px] border bg-white/4 px-4 py-3.5">
      <div className="font-sans text-[12.5px] font-medium text-white/85">
        A deposit is waiting to be credited
      </div>
      <div className="mt-1 font-sans text-[12px] font-normal text-white/55">
        Your transfer went through but we couldn&apos;t tell the service about it. Nothing is lost,
        it just needs finishing.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => void onFinish()}
          disabled={confirming}
          className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold disabled:opacity-50"
        >
          {confirming ? "Crediting…" : "Finish crediting"}
        </button>
        <a
          href={`${EXPLORER_TX_URL}${pending.txHash}`}
          target="_blank"
          rel="noreferrer noopener"
          className="cursor-pointer rounded-full border border-white/15 px-4 py-2 font-sans text-[12.5px] font-medium text-white/60 transition-colors hover:text-white"
        >
          View transaction
        </a>
        <button
          onClick={() => {
            dismiss();
            setDone(true);
          }}
          className="cursor-pointer px-2 font-sans text-[12.5px] font-normal text-white/40 transition-colors hover:text-white/70"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function DepositForm({ onDone }: { onDone: () => void }) {
  const { tokens } = usePortfolio();
  const { deposit, depositing } = useDepositToCashier();
  const { confirm, confirming } = useConfirmDeposit();
  const [amount, setAmount] = useState("");
  const [manualHash, setManualHash] = useState("");
  const [showManual, setShowManual] = useState(false);

  // What the player holds in their own wallet, which is what they can move in.
  const holding = tokens.find(
    (t) => t.network === "base-mainnet" && t.symbol.toUpperCase() === "USDC"
  );
  const walletMicro = toBaseUnits(String(holding?.balance ?? 0), USDC_DECIMALS);

  let parsed: bigint | null = null;
  let amountError: string | null = null;
  if (amount.trim()) {
    try {
      parsed = requireUsdc(amount);
      if (parsed > walletMicro) amountError = "More than your wallet holds.";
    } catch (e) {
      amountError = (e as Error).message;
    }
  }

  const onDeposit = async () => {
    if (!parsed || amountError) return;
    const id = toast.loading("Moving your money in…");
    try {
      await deposit(parsed);
      toast.success("Deposit credited.", { id });
      setAmount("");
      onDone();
    } catch (e) {
      toast.error(friendlyError(e, "That deposit didn't go through."), { id });
    }
  };

  const onManual = async () => {
    const id = toast.loading("Crediting that transaction…");
    try {
      await confirm(manualHash.trim());
      toast.success("Deposit credited.", { id });
      setManualHash("");
      setShowManual(false);
    } catch (e) {
      toast.error(friendlyError(e, "That transaction couldn't be credited."), { id });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-sans text-[12.5px] font-medium text-white/70">Amount</span>
          <button
            onClick={() => setAmount(formatUsdc(walletMicro).replace(/,/g, ""))}
            className="cursor-pointer font-sans text-[12px] font-medium text-white/45 transition-colors hover:text-white"
          >
            Wallet: {formatUsdc(walletMicro)} USDC
          </button>
        </div>
        <input
          value={amount}
          onChange={(e) => {
            if (e.target.value === "" || DECIMAL.test(e.target.value)) setAmount(e.target.value);
          }}
          inputMode="decimal"
          placeholder="0"
          aria-label="Deposit amount"
          aria-invalid={!!amountError}
          className={INPUT}
        />
        {amountError ? (
          <div role="alert" className="text-down mt-1.5 font-sans text-[12px] font-normal">
            {amountError}
          </div>
        ) : null}
      </div>

      <button
        onClick={() => void onDeposit()}
        disabled={!parsed || !!amountError || depositing}
        className="bg-accent text-ink cursor-pointer rounded-full px-5 py-3 font-sans text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        {depositing ? "Moving in…" : "Add to chess balance"}
      </button>

      {showManual ? (
        <div className="ws-inset flex flex-col gap-2 rounded-[12px] p-3">
          <label
            htmlFor="chess-tx-hash"
            className="font-sans text-[12px] font-medium text-white/60"
          >
            Transaction hash
          </label>
          <input
            id="chess-tx-hash"
            value={manualHash}
            onChange={(e) => setManualHash(e.target.value)}
            placeholder="0x…"
            className="ws-inset focus:border-accent/50 w-full rounded-[10px] px-3 py-2 font-sans text-[12.5px] text-white outline-none"
          />
          <button
            onClick={() => void onManual()}
            disabled={!isTxHash(manualHash) || confirming}
            className="cursor-pointer rounded-full border border-white/15 px-4 py-2 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white disabled:opacity-40"
          >
            {confirming ? "Crediting…" : "Credit this transaction"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowManual(true)}
          className="cursor-pointer font-sans text-[12px] font-normal text-white/40 transition-colors hover:text-white/70"
        >
          Already sent USDC? Credit it by transaction hash
        </button>
      )}
    </div>
  );
}

function WithdrawForm() {
  const wallet = useCasinoWallet();
  const { availableMicro } = usePlayerBalance();
  const { withdraw, withdrawing } = useCreateWithdrawal();
  const [amount, setAmount] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const available = availableMicro ?? 0n;

  let parsed: bigint | null = null;
  let amountError: string | null = null;
  if (amount.trim()) {
    try {
      parsed = requireUsdc(amount);
      // Checked against available, not total: money locked in a game in
      // progress is not the player's to take back yet.
      if (parsed > available) amountError = "More than your available balance.";
    } catch (e) {
      amountError = (e as Error).message;
    }
  }

  const onWithdraw = async () => {
    if (!parsed || amountError) return;
    const id = toast.loading("Sending your money out…");
    try {
      const result = await withdraw({ amountMicro: parsed });
      setSentTo(result.txHash);
      setAmount("");
      toast.success("Withdrawal sent.", { id });
    } catch (e) {
      toast.error(friendlyError(e, "That withdrawal didn't go through."), { id });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-sans text-[12.5px] font-medium text-white/70">Amount</span>
          <button
            onClick={() => setAmount(formatUsdc(available).replace(/,/g, ""))}
            className="cursor-pointer font-sans text-[12px] font-medium text-white/45 transition-colors hover:text-white"
          >
            Available: {formatUsdc(available)} USDC
          </button>
        </div>
        <input
          value={amount}
          onChange={(e) => {
            if (e.target.value === "" || DECIMAL.test(e.target.value)) setAmount(e.target.value);
          }}
          inputMode="decimal"
          placeholder="0"
          aria-label="Withdrawal amount"
          aria-invalid={!!amountError}
          className={INPUT}
        />
        {amountError ? (
          <div role="alert" className="text-down mt-1.5 font-sans text-[12px] font-normal">
            {amountError}
          </div>
        ) : null}
      </div>

      <div className="font-sans text-[12px] font-normal text-white/45">
        Sent to your own wallet
        {wallet.address ? ` (${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)})` : ""}.
      </div>

      <button
        onClick={() => void onWithdraw()}
        disabled={!parsed || !!amountError || withdrawing}
        className="bg-accent text-ink cursor-pointer rounded-full px-5 py-3 font-sans text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        {withdrawing ? "Sending…" : "Withdraw"}
      </button>

      {sentTo ? (
        <a
          href={`${EXPLORER_TX_URL}${sentTo}`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-center font-sans text-[12.5px] font-medium text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
        >
          View your withdrawal
        </a>
      ) : null}
    </div>
  );
}
