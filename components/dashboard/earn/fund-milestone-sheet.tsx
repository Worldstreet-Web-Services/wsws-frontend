"use client";

import { useQuery } from "@tanstack/react-query";
import { base } from "viem/chains";
import { ModalShell } from "@/components/ui/modal-shell";
import { AsyncLoading } from "@/components/dashboard/async-state";
import { useFundMilestone } from "@/hooks/use-earn-contracts";
import { useEvmSendBatch } from "@/hooks/use-evm-send";
import { useWallets } from "@privy-io/react-auth";
import { fetchMilestoneEscrowQuote } from "@/lib/earn/api/jobs";
import { buildDepositCalls, type EscrowQuote } from "@/lib/earn/escrow";
import { formatReward } from "@/lib/earn/reward";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { MilestoneEscrowQuote } from "@/lib/earn/api/jobs";

// The milestone quote into the shape buildDepositCalls already speaks. Both
// escrows are the same contract keyed by a different id, so the deposit calls
// are identical — only where the quote comes from differs.
function asDepositQuote(quote: MilestoneEscrowQuote): EscrowQuote {
  return {
    escrowAddress: quote.escrowAddress,
    listingIdBytes32: quote.listingIdBytes32,
    tokenAddress: quote.tokenAddress,
    tokenSymbol: quote.amount.token,
    decimals: quote.amount.decimals,
    amount: Number(quote.amount.minor) / 10 ** quote.amount.decimals,
    amountMinor: quote.amount.minor,
    refundableAfter: quote.refundableAfter,
    alreadyFunded: quote.alreadyFunded,
    depositedOnChain: quote.depositedOnChain,
  };
}

interface FundMilestoneSheetProps {
  open: boolean;
  onClose: () => void;
  contractId: string;
  milestoneId: string;
  milestoneTitle: string;
}

// Moving one milestone's amount into escrow.
//
// Same one-tap path as a bounty reward: the sponsor's own wallet approves and
// deposits as a single sponsored batch on Base, then the transaction is handed
// to the service, which reads it back off chain before it will call the
// milestone funded. The service never holds the money and never sees a key.
export function FundMilestoneSheet({
  open,
  onClose,
  contractId,
  milestoneId,
  milestoneTitle,
}: FundMilestoneSheetProps) {
  const fund = useFundMilestone(contractId);
  const sendBatch = useEvmSendBatch();
  const { wallets } = useWallets();
  const walletAddress = wallets.find((w) => w.walletClientType === "privy")?.address;

  // Fetched only while the sheet is open, and never cached: the amount and the
  // refund deadline are both derived from now, so a stale quote would be
  // rejected by the contract.
  const quoteQuery = useQuery({
    queryKey: ["earn", "milestone-escrow-quote", milestoneId, walletAddress],
    queryFn: () => fetchMilestoneEscrowQuote(milestoneId, walletAddress),
    enabled: open && !!walletAddress,
    gcTime: 0,
    staleTime: 0,
  });

  const quote = quoteQuery.data ?? null;

  async function onDeposit() {
    if (!quote) return;

    const alreadyPaid = quote.depositedOnChain;
    const id = toast.loading(alreadyPaid ? "Recording your deposit…" : "Confirm in your wallet…");
    try {
      // A deposit that is already on chain is not paid for twice: the contract
      // refuses a second one, and the service records what it can already see.
      const txId = alreadyPaid
        ? ""
        : await sendBatch(buildDepositCalls(asDepositQuote(quote)), base.id);

      if (!alreadyPaid) toast.loading("Checking the deposit on chain…", { id });
      await fund.mutateAsync({ id: milestoneId, input: { txId, walletAddress } });

      toast.success("Milestone funded. They can start work.", { id });
      onClose();
    } catch (error) {
      toast.error(friendlyError(error, "That deposit didn't go through."), { id });
    }
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="ws-display text-[18px] text-white">Fund this milestone</h2>
          <p className="mt-1 truncate font-sans text-[12.5px] font-normal text-white/50">
            {milestoneTitle}
          </p>
        </div>

        {!walletAddress ? (
          <p className="ws-inset rounded-[14px] px-4 py-3 font-sans text-[12.5px] font-normal text-white/60">
            Waiting for your wallet…
          </p>
        ) : quoteQuery.isLoading || quoteQuery.isPending ? (
          <AsyncLoading label="Working out what to deposit" rows={2} />
        ) : quoteQuery.error || !quote ? (
          <p className="ws-inset rounded-[14px] px-4 py-3 font-sans text-[12.5px] font-normal text-white/60">
            {friendlyError(quoteQuery.error, "Couldn't work out what to deposit.")}
          </p>
        ) : quote.alreadyFunded ? (
          <p className="ws-inset rounded-[14px] px-4 py-3 font-sans text-[12.5px] font-normal text-white/60">
            This milestone is already funded.
          </p>
        ) : (
          <>
            <div className="ws-inset rounded-[14px] px-4 py-3">
              <div className="font-sans text-[12px] font-normal text-white/45">
                Moving to escrow
              </div>
              <div className="ws-display tnum mt-0.5 text-[18px] text-white">
                {formatReward(quote.amount)}
              </div>
              {quote.depositedOnChain ? (
                <div className="text-up mt-1 font-sans text-[11.5px] font-medium">
                  Already deposited. This just records it.
                </div>
              ) : null}
            </div>

            <p className="font-sans text-[11.5px] font-normal text-white/35">
              Sent from your own wallet on Base. Gas is covered, and it only leaves escrow when you
              approve and release this milestone.
            </p>
          </>
        )}

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ws-inset flex-1 cursor-pointer rounded-full px-4 py-2.5 font-sans text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onDeposit()}
            disabled={fund.isPending || !quote || quote.alreadyFunded}
            className="bg-accent text-ink flex-1 cursor-pointer rounded-full px-4 py-2.5 font-sans text-[13px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {fund.isPending
              ? "Confirming…"
              : quote?.depositedOnChain
                ? "Record deposit"
                : "Deposit"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
