// Domain types for the Jobs domain (Upwork-style: post -> propose -> hire ->
// contract -> milestone/hourly escrow payouts -> optional dispute -> ratings).
// A parallel system to Bounties (lib/earn/api/types.ts) — nothing here reads
// or writes a Bounty listing/submission, and nothing there reads or writes a
// job post/proposal/contract. These are our types, not the wire format: every
// response passes through a normalizer in wire.ts before a component sees it.
//
// Every money field (proposedAmount, agreedAmount, a milestone's amount) is a
// RewardAmount, the same exact-minor-unit representation Bounty rewards use
// (lib/earn/api/types.ts) — money is never a float on this platform. Hours
// logged on a TimeEntry are a plain number: a quantity of work, not an asset
// amount, so bigint precision buys nothing there.

import type { RewardAmount } from "@/lib/earn/api/types";

export type JobBudgetType = "FIXED" | "HOURLY";

export type JobPostStatus = "DRAFT" | "OPEN" | "HIRED" | "CLOSED" | "CANCELLED";

export type ProposalStatus = "SUBMITTED" | "SHORTLISTED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type ContractStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED";

export type MilestoneStatus =
  "PENDING" | "FUNDED" | "SUBMITTED" | "APPROVED" | "RELEASED" | "DISPUTED" | "REFUNDED";

// Modeled even though there is no refund call anywhere in this codebase yet
// (Bounty escrow doesn't have one either) — the field exists on the wire, but
// no UI should be built against it landing here until a refund endpoint ships.
export type EscrowStatus = "UNFUNDED" | "FUNDED" | "RELEASED" | "REFUNDED";

export type TimeEntryStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "BILLED";

export type DisputeStatus = "OPEN" | "RESOLVED";

export type DisputeOutcome = "RESOLVED_CLIENT" | "RESOLVED_FREELANCER" | "RESOLVED_SPLIT";

export interface JobSkillGroup {
  skills: string;
  subskills: string[];
}

export interface JobPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  sponsorId: string;
  pocId: string | null;
  skills: JobSkillGroup[];
  region: string | null;
  budgetType: JobBudgetType;
  // Fixed-price range. Null on an HOURLY post.
  minBudget: RewardAmount | null;
  maxBudget: RewardAmount | null;
  // Only set on an HOURLY post — the rate proposals are expected to quote against.
  hourlyRate: RewardAmount | null;
  token: string;
  // Optional banner for the listing card and header. Separate from the
  // sponsor org's own logo.
  coverImage: string | null;
  status: JobPostStatus;
  isPublished: boolean;
  publishedAt: string | null;
  deadline: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DraftJobPostInput {
  // Included to update an existing draft (must still be DRAFT, must be yours);
  // omitted to create a new one.
  id?: string;
  title: string;
  slug: string;
  description: string;
  skills?: JobSkillGroup[];
  region?: string;
  budgetType: JobBudgetType;
  minBudget?: number;
  maxBudget?: number;
  // Required when budgetType is HOURLY.
  hourlyRate?: number;
  token?: string;
  // The public gateway-backed URL from /image/complete's recommendedUrl —
  // never the presigned S3 URL, whose bucket is private and unviewable.
  coverImage?: string;
  // ISO datetime.
  deadline?: string;
}

export interface Proposal {
  id: string;
  jobPostId: string;
  freelancerId: string;
  coverLetter: string;
  proposedAmount: RewardAmount | null;
  proposedDuration: string | null;
  status: ProposalStatus;
  attachments: string[];
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET /proposals/mine — every proposal the caller submitted, enough of the
// job post to render a row and link back to it.
export interface MyProposal extends Proposal {
  jobPost: { title: string; slug: string; status: JobPostStatus } | null;
}

// GET /proposals/for-job/:jobPostId — a sponsor reviewing bids on their own post.
export interface ProposalWithFreelancer extends Proposal {
  freelancer: { username: string; photo: string | null; walletAddress: string | null } | null;
}

export interface CreateProposalInput {
  jobPostId: string;
  coverLetter: string;
  proposedAmount: number;
  proposedDuration?: string;
  attachments?: string[];
}

export interface Contract {
  id: string;
  jobPostId: string;
  proposalId: string;
  sponsorId: string;
  freelancerId: string;
  budgetType: JobBudgetType;
  // The hired proposal's amount. On an HOURLY contract this doubles as the
  // hourly rate — Contract has no separate hourlyRate field.
  agreedAmount: RewardAmount | null;
  status: ContractStatus;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET /contracts/:id and POST /contracts/:id/complete share this enrichment.
export interface ContractDetail extends Contract {
  jobPost: { title: string; slug: string } | null;
  freelancer: { username: string; walletAddress: string | null } | null;
}

// GET /contracts/mine — jobPost only, no freelancer, and split by the
// caller's side rather than a flat list.
export interface MyContract extends Contract {
  jobPost: { title: string; slug: string } | null;
}

export interface MyContracts {
  asFreelancer: MyContract[];
  asSponsor: MyContract[];
}

export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  description: string | null;
  amount: RewardAmount | null;
  // 0-based position among the contract's milestones.
  order: number;
  status: MilestoneStatus;
  dueDate: string | null;
  submittedAt: string | null;
  submissionNote: string | null;
  submissionLinks: string[];
  approvedAt: string | null;
  escrowStatus: EscrowStatus;
  escrowAddress: string | null;
  escrowTxId: string | null;
  escrowAmount: RewardAmount | null;
  fundedAt: string | null;
  refundableAfter: string | null;
  refundedAt: string | null;
  refundTxId: string | null;
  releaseTxId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneInput {
  contractId: string;
  title: string;
  description?: string;
  amount: number;
  // 0-based.
  order: number;
  // ISO datetime.
  dueDate?: string;
}

export interface SubmitMilestoneInput {
  note?: string;
  links?: string[];
}

// What the sponsor's wallet needs in order to deposit a milestone's escrow:
// where to send it, the contract's own id for it, and an amount the contract
// will accept. Self-contained (own tokenSymbol/decimals), unlike Milestone's
// own `amount`/`escrowAmount`, which carry no token of their own on the wire.
export interface MilestoneEscrowQuote {
  escrowAddress: string;
  listingIdBytes32: string;
  tokenAddress: string;
  amount: RewardAmount;
  // Unix seconds. A refund (once one exists) is not payable before this.
  refundableAfter: number;
  alreadyFunded: boolean;
  depositedOnChain: boolean;
}

export type MilestoneEscrowState = "None" | "Funded" | "Released" | "Refunded";

export type MilestoneEscrowStatus =
  | { configured: false }
  | {
      configured: true;
      state: MilestoneEscrowState;
      owesFreelancer: boolean;
      freelancerHasNoWallet: boolean;
      refundableAfter: string | null;
    };

// What the sponsor's own wallet needs in order to reclaim a funded milestone.
//
// A refund is signed by the sponsor (msg.sender), not the arbiter — the
// opposite of release, and the same trust model as the deposit. The contract
// enforces `refundableAfter` itself with no override of any kind, so
// `eligible: false` is a "come back later" state, not an error: a dispute
// resolved for the client does not open the window early.
export interface MilestoneRefundQuote {
  escrowAddress: string;
  listingIdBytes32: string;
  sponsorAddress: string;
  // Unix seconds. The contract reverts on a refund attempted before this.
  refundableAfter: number;
  eligible: boolean;
  reason: string | null;
}

// What the earner's own wallet can pull out of escrow.
//
// Read-only: the actual movement is withdraw(token) signed by their wallet,
// since the backend has no key. `amountMinor` is the whole balance the
// contract holds for that wallet in that token — a single withdraw sweeps it,
// so it is not necessarily this one milestone's share.
export interface MilestoneClaim {
  claimable: boolean;
  escrowAddress: string;
  tokenAddress: string;
  amount: RewardAmount;
  alreadyClaimed: boolean;
}

export type MilestoneReleaseReason =
  "not-configured" | "already-released" | "not-approved" | "not-funded" | "failed" | "released";

// Idempotent: safe to retry. `released` is the only field that says whether
// this call actually moved funds — `reason` explains why, not whether.
export interface MilestoneReleaseResult {
  released: boolean;
  reason: MilestoneReleaseReason;
  txId: string | null;
  error: string | null;
}

export interface TimeEntry {
  id: string;
  contractId: string;
  freelancerId: string;
  date: string;
  // Decimal hours (e.g. 2.5), capped at 24 per entry by the service.
  hours: number;
  description: string | null;
  status: TimeEntryStatus;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionNote: string | null;
  // Set once this entry has been rolled into a billed milestone.
  billingPeriodMilestoneId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryInput {
  contractId: string;
  // ISO datetime.
  date: string;
  hours: number;
  description?: string;
}

export interface RejectTimeEntryInput {
  note?: string;
}

export interface BillTimeEntriesInput {
  // ISO datetimes.
  periodStart: string;
  periodEnd: string;
  title?: string;
}

export interface Dispute {
  id: string;
  contractId: string;
  milestoneId: string | null;
  raisedById: string;
  reason: string;
  status: DisputeStatus;
  outcome: DisputeOutcome | null;
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaiseDisputeInput {
  contractId: string;
  milestoneId?: string;
  reason: string;
}

// Only a platform admin (role === 'GOD') can call this — not a per-sponsor
// admin. Flips the contract back to ACTIVE; it does not itself refund or
// release anything, so whoever resolves it must separately call the
// milestone endpoint that fits the outcome.
export interface ResolveDisputeInput {
  outcome: DisputeOutcome;
  resolutionNote?: string;
}

export interface Rating {
  id: string;
  contractId: string;
  raterId: string;
  rateeId: string;
  // 1-5, a plain int (not a Decimal, unlike every money field above).
  score: number;
  review: string | null;
  createdAt: string;
}

export interface CreateRatingInput {
  contractId: string;
  score: number;
  review?: string;
}

// GET /ratings/for-user/:userId — a public profile display, so only what a
// visitor should see: no contractId/rateeId (implied by the :userId queried).
export interface PublicRating {
  id: string;
  score: number;
  review: string | null;
  createdAt: string;
  raterId: string;
}
