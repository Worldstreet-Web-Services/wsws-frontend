"use client";

import { useRef, useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextAreaField, TextField } from "@/components/dashboard/earn/form-field";
import { TalentProfileForm } from "@/components/dashboard/earn/talent-profile-form";
import { AsyncLoading } from "@/components/dashboard/async-state";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { useCreateProposal } from "@/hooks/use-earn-jobs";
import { useTalentProfile } from "@/hooks/use-earn-talent";
import { useScrollToFirstError } from "@/hooks/use-scroll-to-first-error";
import { formatReward } from "@/lib/earn/reward";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { JobPost } from "@/lib/earn/api/jobs";

const DECIMAL_INPUT = /^\d*\.?\d*$/;

const MAX_ATTACHMENTS = 10;

// Quoting for a job. Like the bounty submit sheet, the talent profile is a
// prerequisite rather than a step: the service refuses work from an account
// that has not filled one in, so the sheet asks for that first rather than
// letting somebody write a cover letter and lose it to a rejection.
export function ProposeSheet({
  open,
  onClose,
  jobPost,
}: {
  open: boolean;
  onClose: () => void;
  jobPost: JobPost;
}) {
  const create = useCreateProposal();
  const { profile, needsProfile, isLoading: profileLoading } = useTalentProfile();
  const [coverLetter, setCoverLetter] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  useScrollToFirstError(formRef, errors);

  const hourly = jobPost.budgetType === "HOURLY";

  function reset() {
    setCoverLetter("");
    setAmount("");
    setDuration("");
    setAttachments([]);
    setErrors({});
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!coverLetter.trim()) found.coverLetter = "Say why you're the right person for this.";

    const quoted = Number(amount);
    if (!amount.trim() || !Number.isFinite(quoted) || quoted <= 0) {
      found.amount = hourly ? "Quote your hourly rate." : "Quote what you'd charge.";
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    const id = toast.loading("Sending your proposal…");
    try {
      await create.mutateAsync({
        jobPostId: jobPost.id,
        coverLetter: coverLetter.trim(),
        proposedAmount: quoted,
        ...(duration.trim() ? { proposedDuration: duration.trim() } : {}),
        // Only sent when there is something to send: the service validates
        // these, and an empty array is noise on a proposal that is just text.
        ...(attachments.length ? { attachments } : {}),
      });
      toast.success("Your proposal is in. Good luck.", { id });
      reset();
      onClose();
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't send that proposal."), { id });
    }
  }

  if (profileLoading || needsProfile === undefined) {
    return (
      <ModalShell open={open} onClose={onClose}>
        <div className="p-5">
          <AsyncLoading label="Loading your profile" rows={3} />
        </div>
      </ModalShell>
    );
  }

  if (needsProfile) {
    return (
      <ModalShell open={open} onClose={onClose}>
        <div className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="ws-display text-[18px] text-white">First, your profile</h2>
            <p className="mt-1 font-sans text-[12.5px] font-normal text-white/50">
              Companies see this when they review your proposal. You only fill it in once.
            </p>
          </div>
          {/* Nothing to do on completion: saving invalidates the profile query,
              `needsProfile` turns false, and this sheet re-renders as the
              proposal form with the job still in hand. */}
          <TalentProfileForm
            existing={profile}
            onDone={() => undefined}
            submitLabel="Save and continue"
          />
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell open={open} onClose={onClose}>
      {/* noValidate: the sheet reports its own errors inline, so the browser's
          native validation must not block submit before those checks run. */}
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex max-h-[80vh] flex-col">
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <div>
            <h2 className="ws-display text-[18px] text-white">Send a proposal</h2>
            <p className="mt-1 truncate font-sans text-[12.5px] font-normal text-white/50">
              {jobPost.title}
            </p>
          </div>

          <TextAreaField
            label="Cover letter"
            required
            rows={6}
            value={coverLetter}
            error={errors.coverLetter}
            onChange={setCoverLetter}
            placeholder="What you'd do, how you'd approach it, and anything you've built that's close."
          />

          <TextField
            label={hourly ? `Your hourly rate (${jobPost.token})` : `Your quote (${jobPost.token})`}
            required
            value={amount}
            error={errors.amount}
            placeholder={hourly ? "85" : "1000"}
            hint={budgetHint(jobPost)}
            onChange={(value) => {
              // Digits and a single decimal point, rejected as typed rather
              // than accepted and failed on submit.
              if (value === "" || DECIMAL_INPUT.test(value)) setAmount(value);
            }}
          />

          <AttachmentsField value={attachments} onChange={setAttachments} />

          <TextField
            label="How long you'd need"
            value={duration}
            onChange={setDuration}
            placeholder="2 weeks"
            hint="Optional. Roughly how long the work would take."
          />
        </div>

        {/* Pinned, so a long cover letter never pushes the actions out of reach. */}
        <div className="flex gap-2 border-t border-white/8 p-5">
          <button
            type="button"
            onClick={onClose}
            className="ws-inset flex-1 cursor-pointer rounded-full px-4 py-2.5 font-sans text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="bg-accent text-ink flex-1 cursor-pointer rounded-full px-4 py-2.5 font-sans text-[13px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {create.isPending ? "Sending…" : "Send proposal"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// Work worth showing rather than describing: a mockup, a screenshot of
// something close you have already built. Uploaded through the same signed
// path as every other image on the platform, so nothing arbitrary is stored.
function AttachmentsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {value.map((url, index) => (
        <div key={url} className="flex items-center gap-3">
          {/* An arbitrary remote URL, so a plain img rather than the Next loader. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="size-12 shrink-0 rounded-[10px] border border-white/10 object-cover"
          />
          <span className="min-w-0 flex-1 truncate font-sans text-[12px] font-normal text-white/45">
            Attachment {index + 1}
          </span>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            aria-label={`Remove attachment ${index + 1}`}
            className="shrink-0 cursor-pointer rounded-lg border border-white/12 px-2.5 py-2 font-sans text-[12px] text-white/50 hover:text-white"
          >
            Remove
          </button>
        </div>
      ))}

      {value.length < MAX_ATTACHMENTS ? (
        <ImageUploadField
          label="Work samples"
          source="description"
          value=""
          hint="Optional. PNG, JPEG or WebP, up to 5MB."
          onChange={(url) => onChange([...value, url])}
        />
      ) : null}
    </div>
  );
}

// What the company said they'd pay, so a quote is not made blind. Deliberately
// a hint rather than a hard bound: the service does not enforce the range, and
// a freelancer worth more than the ceiling should still be able to say so.
function budgetHint(jobPost: JobPost): string | undefined {
  if (jobPost.budgetType === "HOURLY") {
    return jobPost.hourlyRate
      ? `They budgeted ${formatReward(jobPost.hourlyRate)} an hour.`
      : undefined;
  }
  const { minBudget, maxBudget } = jobPost;
  if (minBudget && maxBudget) {
    return `They budgeted ${formatReward(minBudget)} to ${formatReward(maxBudget)}.`;
  }
  const one = minBudget ?? maxBudget;
  return one ? `They budgeted ${formatReward(one)}.` : undefined;
}
