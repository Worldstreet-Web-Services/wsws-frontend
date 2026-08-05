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
  // The service pages with `take` alone — no skip or cursor — so a caller
  // past the first page has no way to ask for the next one yet. Raising this
  // is the only lever until it grows one.
  take?: number;
}

export async function fetchJobPosts(query: JobPostBrowseQuery = {}): Promise<JobPost[]> {
  const data = await earnGet<JobPostWire[] | { jobPosts?: JobPostWire[] } | null>("/job-posts", {
    ...(query.region ? { region: query.region } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.take != null ? { take: query.take } : {}),
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

// Edits a job post that is already OPEN. Only send what changed — every field
// is optional. budgetType is deliberately absent: it is locked once published,
// so switching a job between fixed-price and hourly means closing and
// reposting it.
export interface UpdateJobPostInput {
  title?: string;
  description?: string;
  skills?: { skills: string; subskills: string[] }[];
  region?: string;
  minBudget?: number;
  maxBudget?: number;
  hourlyRate?: number;
  token?: string;
  deadline?: string;
}

export async function updateJobPost(
  id: string,
  input: UpdateJobPostInput
): Promise<JobPost | null> {
  const data = await earnPost<JobPostWire>(
    `/job-posts/${encodeURIComponent(id)}/update`,
    input as Record<string, unknown>
  );
  return toJobPost(data);
}

// From DRAFT or OPEN only.
export async function closeJobPost(id: string): Promise<JobPost | null> {
  const data = await earnPost<JobPostWire>(`/job-posts/${encodeURIComponent(id)}/close`);
  return toJobPost(data);
}
