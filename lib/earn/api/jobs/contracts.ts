"use client";

// Reading a contract and marking it complete. A contract is created by
// POST /proposals/:id/hire (see proposals.ts), not from here.

import { earnAuthedGet, earnPost } from "@/lib/earn/api/client";
import { toContractDetail, toMyContracts, type ContractWire } from "@/lib/earn/api/jobs/wire";
import type { ContractDetail, MyContracts } from "@/lib/earn/api/jobs/types";

// Both sides the caller has, split by role — asFreelancer / asSponsor, not a
// flat list.
export async function fetchMyContracts(): Promise<MyContracts> {
  const data = await earnAuthedGet<{
    asFreelancer?: ContractWire[];
    asSponsor?: ContractWire[];
  } | null>("/contracts/mine");
  return toMyContracts(data);
}

// Caller must be the freelancer or a member of the owning sponsor.
export async function fetchContract(id: string): Promise<ContractDetail> {
  const data = await earnAuthedGet<ContractWire>(`/contracts/${encodeURIComponent(id)}`);
  const contract = toContractDetail(data);
  if (!contract) throw new Error("That contract could not be read.");
  return contract;
}

// From ACTIVE only. Do this before either side rates — rating requires
// COMPLETED.
export async function completeContract(id: string): Promise<ContractDetail | null> {
  const data = await earnPost<ContractWire>(`/contracts/${encodeURIComponent(id)}/complete`);
  return toContractDetail(data);
}
