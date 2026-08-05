"use client";

// Post-completion ratings, one per direction. The contract must be COMPLETED
// before either side can rate, and the ratee is inferred server-side (a
// freelancer rates the job post's point of contact, a sponsor rates the
// freelancer) — never sent by the client.

import { earnGet, earnPost } from "@/lib/earn/api/client";
import {
  createRatingPayload,
  toPublicRatings,
  toRating,
  type PublicRatingWire,
  type RatingWire,
} from "@/lib/earn/api/jobs/wire";
import type { CreateRatingInput, PublicRating, Rating } from "@/lib/earn/api/jobs/types";

// Contract must be COMPLETED; one rating per rater per contract.
export async function createRating(input: CreateRatingInput): Promise<Rating> {
  const data = await earnPost<RatingWire>("/ratings", createRatingPayload(input));
  const rating = toRating(data);
  if (!rating) throw new Error("That rating could not be read back.");
  return rating;
}

// Public profile display. optionalUser upstream: works signed-out, so this
// goes through the unauthenticated read path.
export async function fetchRatingsForUser(userId: string): Promise<PublicRating[]> {
  const data = await earnGet<PublicRatingWire[] | { ratings?: PublicRatingWire[] } | null>(
    `/ratings/for-user/${encodeURIComponent(userId)}`
  );
  return toPublicRatings(Array.isArray(data) ? data : (data?.ratings ?? []));
}
