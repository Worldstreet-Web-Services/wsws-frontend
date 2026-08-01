"use client";

import { useMutation } from "@tanstack/react-query";
import { saveTalentProfile } from "@/lib/earn/api/talent";
import type { TalentProfileInput } from "@/lib/earn/api/types";

// Save the talent profile that unlocks submitting to a listing.
export function useSaveTalentProfile() {
  return useMutation({
    mutationFn: (input: TalentProfileInput) => saveTalentProfile(input),
  });
}
