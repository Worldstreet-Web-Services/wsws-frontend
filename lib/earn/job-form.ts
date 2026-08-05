// Job post form state, its rules, and the payload the service expects.
//
// Pure: no React, no fetch. The rules the service enforces on publish are
// checked here first so a sponsor sees "set an hourly rate" under the field
// rather than as a red toast after a round trip.
//
// The bounty equivalent is lib/earn/listing-form.ts. This is deliberately its
// own module rather than a shared one: a job's budget is a range or a rate,
// where a bounty's is a total split across winning positions, and collapsing
// the two would mean a form that has to explain which half applies.

import { parseRewardInput } from "@/lib/earn/reward";
import type { DraftJobPostInput, JobBudgetType, JobPost } from "@/lib/earn/api/jobs";

// Lowercase words joined by single hyphens. Same rule as a listing slug, and
// what reads correctly in a URL.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface JobFormState {
  title: string;
  slug: string;
  description: string;
  budgetType: JobBudgetType;
  region: string;
  token: string;
  // What the sponsor typed, not numbers. Parsed at the boundary.
  minBudget: string;
  maxBudget: string;
  hourlyRate: string;
  // A datetime-local value ("2026-12-31T23:59"), not an ISO string.
  deadline: string;
  coverImage: string;
  skills: { skills: string; subskills: string[] }[];
}

export type JobFormErrors = Partial<Record<keyof JobFormState, string>>;

export function emptyJobForm(): JobFormState {
  return {
    title: "",
    slug: "",
    description: "",
    budgetType: "FIXED",
    region: "Global",
    token: "USDC",
    minBudget: "",
    maxBudget: "",
    hourlyRate: "",
    deadline: "",
    coverImage: "",
    skills: [],
  };
}

// A stored job post back into editable form state, for the update screen.
export function jobPostToForm(jobPost: JobPost): JobFormState {
  return {
    title: jobPost.title,
    slug: jobPost.slug,
    description: jobPost.description,
    budgetType: jobPost.budgetType,
    region: jobPost.region ?? "Global",
    token: jobPost.token,
    minBudget: jobPost.minBudget
      ? unitsOf(jobPost.minBudget.minor, jobPost.minBudget.decimals)
      : "",
    maxBudget: jobPost.maxBudget
      ? unitsOf(jobPost.maxBudget.minor, jobPost.maxBudget.decimals)
      : "",
    hourlyRate: jobPost.hourlyRate
      ? unitsOf(jobPost.hourlyRate.minor, jobPost.hourlyRate.decimals)
      : "",
    deadline: toLocalInput(jobPost.deadline),
    coverImage: jobPost.coverImage ?? "",
    skills: jobPost.skills,
  };
}

// A draft may be half-finished. A publish may not: the service refuses one
// without a budget set (min/max for FIXED, hourlyRate for HOURLY).
export function validateJobForm(
  state: JobFormState,
  { forPublish }: { forPublish: boolean }
): JobFormErrors {
  const errors: JobFormErrors = {};

  if (!state.title.trim()) errors.title = "Give the job a title.";
  if (!state.slug.trim()) errors.slug = "Give the job a slug.";
  else if (!SLUG_PATTERN.test(state.slug)) {
    errors.slug = "Use lowercase letters, numbers and single hyphens.";
  }

  // Whatever was typed has to be a clean amount, draft or not — a malformed
  // figure is worth catching while the sponsor is still looking at the field.
  Object.assign(errors, amountErrors(state));

  if (!forPublish) return errors;

  if (!state.description.trim()) errors.description = "Describe what needs building.";
  if (!state.skills.length) errors.skills = "Pick at least one skill.";

  if (state.budgetType === "HOURLY") {
    if (!state.hourlyRate.trim()) errors.hourlyRate ??= "Set an hourly rate.";
  } else {
    if (!state.minBudget.trim()) errors.minBudget ??= "Set the lower end of the budget.";
    if (!state.maxBudget.trim()) errors.maxBudget ??= "Set the upper end of the budget.";
    // Only compared once both parse, so a typo is reported as a bad amount
    // rather than as a backwards range.
    if (!errors.minBudget && !errors.maxBudget) {
      const min = safeParse(state.minBudget, state.token);
      const max = safeParse(state.maxBudget, state.token);
      if (min !== null && max !== null && min > max) {
        errors.maxBudget = "The upper end has to be at least the lower end.";
      }
    }
  }

  return errors;
}

// Each amount field that was filled in, checked for being a clean, positive
// decimal. Only the fields the chosen budget type actually uses.
function amountErrors(state: JobFormState): JobFormErrors {
  const errors: JobFormErrors = {};
  const fields: (keyof JobFormState)[] =
    state.budgetType === "HOURLY" ? ["hourlyRate"] : ["minBudget", "maxBudget"];

  for (const field of fields) {
    const raw = String(state[field]).trim();
    if (!raw) continue;
    try {
      if (parseRewardInput(raw, state.token) <= 0n) {
        errors[field] = "Has to be more than zero.";
      }
    } catch (error) {
      errors[field] = (error as Error).message;
    }
  }
  return errors;
}

function safeParse(value: string, token: string): bigint | null {
  try {
    return parseRewardInput(value, token);
  } catch {
    return null;
  }
}

// Builds the body the service expects. The amounts go up as plain numbers,
// which is the one place a job's money is a float — the same boundary the
// bounty payload crosses.
export function buildJobPayload(state: JobFormState, id?: string): DraftJobPostInput {
  const hourly = state.budgetType === "HOURLY";
  return {
    ...(id ? { id } : {}),
    title: state.title.trim(),
    slug: state.slug.trim(),
    description: state.description.trim(),
    budgetType: state.budgetType,
    region: state.region.trim() || "Global",
    token: state.token,
    skills: state.skills,
    ...(state.coverImage ? { coverImage: state.coverImage } : {}),
    ...(hourly
      ? { hourlyRate: toNumber(state.hourlyRate) }
      : { minBudget: toNumber(state.minBudget), maxBudget: toNumber(state.maxBudget) }),
    ...(state.deadline ? { deadline: toIso(state.deadline) } : {}),
  };
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

// ----- date helpers -----

// A datetime-local value is local wall time with no zone. Date parses it as
// local, which is what the sponsor meant.
function parseLocalInput(value: string): number | null {
  if (!value.trim()) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function toIso(value: string): string {
  const ms = parseLocalInput(value);
  return ms === null ? "" : new Date(ms).toISOString();
}

// The inverse, for loading a stored job post back into the form. Trimmed to
// minutes because that is all datetime-local accepts.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// Minor units back to the decimal string the form shows, with no trailing
// zeroes so an amount reads the way it was typed.
function unitsOf(minor: string, decimals: number): string {
  const negative = minor.startsWith("-");
  const digits = (negative ? minor.slice(1) : minor).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals ? digits.slice(digits.length - decimals).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
