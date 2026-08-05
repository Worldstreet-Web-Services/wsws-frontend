// Wire shapes for the Jobs domain and the normalizers that turn them into our
// domain types (jobs/types.ts). A change to the service contract stops here.
//
// Every Decimal field (Prisma) comes back over the wire as a JSON string, not
// a number — express's res.json() calls Decimal.toJSON(). Every money field
// is normalized through rewardFromApi, the same exact-minor-unit conversion
// Bounty rewards use, so a job's numbers are never parsed into a float.

import { rewardFromApi } from "@/lib/earn/reward";
import type { RewardAmount } from "@/lib/earn/api/types";
import type {
  BillTimeEntriesInput,
  Contract,
  ContractDetail,
  ContractStatus,
  CreateMilestoneInput,
  CreateProposalInput,
  CreateRatingInput,
  CreateTimeEntryInput,
  Dispute,
  DisputeOutcome,
  DisputeStatus,
  DraftJobPostInput,
  JobBudgetType,
  JobPost,
  JobPostStatus,
  JobSkillGroup,
  Milestone,
  MilestoneEscrowQuote,
  MilestoneEscrowState,
  MilestoneEscrowStatus,
  MilestoneRefundQuote,
  MilestoneReleaseReason,
  MilestoneReleaseResult,
  MilestoneStatus,
  MyContract,
  MyContracts,
  MyProposal,
  Proposal,
  ProposalStatus,
  ProposalWithFreelancer,
  PublicRating,
  RaiseDisputeInput,
  Rating,
  RejectTimeEntryInput,
  ResolveDisputeInput,
  SubmitMilestoneInput,
  TimeEntry,
  TimeEntryStatus,
} from "@/lib/earn/api/jobs/types";

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function toSkillGroups(value: unknown): JobSkillGroup[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (group): group is { skills: string; subskills?: unknown } =>
        !!group &&
        typeof group === "object" &&
        typeof (group as { skills?: unknown }).skills === "string"
    )
    .map((group) => ({ skills: group.skills, subskills: stringArray(group.subskills) }));
}

// Hours logged on a TimeEntry, capped at 24 by the service. A quantity of
// work, not an asset amount, so a plain number is exact enough — unlike a
// money field, this never needs bigint minor-unit precision.
function hoursFromApi(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const JOB_POST_STATUSES: readonly JobPostStatus[] = [
  "DRAFT",
  "OPEN",
  "HIRED",
  "CLOSED",
  "CANCELLED",
];
const PROPOSAL_STATUSES: readonly ProposalStatus[] = [
  "SUBMITTED",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
];
const CONTRACT_STATUSES: readonly ContractStatus[] = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];
// PENDING is the most conservative fallback for an unrecognized status: it
// blocks every downstream action (submit, approve, release) rather than
// risking one that no longer applies.
const MILESTONE_STATUSES: readonly MilestoneStatus[] = [
  "PENDING",
  "FUNDED",
  "SUBMITTED",
  "APPROVED",
  "RELEASED",
  "DISPUTED",
  "REFUNDED",
];
const TIME_ENTRY_STATUSES: readonly TimeEntryStatus[] = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "BILLED",
];
const DISPUTE_STATUSES: readonly DisputeStatus[] = ["OPEN", "RESOLVED"];
const DISPUTE_OUTCOMES: readonly DisputeOutcome[] = [
  "RESOLVED_CLIENT",
  "RESOLVED_FREELANCER",
  "RESOLVED_SPLIT",
];

// ----- JobPost -----

export interface JobPostWire {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  sponsorId?: string;
  pocId?: string | null;
  skills?: unknown;
  region?: string | null;
  budgetType?: string;
  minBudget?: string | number | null;
  maxBudget?: string | number | null;
  hourlyRate?: string | number | null;
  token?: string;
  coverImage?: string | null;
  status?: string;
  isPublished?: boolean;
  publishedAt?: string | null;
  deadline?: string | null;
  isActive?: boolean;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function toJobPost(wire: JobPostWire | null | undefined): JobPost | null {
  if (!wire?.id || !wire.slug) return null;
  const token = text(wire.token, "USDC");
  const budgetType = oneOf<JobBudgetType>(["FIXED", "HOURLY"], wire.budgetType, "FIXED");
  return {
    id: wire.id,
    slug: wire.slug,
    title: text(wire.title, "Untitled job"),
    description: text(wire.description),
    sponsorId: text(wire.sponsorId),
    pocId: optionalText(wire.pocId),
    skills: toSkillGroups(wire.skills),
    region: optionalText(wire.region),
    budgetType,
    minBudget: wire.minBudget != null ? rewardFromApi(wire.minBudget, token) : null,
    maxBudget: wire.maxBudget != null ? rewardFromApi(wire.maxBudget, token) : null,
    hourlyRate: wire.hourlyRate != null ? rewardFromApi(wire.hourlyRate, token) : null,
    token,
    coverImage: optionalText(wire.coverImage),
    status: oneOf<JobPostStatus>(JOB_POST_STATUSES, wire.status, "DRAFT"),
    isPublished: wire.isPublished === true,
    publishedAt: optionalText(wire.publishedAt),
    deadline: optionalText(wire.deadline),
    isActive: wire.isActive !== false,
    isArchived: wire.isArchived === true,
    createdAt: text(wire.createdAt),
    updatedAt: text(wire.updatedAt),
  };
}

export function toJobPosts(wire: JobPostWire[] | null | undefined): JobPost[] {
  if (!Array.isArray(wire)) return [];
  return wire.map(toJobPost).filter((p): p is JobPost => p !== null);
}

export function draftJobPostPayload(input: DraftJobPostInput): Record<string, unknown> {
  return {
    ...(input.id ? { id: input.id } : {}),
    title: input.title,
    slug: input.slug,
    description: input.description,
    ...(input.skills ? { skills: input.skills } : {}),
    ...(input.region ? { region: input.region } : {}),
    budgetType: input.budgetType,
    ...(input.minBudget != null ? { minBudget: input.minBudget } : {}),
    ...(input.maxBudget != null ? { maxBudget: input.maxBudget } : {}),
    ...(input.hourlyRate != null ? { hourlyRate: input.hourlyRate } : {}),
    ...(input.token ? { token: input.token } : {}),
    ...(input.coverImage ? { coverImage: input.coverImage } : {}),
    ...(input.deadline ? { deadline: input.deadline } : {}),
  };
}

// ----- Proposal -----

export interface ProposalWire {
  id?: string;
  jobPostId?: string;
  freelancerId?: string;
  coverLetter?: string;
  proposedAmount?: string | number | null;
  // Snapshotted from the job post when this row was created, so an amount
  // renders straight off the row it came with. Null when the job post had no
  // token set at the time.
  token?: string | null;
  proposedDuration?: string | null;
  status?: string;
  attachments?: unknown;
  withdrawnAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  jobPost?: { title?: string; slug?: string; status?: string } | null;
  freelancer?: { username?: string; photo?: string | null; walletAddress?: string | null } | null;
}

function toProposalBase(wire: ProposalWire, token: string): Proposal | null {
  if (!wire.id || !wire.jobPostId) return null;
  // The row's own snapshotted token wins; the caller's is only a fallback for
  // a row created before the job post had one.
  const rowToken = text(wire.token, token);
  return {
    id: wire.id,
    jobPostId: wire.jobPostId,
    freelancerId: text(wire.freelancerId),
    coverLetter: text(wire.coverLetter),
    proposedAmount:
      wire.proposedAmount != null ? rewardFromApi(wire.proposedAmount, rowToken) : null,
    proposedDuration: optionalText(wire.proposedDuration),
    status: oneOf<ProposalStatus>(PROPOSAL_STATUSES, wire.status, "SUBMITTED"),
    attachments: stringArray(wire.attachments),
    withdrawnAt: optionalText(wire.withdrawnAt),
    createdAt: text(wire.createdAt),
    updatedAt: text(wire.updatedAt),
  };
}

// `token` is the job post's — Proposal carries no token of its own on the
// wire, so the caller supplies it when known (falls back to USDC otherwise,
// same as every other money field here).
export function toProposal(wire: ProposalWire | null | undefined, token = "USDC"): Proposal | null {
  if (!wire) return null;
  return toProposalBase(wire, token);
}

export function toMyProposal(
  wire: ProposalWire | null | undefined,
  token = "USDC"
): MyProposal | null {
  if (!wire) return null;
  const base = toProposalBase(wire, token);
  if (!base) return null;
  return {
    ...base,
    jobPost: wire.jobPost
      ? {
          title: text(wire.jobPost.title, "Untitled job"),
          slug: text(wire.jobPost.slug),
          status: oneOf<JobPostStatus>(JOB_POST_STATUSES, wire.jobPost.status, "OPEN"),
        }
      : null,
  };
}

export function toMyProposals(
  wire: ProposalWire[] | null | undefined,
  token = "USDC"
): MyProposal[] {
  if (!Array.isArray(wire)) return [];
  return wire.map((w) => toMyProposal(w, token)).filter((p): p is MyProposal => p !== null);
}

export function toProposalWithFreelancer(
  wire: ProposalWire | null | undefined,
  token = "USDC"
): ProposalWithFreelancer | null {
  if (!wire) return null;
  const base = toProposalBase(wire, token);
  if (!base) return null;
  return {
    ...base,
    freelancer: wire.freelancer
      ? {
          username: text(wire.freelancer.username),
          photo: optionalText(wire.freelancer.photo),
          walletAddress: optionalText(wire.freelancer.walletAddress),
        }
      : null,
  };
}

export function toProposalsWithFreelancer(
  wire: ProposalWire[] | null | undefined,
  token = "USDC"
): ProposalWithFreelancer[] {
  if (!Array.isArray(wire)) return [];
  return wire
    .map((w) => toProposalWithFreelancer(w, token))
    .filter((p): p is ProposalWithFreelancer => p !== null);
}

export function createProposalPayload(input: CreateProposalInput): Record<string, unknown> {
  return {
    jobPostId: input.jobPostId,
    coverLetter: input.coverLetter,
    proposedAmount: input.proposedAmount,
    ...(input.proposedDuration ? { proposedDuration: input.proposedDuration } : {}),
    ...(input.attachments ? { attachments: input.attachments } : {}),
  };
}

// ----- Contract -----

export interface ContractWire {
  id?: string;
  jobPostId?: string;
  proposalId?: string;
  sponsorId?: string;
  freelancerId?: string;
  budgetType?: string;
  agreedAmount?: string | number | null;
  // Snapshotted from the job post at creation (see ProposalWire.token).
  token?: string | null;
  status?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  jobPost?: { title?: string; slug?: string } | null;
  freelancer?: { username?: string; walletAddress?: string | null } | null;
}

function toContractBase(wire: ContractWire, token: string): Contract | null {
  if (!wire.id || !wire.jobPostId) return null;
  const rowToken = text(wire.token, token);
  return {
    id: wire.id,
    jobPostId: wire.jobPostId,
    proposalId: text(wire.proposalId),
    sponsorId: text(wire.sponsorId),
    freelancerId: text(wire.freelancerId),
    budgetType: oneOf<JobBudgetType>(["FIXED", "HOURLY"], wire.budgetType, "FIXED"),
    agreedAmount: wire.agreedAmount != null ? rewardFromApi(wire.agreedAmount, rowToken) : null,
    status: oneOf<ContractStatus>(CONTRACT_STATUSES, wire.status, "ACTIVE"),
    startedAt: optionalText(wire.startedAt),
    completedAt: optionalText(wire.completedAt),
    cancelledAt: optionalText(wire.cancelledAt),
    createdAt: text(wire.createdAt),
    updatedAt: text(wire.updatedAt),
  };
}

// `token` is the job post's — Contract, like Proposal, carries no token of
// its own on the wire.
export function toContract(wire: ContractWire | null | undefined, token = "USDC"): Contract | null {
  if (!wire) return null;
  return toContractBase(wire, token);
}

function jobPostRef(wire: ContractWire): { title: string; slug: string } | null {
  return wire.jobPost
    ? { title: text(wire.jobPost.title, "Untitled job"), slug: text(wire.jobPost.slug) }
    : null;
}

export function toContractDetail(
  wire: ContractWire | null | undefined,
  token = "USDC"
): ContractDetail | null {
  if (!wire) return null;
  const base = toContractBase(wire, token);
  if (!base) return null;
  return {
    ...base,
    jobPost: jobPostRef(wire),
    freelancer: wire.freelancer
      ? {
          username: text(wire.freelancer.username),
          walletAddress: optionalText(wire.freelancer.walletAddress),
        }
      : null,
  };
}

function toMyContract(wire: ContractWire, token: string): MyContract | null {
  const base = toContractBase(wire, token);
  if (!base) return null;
  return { ...base, jobPost: jobPostRef(wire) };
}

// GET /contracts/mine — { asFreelancer, asSponsor }, not a bare array.
export function toMyContracts(
  wire: { asFreelancer?: ContractWire[]; asSponsor?: ContractWire[] } | null | undefined,
  token = "USDC"
): MyContracts {
  const side = (list: ContractWire[] | undefined): MyContract[] =>
    Array.isArray(list)
      ? list.map((w) => toMyContract(w, token)).filter((c): c is MyContract => c !== null)
      : [];
  return { asFreelancer: side(wire?.asFreelancer), asSponsor: side(wire?.asSponsor) };
}

// ----- Milestone -----

export interface MilestoneWire {
  id?: string;
  contractId?: string;
  title?: string;
  description?: string | null;
  amount?: string | number | null;
  // Snapshotted from the contract at creation (see ProposalWire.token).
  token?: string | null;
  order?: number;
  status?: string;
  dueDate?: string | null;
  submittedAt?: string | null;
  submissionNote?: string | null;
  submissionLinks?: unknown;
  approvedAt?: string | null;
  escrowStatus?: string;
  escrowAddress?: string | null;
  escrowTxId?: string | null;
  escrowAmount?: string | number | null;
  fundedAt?: string | null;
  refundableAfter?: string | null;
  refundedAt?: string | null;
  refundTxId?: string | null;
  releaseTxId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// `token` is the contract's job post's — Milestone carries no token of its
// own on the wire (its escrow-quote does; see toMilestoneEscrowQuote below).
export function toMilestone(
  wire: MilestoneWire | null | undefined,
  token = "USDC"
): Milestone | null {
  if (!wire?.id || !wire.contractId) return null;
  const rowToken = text(wire.token, token);
  return {
    id: wire.id,
    contractId: wire.contractId,
    title: text(wire.title, "Untitled milestone"),
    description: optionalText(wire.description),
    amount: wire.amount != null ? rewardFromApi(wire.amount, rowToken) : null,
    order: typeof wire.order === "number" ? wire.order : 0,
    status: oneOf<MilestoneStatus>(MILESTONE_STATUSES, wire.status, "PENDING"),
    dueDate: optionalText(wire.dueDate),
    submittedAt: optionalText(wire.submittedAt),
    submissionNote: optionalText(wire.submissionNote),
    submissionLinks: stringArray(wire.submissionLinks),
    approvedAt: optionalText(wire.approvedAt),
    escrowStatus: oneOf(
      ["UNFUNDED", "FUNDED", "RELEASED", "REFUNDED"] as const,
      wire.escrowStatus,
      "UNFUNDED"
    ),
    escrowAddress: optionalText(wire.escrowAddress),
    escrowTxId: optionalText(wire.escrowTxId),
    escrowAmount: wire.escrowAmount != null ? rewardFromApi(wire.escrowAmount, rowToken) : null,
    fundedAt: optionalText(wire.fundedAt),
    refundableAfter: optionalText(wire.refundableAfter),
    refundedAt: optionalText(wire.refundedAt),
    refundTxId: optionalText(wire.refundTxId),
    releaseTxId: optionalText(wire.releaseTxId),
    createdAt: text(wire.createdAt),
    updatedAt: text(wire.updatedAt),
  };
}

export function toMilestones(
  wire: MilestoneWire[] | null | undefined,
  token = "USDC"
): Milestone[] {
  if (!Array.isArray(wire)) return [];
  return wire.map((w) => toMilestone(w, token)).filter((m): m is Milestone => m !== null);
}

export function createMilestonePayload(input: CreateMilestoneInput): Record<string, unknown> {
  return {
    contractId: input.contractId,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    amount: input.amount,
    order: input.order,
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
  };
}

export function submitMilestonePayload(input: SubmitMilestoneInput): Record<string, unknown> {
  return {
    ...(input.note ? { note: input.note } : {}),
    ...(input.links ? { links: input.links } : {}),
  };
}

export interface MilestoneEscrowQuoteWire {
  escrowAddress?: string;
  listingIdBytes32?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  decimals?: number;
  amount?: string | number;
  amountMinor?: string | number;
  refundableAfter?: number;
  alreadyFunded?: boolean;
  depositedOnChain?: boolean;
}

// Self-contained, unlike Milestone.amount/escrowAmount: this response carries
// its own tokenSymbol/decimals, so the RewardAmount is built directly off
// amountMinor rather than through rewardFromApi's decimal-string parsing.
export function toMilestoneEscrowQuote(
  wire: MilestoneEscrowQuoteWire | null | undefined
): MilestoneEscrowQuote | null {
  if (!wire?.escrowAddress || !wire.listingIdBytes32 || !wire.tokenAddress) return null;
  const token = text(wire.tokenSymbol, "USDC");
  const decimals = typeof wire.decimals === "number" ? wire.decimals : 6;
  const minor = text(wire.amountMinor ?? wire.amount, "0");
  const amount: RewardAmount = { minor, token, decimals };
  return {
    escrowAddress: wire.escrowAddress,
    listingIdBytes32: wire.listingIdBytes32,
    tokenAddress: wire.tokenAddress,
    amount,
    refundableAfter: typeof wire.refundableAfter === "number" ? wire.refundableAfter : 0,
    alreadyFunded: wire.alreadyFunded === true,
    depositedOnChain: wire.depositedOnChain === true,
  };
}

export interface MilestoneEscrowStatusWire {
  configured?: boolean;
  state?: string;
  owesFreelancer?: boolean;
  freelancerHasNoWallet?: boolean;
  refundableAfter?: string | null;
}

export function toMilestoneEscrowStatus(
  wire: MilestoneEscrowStatusWire | null | undefined
): MilestoneEscrowStatus {
  if (!wire?.configured) return { configured: false };
  return {
    configured: true,
    state: oneOf<MilestoneEscrowState>(
      ["None", "Funded", "Released", "Refunded"],
      wire.state,
      "None"
    ),
    owesFreelancer: wire.owesFreelancer === true,
    freelancerHasNoWallet: wire.freelancerHasNoWallet === true,
    refundableAfter: optionalText(wire.refundableAfter),
  };
}

export interface MilestoneRefundQuoteWire {
  escrowAddress?: string;
  listingIdBytes32?: string;
  sponsorAddress?: string;
  refundableAfter?: number;
  eligible?: boolean;
  reason?: string | null;
}

export function toMilestoneRefundQuote(
  wire: MilestoneRefundQuoteWire | null | undefined
): MilestoneRefundQuote | null {
  if (!wire?.escrowAddress || !wire.listingIdBytes32 || !wire.sponsorAddress) return null;
  return {
    escrowAddress: wire.escrowAddress,
    listingIdBytes32: wire.listingIdBytes32,
    sponsorAddress: wire.sponsorAddress,
    refundableAfter: typeof wire.refundableAfter === "number" ? wire.refundableAfter : 0,
    // Defaults to not eligible: prompting a wallet signature for a refund the
    // contract would revert is worse than making the sponsor wait a beat.
    eligible: wire.eligible === true,
    reason: optionalText(wire.reason),
  };
}

export interface FundMilestoneInput {
  txId: string;
  walletAddress?: string;
}

export function fundMilestonePayload(input: FundMilestoneInput): Record<string, unknown> {
  return {
    txId: input.txId,
    ...(input.walletAddress ? { walletAddress: input.walletAddress } : {}),
  };
}

export interface MilestoneReleaseResultWire {
  released?: boolean;
  reason?: string;
  txId?: string | null;
  error?: string | null;
}

const RELEASE_REASONS: readonly MilestoneReleaseReason[] = [
  "not-configured",
  "already-released",
  "not-approved",
  "not-funded",
  "failed",
  "released",
];

export function toMilestoneReleaseResult(
  wire: MilestoneReleaseResultWire | null | undefined
): MilestoneReleaseResult {
  return {
    released: wire?.released === true,
    reason: oneOf(RELEASE_REASONS, wire?.reason, "failed"),
    txId: optionalText(wire?.txId),
    error: optionalText(wire?.error),
  };
}

// ----- TimeEntry -----

export interface TimeEntryWire {
  id?: string;
  contractId?: string;
  freelancerId?: string;
  date?: string;
  hours?: string | number;
  description?: string | null;
  status?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionNote?: string | null;
  billingPeriodMilestoneId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function toTimeEntry(wire: TimeEntryWire | null | undefined): TimeEntry | null {
  if (!wire?.id || !wire.contractId) return null;
  return {
    id: wire.id,
    contractId: wire.contractId,
    freelancerId: text(wire.freelancerId),
    date: text(wire.date),
    hours: hoursFromApi(wire.hours),
    description: optionalText(wire.description),
    status: oneOf<TimeEntryStatus>(TIME_ENTRY_STATUSES, wire.status, "SUBMITTED"),
    approvedAt: optionalText(wire.approvedAt),
    rejectedAt: optionalText(wire.rejectedAt),
    rejectionNote: optionalText(wire.rejectionNote),
    billingPeriodMilestoneId: optionalText(wire.billingPeriodMilestoneId),
    createdAt: text(wire.createdAt),
    updatedAt: text(wire.updatedAt),
  };
}

export function toTimeEntries(wire: TimeEntryWire[] | null | undefined): TimeEntry[] {
  if (!Array.isArray(wire)) return [];
  return wire.map(toTimeEntry).filter((t): t is TimeEntry => t !== null);
}

export function createTimeEntryPayload(input: CreateTimeEntryInput): Record<string, unknown> {
  return {
    contractId: input.contractId,
    date: input.date,
    hours: input.hours,
    ...(input.description ? { description: input.description } : {}),
  };
}

export function rejectTimeEntryPayload(input: RejectTimeEntryInput): Record<string, unknown> {
  return input.note ? { note: input.note } : {};
}

export function billTimeEntriesPayload(input: BillTimeEntriesInput): Record<string, unknown> {
  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    ...(input.title ? { title: input.title } : {}),
  };
}

// ----- Dispute -----

export interface DisputeWire {
  id?: string;
  contractId?: string;
  milestoneId?: string | null;
  raisedById?: string;
  reason?: string;
  status?: string;
  outcome?: string | null;
  resolutionNote?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function toDispute(wire: DisputeWire | null | undefined): Dispute | null {
  if (!wire?.id || !wire.contractId) return null;
  return {
    id: wire.id,
    contractId: wire.contractId,
    milestoneId: optionalText(wire.milestoneId),
    raisedById: text(wire.raisedById),
    reason: text(wire.reason),
    status: oneOf<DisputeStatus>(DISPUTE_STATUSES, wire.status, "OPEN"),
    outcome: wire.outcome
      ? oneOf<DisputeOutcome>(DISPUTE_OUTCOMES, wire.outcome, "RESOLVED_SPLIT")
      : null,
    resolutionNote: optionalText(wire.resolutionNote),
    resolvedById: optionalText(wire.resolvedById),
    resolvedAt: optionalText(wire.resolvedAt),
    createdAt: text(wire.createdAt),
    updatedAt: text(wire.updatedAt),
  };
}

export function raiseDisputePayload(input: RaiseDisputeInput): Record<string, unknown> {
  return {
    contractId: input.contractId,
    ...(input.milestoneId ? { milestoneId: input.milestoneId } : {}),
    reason: input.reason,
  };
}

export function resolveDisputePayload(input: ResolveDisputeInput): Record<string, unknown> {
  return {
    outcome: input.outcome,
    ...(input.resolutionNote ? { resolutionNote: input.resolutionNote } : {}),
  };
}

// ----- Rating -----

export interface RatingWire {
  id?: string;
  contractId?: string;
  raterId?: string;
  rateeId?: string;
  score?: number;
  review?: string | null;
  createdAt?: string;
}

export function toRating(wire: RatingWire | null | undefined): Rating | null {
  if (!wire?.id || !wire.contractId) return null;
  return {
    id: wire.id,
    contractId: wire.contractId,
    raterId: text(wire.raterId),
    rateeId: text(wire.rateeId),
    score: typeof wire.score === "number" ? wire.score : 0,
    review: optionalText(wire.review),
    createdAt: text(wire.createdAt),
  };
}

export function createRatingPayload(input: CreateRatingInput): Record<string, unknown> {
  return {
    contractId: input.contractId,
    score: input.score,
    ...(input.review ? { review: input.review } : {}),
  };
}

export interface PublicRatingWire {
  id?: string;
  score?: number;
  review?: string | null;
  createdAt?: string;
  raterId?: string;
}

export function toPublicRating(wire: PublicRatingWire | null | undefined): PublicRating | null {
  if (!wire?.id) return null;
  return {
    id: wire.id,
    score: typeof wire.score === "number" ? wire.score : 0,
    review: optionalText(wire.review),
    createdAt: text(wire.createdAt),
    raterId: text(wire.raterId),
  };
}

export function toPublicRatings(wire: PublicRatingWire[] | null | undefined): PublicRating[] {
  if (!Array.isArray(wire)) return [];
  return wire.map(toPublicRating).filter((r): r is PublicRating => r !== null);
}
