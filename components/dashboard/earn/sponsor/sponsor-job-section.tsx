"use client";

import { useState } from "react";
import { AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { RewardBadge } from "@/components/dashboard/earn/reward-badge";
import { JobEditorSection } from "@/components/dashboard/earn/sponsor/job-editor-section";
import { JobProposalList } from "@/components/dashboard/earn/sponsor/job-proposal-list";
import Link from "next/link";
import { useCloseJobPost, useMyJobPost } from "@/hooks/use-earn-jobs";
import { useMyContracts } from "@/hooks/use-earn-contracts";
import { formatDeadline } from "@/lib/earn/deadline";
import { jobPostToForm } from "@/lib/earn/job-form";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { JobPost, JobPostStatus } from "@/lib/earn/api/jobs";

const PAGE = "mx-auto w-full max-w-[1520px] px-4 pt-6 pb-20 sm:px-6";

const UNCONFIGURED_DETAIL = "This goes live once the earn service is switched on.";

const STATUS_LABEL: Record<JobPostStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  HIRED: "Hired",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

const STATUS_STYLE: Record<JobPostStatus, string> = {
  DRAFT: "border-white/10 text-white/45",
  OPEN: "border-accent/40 text-accent",
  HIRED: "border-up/40 text-up",
  CLOSED: "border-white/10 text-white/35",
  CANCELLED: "border-white/10 text-white/35",
};

type Tab = "proposals" | "edit";

export function SponsorJobSection({ slug }: { slug: string }) {
  // Read from the sponsor's own list, not the public detail route: that one
  // serves published posts only, so a draft would come back empty.
  const { jobPost, isLoading, error } = useMyJobPost(slug);
  const [tab, setTab] = useState<Tab>("proposals");

  if (error) {
    return (
      <div className={PAGE}>
        <AsyncError error={error} subject="this job" unconfiguredDetail={UNCONFIGURED_DETAIL} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={PAGE}>
        <AsyncLoading label="Loading this job" rows={4} />
      </div>
    );
  }

  if (!jobPost) {
    return (
      <div className={PAGE}>
        <AsyncError error={null} subject="this job" unconfiguredDetail={UNCONFIGURED_DETAIL} />
      </div>
    );
  }

  // A draft has nobody to review yet, so it opens straight into the editor
  // rather than an empty proposals list.
  const showEditorOnly = jobPost.status === "DRAFT";

  return (
    <div className={PAGE}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="ws-display text-[clamp(22px,3vw,30px)] tracking-[-0.02em] text-white">
              {jobPost.title}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium ${STATUS_STYLE[jobPost.status]}`}
            >
              {STATUS_LABEL[jobPost.status]}
            </span>
          </div>
          <p className="mt-1 font-sans text-[13px] font-normal text-white/50">
            {jobPost.budgetType === "HOURLY" ? "Hourly" : "Fixed price"} ·{" "}
            {formatDeadline(jobPost.deadline)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <BudgetBadge jobPost={jobPost} />
          <OpenContract jobPostId={jobPost.id} />
          <CloseJob jobPost={jobPost} />
        </div>
      </header>

      {showEditorOnly ? (
        <JobEditorSection existing={jobPost} initialState={jobPostToForm(jobPost)} />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(["proposals", "edit"] as Tab[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTab(option)}
                aria-pressed={tab === option}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] transition-colors ${
                  tab === option
                    ? "border-accent bg-accent text-ink font-semibold"
                    : "border-white/10 font-medium text-white/55 hover:text-white"
                }`}
              >
                {option === "proposals" ? "Proposals" : "Edit"}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === "proposals" ? (
              <JobProposalList jobPostId={jobPost.id} />
            ) : (
              <JobEditorSection existing={jobPost} initialState={jobPostToForm(jobPost)} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Once a job is hired the work moves to its contract, so the job page needs a
// way through to it. A job post has exactly one contract, matched here through
// the sponsor's own list since the job carries no contract id.
function OpenContract({ jobPostId }: { jobPostId: string }) {
  const { asSponsor } = useMyContracts();
  const contract = asSponsor.find((c) => c.jobPostId === jobPostId);
  if (!contract) return null;

  return (
    <Link
      href={`/earn/sponsor/contract/${contract.id}`}
      className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold"
    >
      Open contract
    </Link>
  );
}

// An hourly job shows its rate; a fixed-price one shows its range. A range
// whose ends are equal reads as a single figure rather than "500 – 500".
function BudgetBadge({ jobPost }: { jobPost: JobPost }) {
  if (jobPost.budgetType === "HOURLY") {
    return (
      <span className="flex items-baseline gap-1">
        <RewardBadge reward={jobPost.hourlyRate} />
        <span className="font-sans text-[12px] font-normal text-white/45">/hr</span>
      </span>
    );
  }

  const { minBudget, maxBudget } = jobPost;
  if (minBudget && maxBudget && minBudget.minor !== maxBudget.minor) {
    return (
      <span className="flex items-baseline gap-1.5">
        <RewardBadge reward={minBudget} />
        <span className="font-sans text-[12px] font-normal text-white/45">to</span>
        <RewardBadge reward={maxBudget} />
      </span>
    );
  }
  return <RewardBadge reward={minBudget ?? maxBudget} />;
}

// Closing takes the job out of the feed. Only meaningful while it is still
// taking proposals: a hired job is already closed by the hire.
function CloseJob({ jobPost }: { jobPost: JobPost }) {
  const close = useCloseJobPost();
  const [confirming, setConfirming] = useState(false);

  if (jobPost.status !== "OPEN" && jobPost.status !== "DRAFT") return null;

  async function onClose() {
    const id = toast.loading("Closing…");
    try {
      await close.mutateAsync(jobPost.id);
      toast.success("Job closed.", { id });
      setConfirming(false);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't close that job."), { id });
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ws-inset cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white"
      >
        Close
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void onClose()}
        disabled={close.isPending}
        className="ws-inset cursor-pointer rounded-full px-4 py-2 font-sans text-[12.5px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        {close.isPending ? "Closing…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={close.isPending}
        className="cursor-pointer rounded-full px-3 py-2 font-sans text-[12.5px] font-medium text-white/55 transition-colors hover:text-white disabled:cursor-not-allowed"
      >
        Cancel
      </button>
    </span>
  );
}
