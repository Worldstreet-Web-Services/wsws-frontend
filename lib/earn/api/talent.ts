"use client";

// The talent side of onboarding. The earn service requires a completed talent
// profile before it accepts a submission: POST /submission/create is refused
// until the user's isTalentFilled flag is true.

import { earnPost } from "@/lib/earn/api/client";
import { USE_FIXTURES } from "@/lib/earn/api/fixtures";
import type { TalentProfileInput } from "@/lib/earn/api/types";

// This endpoint is NOT part of the documented 20-endpoint MVP, so its path and
// body shape are not pinned by the contract. It is kept as one constant here so
// matching the real service is a single-line change once the route is known.
const TALENT_PROFILE_PATH = "/talent/create";

export async function saveTalentProfile(input: TalentProfileInput): Promise<void> {
  // Nothing is persisted while the feature runs on fixtures, so the form still
  // completes and the flow can be walked end to end.
  if (USE_FIXTURES) return;
  await earnPost<unknown>(TALENT_PROFILE_PATH, input);
}
