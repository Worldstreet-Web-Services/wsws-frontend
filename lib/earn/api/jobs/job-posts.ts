"use client";

// Sponsor-owned job listings: draft, publish, close, and the two public reads
// (browse feed, one job's detail). Mirrors lib/earn/api/listings.ts's split
// between public and sponsor-authed calls.

import { earnAuthedGet, earnGet, earnPost } from "@/lib/earn/api/client";
import {
  draftJobPostPayload,
  toJobPost,
  toJobPosts,
  type JobPostWire,
} from "@/lib/earn/api/jobs/wire";
import type { DraftJobPostInput, JobPost, JobPostStatus } from "@/lib/earn/api/jobs/types";

export interface JobPostBrowseQuery {
  region?: string;
  status?: JobPostStatus;
}

export async function fetchJobPosts(query: JobPostBrowseQuery = {}): Promise<JobPost[]> {
  const data = await earnGet<JobPostWire[] | { jobPosts?: JobPostWire[] } | null>("/job-posts", {
    ...(query.region ? { region: query.region } : {}),
    ...(query.status ? { status: query.status } : {}),
  });
  return toJobPosts(Array.isArray(data) ? data : (data?.jobPosts ?? []));
}

export async function fetchJobPost(slug: string): Promise<JobPost> {
  const data = await earnGet<JobPostWire>(`/job-posts/${encodeURIComponent(slug)}`);
  const jobPost = toJobPost(data);
  if (!jobPost) throw new Error("That job could not be read.");
  return jobPost;
}

// Every job post the caller's sponsor owns, drafts included — the public
// feed and detail routes only ever return published/open work.
export async function fetchMyJobPosts(): Promise<JobPost[]> {
  const data = await earnAuthedGet<JobPostWire[] | { jobPosts?: JobPostWire[] } | null>(
    "/job-posts/mine"
  );
  return toJobPosts(Array.isArray(data) ? data : (data?.jobPosts ?? []));
}

// Omit `id` to create a new draft, include it to update one (must still be
// DRAFT, must be yours).
export async function saveJobPostDraft(input: DraftJobPostInput): Promise<JobPost> {
  const data = await earnPost<JobPostWire>("/job-posts/draft", draftJobPostPayload(input));
  const jobPost = toJobPost(data);
  if (!jobPost) throw new Error("The draft was saved but could not be read back.");
  return jobPost;
}

// Requires a budget already set (min/max for FIXED, hourlyRate for HOURLY).
export async function publishJobPost(id: string): Promise<JobPost | null> {
  const data = await earnPost<JobPostWire>(`/job-posts/${encodeURIComponent(id)}/publish`);
  return toJobPost(data);
}

// From DRAFT or OPEN only.
export async function closeJobPost(id: string): Promise<JobPost | null> {
  const data = await earnPost<JobPostWire>(`/job-posts/${encodeURIComponent(id)}/close`);
  return toJobPost(data);
}
