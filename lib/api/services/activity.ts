"use client";

import { createServiceClient, type QueryParams } from "@/lib/api/service";
import type { ActivityItem } from "@/lib/server/activity";

export const activityClient = createServiceClient(
  "/api/activity",
  "Could not load activity right now."
);

export async function fetchUserActivity(params: {
  evm?: string | null;
  solana?: string | null;
}): Promise<{ items: ActivityItem[] }> {
  const queryParams: QueryParams = {};
  if (params.evm) queryParams.evm = params.evm;
  if (params.solana) queryParams.solana = params.solana;

  return activityClient.authedGet<{ items: ActivityItem[] }>("", queryParams);
}
