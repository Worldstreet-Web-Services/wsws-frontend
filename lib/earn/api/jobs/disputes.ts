"use client";

// Raising a dispute freezes milestone approve/release and time-entry billing
// on the contract until it's resolved. Resolving only flips the contract
// back to ACTIVE — it does not itself refund or release anything; whoever
// resolves it must separately call the milestone endpoint that fits the
// outcome (see milestones.ts).

import { earnPost } from "@/lib/earn/api/client";
import {
  raiseDisputePayload,
  resolveDisputePayload,
  toDispute,
  type DisputeWire,
} from "@/lib/earn/api/jobs/wire";
import type { Dispute, RaiseDisputeInput, ResolveDisputeInput } from "@/lib/earn/api/jobs/types";

// Either party (the freelancer or a member of the owning sponsor). Sets
// Contract.status = 'DISPUTED'.
export async function raiseDispute(input: RaiseDisputeInput): Promise<Dispute> {
  const data = await earnPost<DisputeWire>("/disputes", raiseDisputePayload(input));
  const dispute = toDispute(data);
  if (!dispute) throw new Error("That dispute could not be read back.");
  return dispute;
}

// Platform admin only (role === 'GOD') — the route accepts any signed-in
// user, but the service itself rejects anyone else. No per-sponsor admin can
// call this.
export async function resolveDispute(
  id: string,
  input: ResolveDisputeInput
): Promise<Dispute | null> {
  const data = await earnPost<DisputeWire>(
    `/disputes/${encodeURIComponent(id)}/resolve`,
    resolveDisputePayload(input)
  );
  return toDispute(data);
}
