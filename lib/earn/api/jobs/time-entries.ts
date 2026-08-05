"use client";

// Hourly logging and the billing roll-up. Billing a period is an explicit
// sponsor action — there's no scheduler in this service to trigger it
// periodically. Once billed, the resulting Milestone goes through the exact
// same escrow-quote -> fund -> approve -> release flow as any fixed-price one
// (see milestones.ts).

import { earnAuthedGet, earnPost } from "@/lib/earn/api/client";
import { toMilestone, type MilestoneWire } from "@/lib/earn/api/jobs/wire";
import {
  billTimeEntriesPayload,
  createTimeEntryPayload,
  rejectTimeEntryPayload,
  toTimeEntries,
  toTimeEntry,
  type TimeEntryWire,
} from "@/lib/earn/api/jobs/wire";
import type {
  BillTimeEntriesInput,
  CreateTimeEntryInput,
  Milestone,
  RejectTimeEntryInput,
  TimeEntry,
} from "@/lib/earn/api/jobs/types";

// Freelancer only, contract must be ACTIVE and HOURLY. `hours` is capped at
// 24 per entry by the service.
export async function createTimeEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
  const data = await earnPost<TimeEntryWire>("/time-entries", createTimeEntryPayload(input));
  const entry = toTimeEntry(data);
  if (!entry) throw new Error("That time entry could not be read back.");
  return entry;
}

// Either party to the contract.
export async function fetchTimeEntries(contractId: string): Promise<TimeEntry[]> {
  const data = await earnAuthedGet<TimeEntryWire[] | { timeEntries?: TimeEntryWire[] } | null>(
    "/time-entries",
    { contractId }
  );
  return toTimeEntries(Array.isArray(data) ? data : (data?.timeEntries ?? []));
}

// From SUBMITTED.
export async function approveTimeEntry(id: string): Promise<TimeEntry | null> {
  const data = await earnPost<TimeEntryWire>(`/time-entries/${encodeURIComponent(id)}/approve`);
  return toTimeEntry(data);
}

// From SUBMITTED.
export async function rejectTimeEntry(
  id: string,
  input: RejectTimeEntryInput = {}
): Promise<TimeEntry | null> {
  const data = await earnPost<TimeEntryWire>(
    `/time-entries/${encodeURIComponent(id)}/reject`,
    rejectTimeEntryPayload(input)
  );
  return toTimeEntry(data);
}

// Rolls every APPROVED, not-yet-billed entry in [periodStart, periodEnd) on
// this contract into one new Milestone (amount = total hours x the
// contract's agreedAmount, which is the hourly rate on an HOURLY contract),
// and marks those entries BILLED. Returns the Milestone, not a TimeEntry.
export async function billTimeEntries(
  contractId: string,
  input: BillTimeEntriesInput
): Promise<Milestone> {
  const data = await earnPost<MilestoneWire>(
    `/time-entries/contract/${encodeURIComponent(contractId)}/bill`,
    billTimeEntriesPayload(input)
  );
  const milestone = toMilestone(data);
  if (!milestone) throw new Error("That billing period could not be read back.");
  return milestone;
}
