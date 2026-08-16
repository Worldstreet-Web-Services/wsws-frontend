// Progress model for the migration sweep. Pure state transitions over the
// plan's assets, so retries and per-item failure handling are unit tested.

import type { ChainSweep, SweepAsset } from "@/features/migrate/lib/plan";

export type SweepItemStatus = "pending" | "active" | "done" | "failed";

export interface SweepItem extends SweepAsset {
  status: SweepItemStatus;
  txHash?: string;
  error?: string;
}

export function itemsFromPlan(plan: ChainSweep[]): SweepItem[] {
  return plan.flatMap((chain) =>
    chain.assets.map((asset) => ({ ...asset, status: "pending" as const }))
  );
}

// Applies a change to the named items, leaving the rest untouched.
export function markItems(
  items: SweepItem[],
  ids: readonly string[],
  patch: Partial<Pick<SweepItem, "status" | "txHash" | "error">>
): SweepItem[] {
  const targets = new Set(ids);
  return items.map((item) => (targets.has(item.id) ? { ...item, ...patch } : item));
}

// Rebuilds a plan containing only the failed items, preserving each chain's
// kind and asset order, so a retry re-sends exactly what did not land.
export function planFromFailures(plan: ChainSweep[], items: SweepItem[]): ChainSweep[] {
  const failed = new Set(items.filter((i) => i.status === "failed").map((i) => i.id));
  return plan
    .map((chain) => ({ ...chain, assets: chain.assets.filter((a) => failed.has(a.id)) }))
    .filter((chain) => chain.assets.length > 0);
}

export interface SweepCounts {
  total: number;
  done: number;
  failed: number;
}

export function sweepCounts(items: SweepItem[]): SweepCounts {
  return {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    failed: items.filter((i) => i.status === "failed").length,
  };
}
