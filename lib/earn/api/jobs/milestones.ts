"use client";

// Fixed-price payout units (and the target hourly billing rolls up into —
// see time-entries.ts's billTimeEntries). Each milestone is its own on-chain
// escrow deposit, the same ListingEscrow contract Bounty rewards use, keyed
// by the milestone's own id. The backend never holds funds or submits the
// deposit itself: escrow-quote says what to send and where, the sponsor's own
// wallet signs and sends it, then fund() records the resulting tx hash for
// the backend to verify. Release pays the freelancer's on-chain wallet once a
// milestone is APPROVED.

import { earnAuthedGet, earnPost } from "@/lib/earn/api/client";
import {
  createMilestonePayload,
  fundMilestonePayload,
  submitMilestonePayload,
  toMilestone,
  toMilestoneEscrowQuote,
  toMilestoneEscrowStatus,
  toMilestoneClaim,
  toMilestoneRefundQuote,
  toMilestoneReleaseResult,
  toMilestones,
  type FundMilestoneInput,
  type MilestoneEscrowQuoteWire,
  type MilestoneEscrowStatusWire,
  type MilestoneClaimWire,
  type MilestoneRefundQuoteWire,
  type MilestoneReleaseResultWire,
  type MilestoneWire,
} from "@/lib/earn/api/jobs/wire";
import type {
  CreateMilestoneInput,
  Milestone,
  MilestoneEscrowQuote,
  MilestoneEscrowStatus,
  MilestoneClaim,
  MilestoneRefundQuote,
  MilestoneReleaseResult,
  SubmitMilestoneInput,
} from "@/lib/earn/api/jobs/types";

// Contract must be ACTIVE.
export async function createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
  const data = await earnPost<MilestoneWire>("/milestones", createMilestonePayload(input));
  const milestone = toMilestone(data);
  if (!milestone) throw new Error("That milestone could not be read back.");
  return milestone;
}

// Either party to the contract may read its milestones. `take` is the only
// paging lever the service offers (no skip or cursor).
export async function fetchMilestones(contractId: string, take?: number): Promise<Milestone[]> {
  const data = await earnAuthedGet<MilestoneWire[] | { milestones?: MilestoneWire[] } | null>(
    "/milestones",
    { contractId, ...(take != null ? { take } : {}) }
  );
  return toMilestones(Array.isArray(data) ? data : (data?.milestones ?? []));
}

// `walletAddress` is a fallback for a sponsor with no wallet on file yet.
export async function fetchMilestoneEscrowQuote(
  id: string,
  walletAddress?: string
): Promise<MilestoneEscrowQuote> {
  const data = await earnAuthedGet<MilestoneEscrowQuoteWire>(
    `/milestones/${encodeURIComponent(id)}/escrow-quote`,
    walletAddress ? { walletAddress } : undefined
  );
  const quote = toMilestoneEscrowQuote(data);
  if (!quote) throw new Error("Couldn't work out what to deposit.");
  return quote;
}

export async function fetchMilestoneEscrowStatus(id: string): Promise<MilestoneEscrowStatus> {
  const data = await earnAuthedGet<MilestoneEscrowStatusWire>(
    `/milestones/${encodeURIComponent(id)}/escrow-status`
  );
  return toMilestoneEscrowStatus(data);
}

// Only the tx hash is sent — the service reads amount/token/recipient back
// off Base itself, so nothing here is taken on trust.
export async function fundMilestone(
  id: string,
  input: FundMilestoneInput
): Promise<{ escrowStatus: string; escrowTxId: string | null; amount: string | null }> {
  const data = await earnPost<{ escrowStatus?: string; escrowTxId?: string; amount?: string }>(
    `/milestones/${encodeURIComponent(id)}/fund`,
    fundMilestonePayload(input)
  );
  return {
    escrowStatus: data?.escrowStatus ?? "UNFUNDED",
    escrowTxId: data?.escrowTxId ?? null,
    amount: data?.amount ?? null,
  };
}

// Freelancer only, from FUNDED.
export async function submitMilestone(
  id: string,
  input: SubmitMilestoneInput
): Promise<Milestone | null> {
  const data = await earnPost<MilestoneWire>(
    `/milestones/${encodeURIComponent(id)}/submit`,
    submitMilestonePayload(input)
  );
  return toMilestone(data);
}

// From SUBMITTED; fails if the contract is under dispute.
export async function approveMilestone(id: string): Promise<Milestone | null> {
  const data = await earnPost<MilestoneWire>(`/milestones/${encodeURIComponent(id)}/approve`);
  return toMilestone(data);
}

// Idempotent: safe to retry. Check `released`, not just a lack of a thrown
// error — a no-op retry (e.g. reason: "already-released") still resolves.
export async function releaseMilestone(id: string): Promise<MilestoneReleaseResult> {
  const data = await earnPost<MilestoneReleaseResultWire>(
    `/milestones/${encodeURIComponent(id)}/release`
  );
  return toMilestoneReleaseResult(data);
}

// Read this before prompting a wallet signature: refund() reverts on chain if
// called before `refundableAfter`, and nothing can make it eligible sooner —
// not even a dispute resolved for the client.
export async function fetchMilestoneRefundQuote(id: string): Promise<MilestoneRefundQuote> {
  const data = await earnAuthedGet<MilestoneRefundQuoteWire>(
    `/milestones/${encodeURIComponent(id)}/refund-quote`
  );
  const quote = toMilestoneRefundQuote(data);
  if (!quote) throw new Error("Couldn't work out whether this can be refunded yet.");
  return quote;
}

// Records a refund the sponsor's own wallet already executed against the
// contract. Deliberately not blocked while the contract is under dispute: by
// the time this is called the money has already moved on chain, and refusing
// to record it would only make our own data wrong.
export async function refundMilestone(id: string, txId: string): Promise<Milestone | null> {
  const data = await earnPost<MilestoneWire>(`/milestones/${encodeURIComponent(id)}/refund`, {
    txId,
  });
  return toMilestone(data);
}

// What the earner can pull out of escrow, and where from. Read-only: the
// withdraw itself is signed by their own wallet, since the backend holds no
// key that could move it for them.
export async function fetchMilestoneClaim(id: string): Promise<MilestoneClaim> {
  const data = await earnAuthedGet<MilestoneClaimWire>(
    `/milestones/${encodeURIComponent(id)}/claim`
  );
  const claim = toMilestoneClaim(data);
  if (!claim) throw new Error("Couldn't work out what there is to claim.");
  return claim;
}
