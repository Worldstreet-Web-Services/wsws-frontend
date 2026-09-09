"use client";

import { apiFetch } from "@/lib/api";
import type { ActivityItem } from "@/lib/server/activity";

// /api/activity is a local route that returns a raw { items } object, NOT the
// gateway { success, data } envelope. So it must not go through a service
// client / unwrap(), which requires `success === true` and throws on the
// missing envelope — that is exactly what left the feed empty. Fetch it plain
// and return its JSON, the way the activity feed has always read it.
export async function fetchUserActivity(params: {
  evm?: string | null;
  solana?: string | null;
}): Promise<{ items: ActivityItem[] }> {
  const query = new URLSearchParams();
  if (params.evm) query.set("evm", params.evm);
  if (params.solana) query.set("solana", params.solana);
  const res = await apiFetch(`/api/activity?${query.toString()}`, {}, { requireAuth: true });
  if (!res.ok) {
    throw new Error(
      res.status === 429 ? "Too many requests, try again shortly" : "Could not load activity"
    );
  }
  return res.json();
}
