"use client";

import { SelectField, TextAreaField, TextField } from "@/components/dashboard/earn/form-field";
import { slugify } from "@/lib/earn/listing-form";
import type { JobFormErrors, JobFormState } from "@/lib/earn/job-form";
import { SKILL_CATEGORIES, type SkillCategory } from "@/lib/earn/api/types";
import type { JobBudgetType } from "@/lib/earn/api/jobs";

const BUDGET_TYPES: { value: JobBudgetType; label: string }[] = [
  { value: "FIXED", label: "Fixed price" },
  { value: "HOURLY", label: "Hourly" },
];

// The tokens the service will accept, matching what the bounty form offers.
// Should come from GET /tokens/ rather than being repeated here.
const TOKENS = ["USDC", "USDT", "ETH"].map((value) => ({ value, label: value }));

const DECIMAL_INPUT = /^\d*\.?\d*$/;

interface JobFormFieldsProps {
  state: JobFormState;
  errors: JobFormErrors;
  onChange: (next: JobFormState) => void;
  // The slug is fixed once a job post exists, since it is the URL people have.
  slugLocked?: boolean;
}

export function JobFormFields({ state, errors, onChange, slugLocked = false }: JobFormFieldsProps) {
  function set<K extends keyof JobFormState>(key: K, value: JobFormState[K]) {
    onChange({ ...state, [key]: value });
  }

  // Amount fields reject anything that is not a clean decimal as it is typed,
  // rather than accepting it and failing on submit.
  function setAmount(value: string, apply: (value: string) => void) {
    if (value === "" || DECIMAL_INPUT.test(value)) apply(value);
  }

  const hourly = state.budgetType === "HOURLY";

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label="Title"
        required
        value={state.title}
        error={errors.title}
        onChange={(value) =>
          onChange({
            ...state,
            title: value,
            slug: slugLocked || state.slug ? state.slug : slugify(value),
          })
        }
      />

      <TextField
        label="Slug"
        required
        value={state.slug}
        error={errors.slug}
        hint={slugLocked ? "Fixed once a job is created." : "Lowercase words joined by hyphens."}
        onChange={(value) => {
          if (!slugLocked) set("slug", value);
        }}
      />

      <TextAreaField
        label="Description"
        required
        rows={8}
        value={state.description}
        error={errors.description}
        onChange={(value) => set("description", value)}
        placeholder="What needs building, what done looks like, and anything a freelancer has to know before they quote."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Budget type"
          value={state.budgetType}
          options={BUDGET_TYPES}
          onChange={(value) => set("budgetType", value)}
        />
        <TextField label="Region" value={state.region} onChange={(value) => set("region", value)} />
      </div>

      {/* Only the fields the chosen budget type uses are shown: a fixed-price
          job has a range to quote against, an hourly one has a rate. Showing
          both would ask the sponsor to decide which half the service reads. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Token"
          value={state.token}
          options={TOKENS}
          onChange={(value) => set("token", value)}
        />
        {hourly ? (
          <TextField
            label="Hourly rate"
            required
            value={state.hourlyRate}
            error={errors.hourlyRate}
            placeholder="85"
            hint="What one hour of this work pays."
            onChange={(value) => setAmount(value, (next) => set("hourlyRate", next))}
          />
        ) : null}
      </div>

      {hourly ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Budget from"
            required
            value={state.minBudget}
            error={errors.minBudget}
            placeholder="500"
            onChange={(value) => setAmount(value, (next) => set("minBudget", next))}
          />
          <TextField
            label="Budget to"
            required
            value={state.maxBudget}
            error={errors.maxBudget}
            placeholder="1500"
            hint="Freelancers quote inside this range."
            onChange={(value) => setAmount(value, (next) => set("maxBudget", next))}
          />
        </div>
      )}

      <TextField
        label="Deadline"
        type="datetime-local"
        value={state.deadline}
        error={errors.deadline}
        hint="Optional. When you need the work finished by."
        onChange={(value) => set("deadline", value)}
      />

      <SkillsField
        state={state}
        error={errors.skills}
        onChange={(skills) => set("skills", skills)}
      />
    </div>
  );
}

function SkillsField({
  state,
  error,
  onChange,
}: {
  state: JobFormState;
  error?: string;
  onChange: (skills: JobFormState["skills"]) => void;
}) {
  // A dropdown rather than a text field: the service takes one of a fixed set
  // and rejects anything else, so free text only produced a validation error
  // the sponsor could not act on.
  const selected = (state.skills[0]?.skills ?? "") as SkillCategory | "";

  return (
    <SelectField
      label="Skill"
      value={selected}
      error={error}
      options={[
        { value: "" as SkillCategory | "", label: "Pick a skill" },
        ...SKILL_CATEGORIES.map((skill) => ({ value: skill as SkillCategory | "", label: skill })),
      ]}
      onChange={(value) => onChange(value ? [{ skills: value, subskills: [] }] : [])}
    />
  );
}
