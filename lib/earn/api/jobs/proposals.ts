"use client";

// Freelancer bids on a job post, and the sponsor's hire action. Hiring is the
// pivot: it accepts one proposal, auto-rejects every other open one on the
// same job, closes the job post, and mints the Contract.

import { earnAuthedGet, earnPost } from "@/lib/earn/api/client";
import {
  createProposalPayload,
  toContractDetail,
  toMyProposal,
  toMyProposals,
  toProposalWithFreelancer,
  toProposalsWithFreelancer,
  type ContractWire,
  type ProposalWire,
} from "@/lib/earn/api/jobs/wire";
import type {
  ContractDetail,
  CreateProposalInput,
  MyProposal,
  ProposalWithFreelancer,
} from "@/lib/earn/api/jobs/types";

// One *active* proposal per freelancer per job post: once a previous one is
// withdrawn or rejected, a new one is accepted. The job must be OPEN.
export async function createProposal(input: CreateProposalInput): Promise<MyProposal> {
  const data = await earnPost<ProposalWire>("/proposals", createProposalPayload(input));
  const proposal = toMyProposal(data);
  if (!proposal) throw new Error("That proposal could not be read back.");
  return proposal;
}

// From SUBMITTED/SHORTLISTED only, must be your proposal.
export async function withdrawProposal(id: string): Promise<void> {
  await earnPost<unknown>(`/proposals/${encodeURIComponent(id)}/withdraw`);
}

// Every proposal the caller has submitted, with the job's title/slug/status.
export async function fetchMyProposals(): Promise<MyProposal[]> {
  const data = await earnAuthedGet<ProposalWire[] | { proposals?: ProposalWire[] } | null>(
    "/proposals/mine"
  );
  return toMyProposals(Array.isArray(data) ? data : (data?.proposals ?? []));
}

// A sponsor reviewing bids on their own job post. `take` is the only paging
// lever the service offers (no skip or cursor).
export async function fetchProposalsForJob(
  jobPostId: string,
  take?: number
): Promise<ProposalWithFreelancer[]> {
  const data = await earnAuthedGet<ProposalWire[] | { proposals?: ProposalWire[] } | null>(
    `/proposals/for-job/${encodeURIComponent(jobPostId)}`,
    take != null ? { take } : undefined
  );
  return toProposalsWithFreelancer(Array.isArray(data) ? data : (data?.proposals ?? []));
}

// From SUBMITTED only.
export async function shortlistProposal(id: string): Promise<ProposalWithFreelancer | null> {
  const data = await earnPost<ProposalWire>(`/proposals/${encodeURIComponent(id)}/shortlist`);
  return toProposalWithFreelancer(data);
}

// The pivot action: accepts this proposal, auto-rejects every other open one
// on the job, closes the job to new proposals, and creates the Contract.
// Comes back enriched with the job title and the freelancer's wallet, so the
// contract screen renders without a refetch straight after hiring.
export async function hireProposal(id: string): Promise<ContractDetail> {
  const data = await earnPost<ContractWire>(`/proposals/${encodeURIComponent(id)}/hire`);
  const contract = toContractDetail(data);
  if (!contract) throw new Error("That hire could not be read back.");
  return contract;
}
