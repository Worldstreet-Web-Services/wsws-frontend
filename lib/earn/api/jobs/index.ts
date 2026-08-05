// The Jobs domain's public surface. Import from here rather than reaching
// into the individual modules, so a future re-split of these files doesn't
// touch every call site.
//
// Jobs is parallel to Bounties (lib/earn/api/{listings,submissions,...}.ts),
// not a layer on top of it: a job post is not a listing, a contract is not a
// submission, and the two never share a row.

export type {
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
  EscrowStatus,
  JobBudgetType,
  JobPost,
  JobPostStatus,
  JobSkillGroup,
  Milestone,
  MilestoneEscrowQuote,
  MilestoneEscrowState,
  MilestoneEscrowStatus,
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

export type { FundMilestoneInput } from "@/lib/earn/api/jobs/wire";

export {
  closeJobPost,
  fetchJobPost,
  fetchJobPosts,
  fetchMyJobPosts,
  publishJobPost,
  saveJobPostDraft,
  type JobPostBrowseQuery,
} from "@/lib/earn/api/jobs/job-posts";

export {
  createProposal,
  fetchMyProposals,
  fetchProposalsForJob,
  hireProposal,
  shortlistProposal,
  withdrawProposal,
} from "@/lib/earn/api/jobs/proposals";

export { completeContract, fetchContract, fetchMyContracts } from "@/lib/earn/api/jobs/contracts";

export {
  approveMilestone,
  createMilestone,
  fetchMilestoneEscrowQuote,
  fetchMilestoneEscrowStatus,
  fetchMilestones,
  fundMilestone,
  releaseMilestone,
  submitMilestone,
} from "@/lib/earn/api/jobs/milestones";

export {
  approveTimeEntry,
  billTimeEntries,
  createTimeEntry,
  fetchTimeEntries,
  rejectTimeEntry,
} from "@/lib/earn/api/jobs/time-entries";

export { raiseDispute, resolveDispute } from "@/lib/earn/api/jobs/disputes";

export { createRating, fetchRatingsForUser } from "@/lib/earn/api/jobs/ratings";
