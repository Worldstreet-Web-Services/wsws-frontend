"use client";

// The sponsor side: creating and publishing listings, then reviewing what came
// in. Every call here is forwarded with an `x-sponsor-id` that the proxy
// resolved from the session, so nothing in this file names a sponsor.

import { earnGet, earnPost } from "@/lib/earn/api/client";
import { toListing, toSubmissions, type ListingWire, type SubmissionWire } from "@/lib/earn/api/wire";
import type { Listing, ListingType, Submission, WinnerSelection } from "@/lib/earn/api/types";
import type { ListingPayload } from "@/lib/earn/listing-form";

type FeedResponse = SubmissionWire[] | { submissions?: SubmissionWire[] } | null;

function submissionsOf(data: FeedResponse): SubmissionWire[] {
  if (Array.isArray(data)) return data;
  return data?.submissions ?? [];
}

export async function fetchIsCreateAllowed(): Promise<boolean> {
  const data = await earnGet<boolean | { allowed?: boolean; isCreateAllowed?: boolean }>(
    "/sponsor-dashboard/listings/is-create-allowed"
  );
  if (typeof data === "boolean") return data;
  if (typeof data?.allowed === "boolean") return data.allowed;
  return data?.isCreateAllowed !== false;
}

// Saves a draft, creating it on the first call and updating it after. The
// service answers with the listing, which is where the id for publish comes
// from, so the caller must keep what this returns.
export async function saveListingDraft(payload: ListingPayload): Promise<Listing> {
  const listing = toListing(await earnPost<ListingWire>("/sponsor-dashboard/listing/draft", payload));
  if (!listing) throw new Error("The draft was saved but could not be read back.");
  return listing;
}

export async function publishListing(id: string): Promise<Listing | null> {
  return toListing(
    await earnPost<ListingWire>(`/sponsor-dashboard/listing/${encodeURIComponent(id)}/publish`)
  );
}

export async function updateListing(id: string, payload: ListingPayload): Promise<Listing | null> {
  return toListing(
    await earnPost<ListingWire>(
      `/sponsor-dashboard/listing/${encodeURIComponent(id)}/update`,
      payload
    )
  );
}

export async function fetchSponsorListing(slug: string, type: ListingType): Promise<Listing> {
  const data = await earnGet<ListingWire>(
    `/sponsor-dashboard/${encodeURIComponent(slug)}/listing`,
    { type }
  );
  const listing = toListing(data);
  if (!listing) throw new Error("That listing could not be read.");
  return listing;
}

export async function fetchSponsorSubmissions(slug: string): Promise<Submission[]> {
  const data = await earnGet<FeedResponse>(
    `/sponsor-dashboard/${encodeURIComponent(slug)}/submissions`
  );
  return toSubmissions(submissionsOf(data));
}

export async function rejectSubmissions(ids: string[]): Promise<void> {
  await earnPost<unknown>("/sponsor-dashboard/submission/reject", {
    data: ids.map((id) => ({ id })),
  });
}

export async function toggleWinners(selections: WinnerSelection[]): Promise<void> {
  await earnPost<unknown>("/sponsor-dashboard/submission/toggle-winner", {
    submissions: selections,
  });
}
