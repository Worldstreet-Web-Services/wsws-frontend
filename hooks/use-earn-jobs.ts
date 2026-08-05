"use client";

// React Query bindings for the Jobs domain (lib/earn/api/jobs). Job posts,
// proposals and the hire action — the read/write surface up to the point a
// Contract exists. Contracts and their payouts live in use-earn-contracts.ts.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeJobPost,
  createProposal,
  fetchJobPost,
  fetchJobPosts,
  fetchMyJobPosts,
  fetchMyProposals,
  fetchProposalsForJob,
  hireProposal,
  publishJobPost,
  saveJobPostDraft,
  shortlistProposal,
  withdrawProposal,
  type CreateProposalInput,
  type DraftJobPostInput,
  type JobPostBrowseQuery,
} from "@/lib/earn/api/jobs";

export const JOB_KEYS = {
  // Everything under the Jobs domain, for a blanket invalidate after an
  // action whose blast radius crosses several views (a hire, say).
  root: ["earn", "jobs"] as const,
  feed: (query: JobPostBrowseQuery) => ["earn", "jobs", "feed", query] as const,
  detail: (slug: string) => ["earn", "jobs", "detail", slug] as const,
  mine: ["earn", "jobs", "mine"] as const,
  myProposals: ["earn", "jobs", "proposals", "mine"] as const,
  proposalsForJob: (jobPostId: string) =>
    ["earn", "jobs", "proposals", "for-job", jobPostId] as const,
};

// The public job feed. Renders for a signed-out visitor deciding whether to
// sign in, same as the bounty browse feed.
export function useJobFeed(query: JobPostBrowseQuery = {}) {
  const jobs = useQuery({
    queryKey: JOB_KEYS.feed(query),
    queryFn: () => fetchJobPosts(query),
  });

  return {
    jobs: jobs.data ?? [],
    isLoading: jobs.isLoading,
    error: jobs.error,
  };
}

export function useJobPost(slug: string | null) {
  const query = useQuery({
    queryKey: JOB_KEYS.detail(slug ?? "none"),
    queryFn: () => fetchJobPost(slug as string),
    enabled: !!slug,
  });

  return { jobPost: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

// Every job post this sponsor owns, drafts included — the public feed carries
// only published work, so this is the one view that can see a draft.
export function useMyJobPosts() {
  const query = useQuery({ queryKey: JOB_KEYS.mine, queryFn: fetchMyJobPosts });
  return { jobPosts: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

// Creates on the first call and updates after, like the bounty draft flow: the
// service answers with the job post, which is where the id for publish comes
// from, so the caller must keep what this returns.
export function useSaveJobPostDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DraftJobPostInput) => saveJobPostDraft(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.mine });
    },
  });
}

// Publishing puts the post in the public feed, so both the sponsor's own view
// and the feed are stale afterwards.
export function usePublishJobPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishJobPost(id),
    onSuccess: (jobPost) => {
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.root });
      if (jobPost) {
        void queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(jobPost.slug) });
      }
    },
  });
}

export function useCloseJobPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeJobPost(id),
    onSuccess: (jobPost) => {
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.root });
      if (jobPost) {
        void queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(jobPost.slug) });
      }
    },
  });
}

// Every proposal the caller has submitted, with enough of the job to render a
// row and link back to it.
export function useMyProposals() {
  const query = useQuery({ queryKey: JOB_KEYS.myProposals, queryFn: fetchMyProposals });
  return { proposals: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

// A sponsor reviewing bids on their own job post.
export function useProposalsForJob(jobPostId: string | null) {
  const query = useQuery({
    queryKey: JOB_KEYS.proposalsForJob(jobPostId ?? "none"),
    queryFn: () => fetchProposalsForJob(jobPostId as string),
    enabled: !!jobPostId,
  });

  return { proposals: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

// One proposal per freelancer per job post, and the job must be OPEN — so the
// job's detail view is stale afterwards (it decides whether to still offer the
// apply button).
export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProposalInput) => createProposal(input),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.myProposals });
      if (proposal.jobPost) {
        void queryClient.invalidateQueries({ queryKey: JOB_KEYS.detail(proposal.jobPost.slug) });
      }
    },
  });
}

export function useWithdrawProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => withdrawProposal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.myProposals });
    },
  });
}

export function useShortlistProposal(jobPostId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shortlistProposal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.proposalsForJob(jobPostId) });
    },
  });
}

// The pivot action. It accepts one proposal, auto-rejects every other open one
// on the job, closes the job, and creates the Contract — so nearly every Jobs
// view is stale afterwards, hence the blanket invalidate. Contracts live under
// their own key, invalidated here too since a new one now exists.
export function useHireProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hireProposal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: JOB_KEYS.root });
      void queryClient.invalidateQueries({ queryKey: ["earn", "contracts"] });
    },
  });
}
