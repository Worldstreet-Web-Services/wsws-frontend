"use client";

// Public listing discovery: the browse feed, its count, and one listing's
// detail page. None of these need a session.

import { earnGet } from "@/lib/earn/api/client";
import { toListing, toListingSummaries, type ListingWire } from "@/lib/earn/api/wire";
import type { BrowseQuery, Listing, ListingSummary } from "@/lib/earn/api/types";

// The feed endpoint may answer with a bare array or wrap it under a key. Both
// have been seen across platform services, so accept either rather than
// pinning the UI to one and breaking on the other.
type FeedResponse = ListingWire[] | { listings?: ListingWire[] } | null;

function listingsOf(data: FeedResponse): ListingWire[] {
  if (Array.isArray(data)) return data;
  return data?.listings ?? [];
}

function queryParams(query: BrowseQuery): Record<string, string> {
  return {
    context: query.context,
    tab: query.tab,
    category: query.category,
    status: query.status,
    sortBy: query.sortBy,
    order: query.order,
  };
}

export async function fetchListings(query: BrowseQuery): Promise<ListingSummary[]> {
  const data = await earnGet<FeedResponse>("/listings", queryParams(query));
  return toListingSummaries(listingsOf(data));
}

export async function fetchListingCount(query: BrowseQuery): Promise<number> {
  // The count endpoint takes the same filters as the feed minus the category.
  const params = queryParams(query);
  delete params.category;
  const data = await earnGet<number | { count?: number }>("/listings/count", params);
  if (typeof data === "number") return data;
  return typeof data?.count === "number" ? data.count : 0;
}

export async function fetchListingDetail(slug: string): Promise<Listing> {
  const data = await earnGet<ListingWire>(`/listings/details/${encodeURIComponent(slug)}`);
  const listing = toListing(data);
  if (!listing) throw new Error("That listing could not be read.");
  return listing;
}
