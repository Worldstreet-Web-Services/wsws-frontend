"use client";

// React Query bindings for everything downstream of a hire: the contract, its
// milestones and their escrow, hourly time entries, disputes and ratings. The
// job post and proposal side lives in use-earn-jobs.ts.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveMilestone,
  approveTimeEntry,
  billTimeEntries,
  completeContract,
  createMilestone,
  createRating,
  createTimeEntry,
  fetchContract,
  fetchMilestoneClaim,
  fetchMilestoneEscrowStatus,
  fetchMilestoneRefundQuote,
  fetchMilestones,
  fetchMyContracts,
  fetchRatingsForUser,
  fetchTimeEntries,
  fundMilestone,
  raiseDispute,
  refundMilestone,
  rejectTimeEntry,
  releaseMilestone,
  resolveDispute,
  submitMilestone,
  type BillTimeEntriesInput,
  type CreateMilestoneInput,
  type CreateRatingInput,
  type CreateTimeEntryInput,
  type FundMilestoneInput,
  type RaiseDisputeInput,
  type ResolveDisputeInput,
  type SubmitMilestoneInput,
} from "@/lib/earn/api/jobs";

export const CONTRACT_KEYS = {
  root: ["earn", "contracts"] as const,
  mine: ["earn", "contracts", "mine"] as const,
  detail: (id: string) => ["earn", "contracts", "detail", id] as const,
  milestones: (contractId: string) => ["earn", "contracts", "milestones", contractId] as const,
  escrowStatus: (milestoneId: string) =>
    ["earn", "contracts", "escrow-status", milestoneId] as const,
  claim: (milestoneId: string) => ["earn", "contracts", "claim", milestoneId] as const,
  refundQuote: (milestoneId: string) => ["earn", "contracts", "refund-quote", milestoneId] as const,
  timeEntries: (contractId: string) => ["earn", "contracts", "time-entries", contractId] as const,
  ratingsForUser: (userId: string) => ["earn", "ratings", "for-user", userId] as const,
};

// Both sides the caller has. The service splits these by role rather than
// returning a flat list, since the same person can be a freelancer on one
// contract and the sponsor on another.
export function useMyContracts() {
  const query = useQuery({ queryKey: CONTRACT_KEYS.mine, queryFn: fetchMyContracts });
  return {
    asFreelancer: query.data?.asFreelancer ?? [],
    asSponsor: query.data?.asSponsor ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useContract(id: string | null) {
  const query = useQuery({
    queryKey: CONTRACT_KEYS.detail(id ?? "none"),
    queryFn: () => fetchContract(id as string),
    enabled: !!id,
  });

  return { contract: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

// From ACTIVE only, and it has to happen before either side can rate.
export function useCompleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeContract(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.detail(id) });
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.mine });
    },
  });
}

// ----- Milestones -----

export function useMilestones(contractId: string | null) {
  const query = useQuery({
    queryKey: CONTRACT_KEYS.milestones(contractId ?? "none"),
    queryFn: () => fetchMilestones(contractId as string),
    enabled: !!contractId,
  });

  return { milestones: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) => createMilestone(input),
    onSuccess: (milestone) => {
      void queryClient.invalidateQueries({
        queryKey: CONTRACT_KEYS.milestones(milestone.contractId),
      });
    },
  });
}

// What escrow holds for one milestone, read off the contract rather than our
// own record. Not polled by default: the caller decides, since a sponsor
// watching a deposit land wants a different cadence than a freelancer glancing
// at a funded milestone.
export function useMilestoneEscrowStatus(milestoneId: string | null) {
  const query = useQuery({
    queryKey: CONTRACT_KEYS.escrowStatus(milestoneId ?? "none"),
    queryFn: () => fetchMilestoneEscrowStatus(milestoneId as string),
    enabled: !!milestoneId,
  });

  return { status: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

// Records a deposit the sponsor's own wallet already sent. Only the tx hash
// goes up; the service reads amount/token/recipient back off Base itself.
export function useFundMilestone(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FundMilestoneInput }) =>
      fundMilestone(id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.milestones(contractId) });
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.escrowStatus(id) });
    },
  });
}

// Freelancer only, from FUNDED.
export function useSubmitMilestone(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubmitMilestoneInput }) =>
      submitMilestone(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.milestones(contractId) });
    },
  });
}

// From SUBMITTED, and it fails outright while the contract is under dispute.
export function useApproveMilestone(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveMilestone(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.milestones(contractId) });
    },
  });
}

// Pays the freelancer's on-chain wallet. Idempotent, so a retry is safe — but
// check the result's `released`, not just the absence of a thrown error: a
// no-op (already-released, not-approved, not-funded) still resolves.
export function useReleaseMilestone(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releaseMilestone(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.milestones(contractId) });
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.escrowStatus(id) });
    },
  });
}

// Whether the contract will let the sponsor reclaim this milestone yet, and
// what their wallet needs to call if so. Read before offering a refund at
// all: the on-chain call reverts before `refundableAfter`, and nothing —
// including a dispute resolved for the client — opens that window early.
export function useMilestoneRefundQuote(milestoneId: string | null, enabled = true) {
  const query = useQuery({
    queryKey: CONTRACT_KEYS.refundQuote(milestoneId ?? "none"),
    queryFn: () => fetchMilestoneRefundQuote(milestoneId as string),
    enabled: !!milestoneId && enabled,
  });

  return { quote: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

// Records a refund the sponsor's own wallet already executed. The money has
// already moved by the time this runs, so it is not gated on the contract
// being out of dispute — refusing to record it would only desync our data.
export function useRefundMilestone(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, txId }: { id: string; txId: string }) => refundMilestone(id, txId),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.milestones(contractId) });
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.escrowStatus(id) });
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.refundQuote(id) });
    },
  });
}

// What the earner can withdraw from escrow for this milestone. The only
// read a freelancer has into the money — escrow-status is sponsor-auth — so
// it is what decides whether to offer a claim at all.
export function useMilestoneClaim(milestoneId: string | null, enabled = true) {
  const query = useQuery({
    queryKey: CONTRACT_KEYS.claim(milestoneId ?? "none"),
    queryFn: () => fetchMilestoneClaim(milestoneId as string),
    enabled: !!milestoneId && enabled,
  });

  return { claim: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

// ----- Time entries (hourly) -----

export function useTimeEntries(contractId: string | null) {
  const query = useQuery({
    queryKey: CONTRACT_KEYS.timeEntries(contractId ?? "none"),
    queryFn: () => fetchTimeEntries(contractId as string),
    enabled: !!contractId,
  });

  return { entries: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

// Freelancer only, on an ACTIVE HOURLY contract.
export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeEntryInput) => createTimeEntry(input),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.timeEntries(entry.contractId) });
    },
  });
}

export function useApproveTimeEntry(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveTimeEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.timeEntries(contractId) });
    },
  });
}

export function useRejectTimeEntry(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => rejectTimeEntry(id, { note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.timeEntries(contractId) });
    },
  });
}

// Rolls approved, unbilled entries in a period into one new milestone and
// marks them BILLED — so both lists change. An explicit sponsor action: there
// is no scheduler in the service to do this periodically.
export function useBillTimeEntries(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BillTimeEntriesInput) => billTimeEntries(contractId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.timeEntries(contractId) });
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.milestones(contractId) });
    },
  });
}

// ----- Disputes -----

// Raising one freezes milestone approve/release and billing on the contract,
// so everything under it is stale afterwards.
export function useRaiseDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RaiseDisputeInput) => raiseDispute(input),
    onSuccess: (dispute) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.detail(dispute.contractId) });
      void queryClient.invalidateQueries({
        queryKey: CONTRACT_KEYS.milestones(dispute.contractId),
      });
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.mine });
    },
  });
}

// Platform admin only (role GOD). Unfreezes the contract; it does not itself
// move any money — whoever resolves it still has to release or refund the
// milestone that fits the outcome.
export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveDisputeInput }) =>
      resolveDispute(id, input),
    onSuccess: (dispute) => {
      if (!dispute) return;
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.detail(dispute.contractId) });
      void queryClient.invalidateQueries({
        queryKey: CONTRACT_KEYS.milestones(dispute.contractId),
      });
    },
  });
}

// ----- Ratings -----

// A public profile display, so this works signed-out.
export function useRatingsForUser(userId: string | null) {
  const query = useQuery({
    queryKey: CONTRACT_KEYS.ratingsForUser(userId ?? "none"),
    queryFn: () => fetchRatingsForUser(userId as string),
    enabled: !!userId,
  });

  return { ratings: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

// The contract must be COMPLETED first, and one rating per rater per contract.
// The ratee is inferred server-side, never sent from here.
export function useCreateRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRatingInput) => createRating(input),
    onSuccess: (rating) => {
      void queryClient.invalidateQueries({ queryKey: CONTRACT_KEYS.detail(rating.contractId) });
      void queryClient.invalidateQueries({
        queryKey: CONTRACT_KEYS.ratingsForUser(rating.rateeId),
      });
    },
  });
}
