"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JobFormFields } from "@/components/dashboard/earn/sponsor/job-form-fields";
import { usePublishJobPost, useSaveJobPostDraft, useUpdateJobPost } from "@/hooks/use-earn-jobs";
import { useScrollToFirstError } from "@/hooks/use-scroll-to-first-error";
import {
  buildJobPayload,
  emptyJobForm,
  validateJobForm,
  type JobFormErrors,
  type JobFormState,
} from "@/lib/earn/job-form";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { JobPost } from "@/lib/earn/api/jobs";

const PAGE = "mx-auto w-full max-w-[720px] px-4 pt-6 pb-20 sm:px-6";

interface JobEditorProps {
  // Set when editing an existing job post rather than starting a new one.
  existing?: JobPost;
  initialState?: JobFormState;
}

// One editor for both creating and updating. A new job is saved as a draft
// first because publish takes the id the draft call returns, so the two steps
// cannot be collapsed into one — the same shape as the bounty listing editor.
//
// Unlike a bounty, publishing a job needs no escrow: money only moves once
// somebody is hired and a milestone is funded, so there is no funding gate
// between draft and live.
export function JobEditorSection({ existing, initialState }: JobEditorProps) {
  const router = useRouter();
  const [state, setState] = useState<JobFormState>(initialState ?? emptyJobForm());
  const [errors, setErrors] = useState<JobFormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  useScrollToFirstError(formRef, errors);
  // The id of the draft this editor has already saved, so a second save
  // updates it rather than creating another job post.
  const [draftId, setDraftId] = useState<string | null>(existing?.id ?? null);

  const saveDraft = useSaveJobPostDraft();
  const publish = usePublishJobPost();
  const update = useUpdateJobPost();

  const busy = saveDraft.isPending || publish.isPending || update.isPending;

  // An existing post that was never published. It is edited like any other,
  // but it also still needs the publish step a new one gets.
  const isDraft = !!existing && !existing.isPublished;
  // A live post goes through /update instead: the draft endpoint only accepts
  // a post still in DRAFT, so saving a published one through it would fail.
  const isLive = !!existing && !isDraft;

  async function onUpdate() {
    if (!existing) return;
    const found = validateJobForm(state, { forPublish: true });
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Fix the highlighted fields first.");
      return;
    }

    const id = toast.loading("Saving your changes…");
    try {
      // budgetType is deliberately not sent: it is locked once published, and
      // the service rejects an attempt to change it.
      const payload = buildJobPayload(state);
      await update.mutateAsync({
        id: existing.id,
        input: {
          title: payload.title,
          description: payload.description,
          skills: payload.skills,
          region: payload.region,
          token: payload.token,
          ...(payload.minBudget != null ? { minBudget: payload.minBudget } : {}),
          ...(payload.maxBudget != null ? { maxBudget: payload.maxBudget } : {}),
          ...(payload.hourlyRate != null ? { hourlyRate: payload.hourlyRate } : {}),
          ...(payload.deadline ? { deadline: payload.deadline } : {}),
        },
      });
      toast.success("Job updated.", { id });
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't save those changes."), { id });
    }
  }

  async function onSaveDraft() {
    const found = validateJobForm(state, { forPublish: false });
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Fix the highlighted fields first.");
      return;
    }

    const id = toast.loading("Saving your draft…");
    try {
      const jobPost = await saveDraft.mutateAsync(buildJobPayload(state, draftId ?? undefined));
      setDraftId(jobPost.id);
      toast.success("Draft saved.", { id });
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't save that draft."), { id });
    }
  }

  async function onPublish() {
    const found = validateJobForm(state, { forPublish: true });
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error("Fix the highlighted fields first.");
      return;
    }

    const id = toast.loading("Saving…");
    let jobPost;
    try {
      // Saved first so publish acts on what is on screen, not on whatever was
      // last written. It also mints the id publish needs.
      jobPost = await saveDraft.mutateAsync(buildJobPayload(state, draftId ?? undefined));
      setDraftId(jobPost.id);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't save that job."), { id });
      return;
    }

    try {
      await publish.mutateAsync(jobPost.id);
      toast.success("Your job is live.", { id });
      router.push(`/earn/sponsor/job/${jobPost.slug}`);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't publish that job."), { id });
    }
  }

  return (
    <div className={PAGE}>
      <h1 className="ws-display text-[clamp(22px,3vw,30px)] tracking-[-0.02em] text-white">
        {!existing ? "New job" : isDraft ? "Edit draft" : "Edit job"}
      </h1>
      <p className="mt-1.5 font-sans text-[13px] font-normal text-white/50">
        {existing && !isDraft
          ? "Changes go live as soon as you save them."
          : "Save a draft as you go. Nothing is public until you publish."}
      </p>

      <form
        ref={formRef}
        onSubmit={(event) => event.preventDefault()}
        className="mt-7"
        aria-busy={busy}
      >
        <JobFormFields
          state={state}
          errors={errors}
          onChange={setState}
          slugLocked={!!existing}
          budgetTypeLocked={isLive}
        />

        {/* A live job is already public: there is no draft to save and nothing
            to publish, so it gets one action that edits it in place. */}
        <div className="mt-7 flex flex-wrap gap-2.5">
          {isLive ? (
            <button
              type="button"
              onClick={onUpdate}
              disabled={busy}
              className="bg-accent text-ink flex-1 cursor-pointer rounded-full px-5 py-3 font-sans text-[13px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={busy}
                className="ws-inset flex-1 cursor-pointer rounded-full px-5 py-3 font-sans text-[13px] font-semibold text-white/75 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saveDraft.isPending ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={onPublish}
                disabled={busy}
                className="bg-accent text-ink flex-1 cursor-pointer rounded-full px-5 py-3 font-sans text-[13px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publish.isPending ? "Publishing…" : "Publish"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
