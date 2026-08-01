"use client";

import { useState } from "react";
import { AsyncEmpty, AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { WinnerPicker } from "@/components/dashboard/earn/sponsor/winner-picker";
import { useRejectSubmissions, useSponsorSubmissions } from "@/hooks/use-earn-sponsor-listings";
import { ordinal } from "@/lib/earn/ordinal";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { RewardTier, Submission } from "@/lib/earn/api/types";

const STATUS_STYLE: Record<Submission["status"], string> = {
  winner: "border-up/30 bg-up/10 text-up",
  rejected: "border-down/30 bg-down/10 text-down",
  pending: "border-white/15 text-white/50",
};

// Short date for the "Submitted {date}" line. Returns null for a missing or
// unparseable timestamp so the line is dropped rather than showing a bad date.
function submittedOn(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function SubmissionReviewList({ slug, rewards }: { slug: string; rewards: RewardTier[] }) {
  const { submissions, isLoading, error } = useSponsorSubmissions(slug);
  const reject = useRejectSubmissions(slug);
  const [rejecting, setRejecting] = useState<string | null>(null);

  async function onReject(submission: Submission) {
    setRejecting(submission.id);
    const id = toast.loading("Rejecting…");
    try {
      await reject.mutateAsync([submission.id]);
      toast.success("Entry rejected.", { id });
    } catch (rejectError) {
      toast.error(friendlyError(rejectError, "Couldn't reject that entry."), { id });
    } finally {
      setRejecting(null);
    }
  }

  if (error) {
    return (
      <AsyncError
        error={error}
        subject="the entries"
        unconfiguredDetail="This goes live once the earn service is switched on."
      />
    );
  }

  if (isLoading) return <AsyncLoading label="Loading entries" rows={4} />;

  if (!submissions.length) {
    return <AsyncEmpty>No entries yet.</AsyncEmpty>;
  }

  return (
    <div className="flex flex-col gap-5">
      <WinnerPicker slug={slug} submissions={submissions} rewards={rewards} />

      <ul className="overflow-hidden rounded-[16px] border border-white/10">
        {submissions.map((submission) => {
          const name = submission.applicant?.username ?? "Anonymous";
          const submittedAt = submittedOn(submission.createdAt);
          const hasDetails =
            Boolean(submission.link) ||
            Boolean(submission.otherInfo) ||
            submission.eligibilityAnswers.length > 0;
          return (
            <li
              key={submission.id}
              className="border-b border-white/[0.06] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] font-sans text-[12px] font-semibold text-white/70">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-sans text-[13px] font-medium text-white/85">
                      {name}
                    </div>
                    {submittedAt ? (
                      <div className="tnum font-sans text-[11px] font-normal text-white/45">
                        Submitted {submittedAt}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-px font-sans text-[11px] font-medium capitalize ${STATUS_STYLE[submission.status]}`}
                  >
                    {submission.status === "winner"
                      ? submission.winnerPosition
                        ? `${ordinal(submission.winnerPosition)} place`
                        : "Winner"
                      : submission.status === "rejected"
                        ? "Rejected"
                        : "Pending"}
                  </span>

                  {submission.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => void onReject(submission)}
                      disabled={rejecting === submission.id}
                      className="border-down/40 bg-down/10 text-down hover:bg-down/15 cursor-pointer rounded-lg border px-3 py-1 font-sans text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {rejecting === submission.id ? "Rejecting…" : "Reject"}
                    </button>
                  ) : null}
                </div>
              </div>

              {hasDetails ? (
                <div className="mt-2.5 flex flex-col gap-2.5 sm:pl-11">
                  {submission.link ? (
                    <a
                      href={submission.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block truncate font-sans text-[12.5px] font-normal text-white/50 underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      {submission.link}
                    </a>
                  ) : null}

                  {submission.otherInfo ? (
                    <p className="font-sans text-[12.5px] leading-[1.6] font-normal whitespace-pre-line text-white/60">
                      {submission.otherInfo}
                    </p>
                  ) : null}

                  {submission.eligibilityAnswers.length ? (
                    <dl className="flex flex-col gap-2 border-t border-white/8 pt-2.5">
                      {submission.eligibilityAnswers.map((answer, index) => (
                        <div key={index}>
                          <dt className="font-sans text-[11.5px] font-medium text-white/40">
                            {answer.question}
                          </dt>
                          <dd className="font-sans text-[12.5px] font-normal text-white/70">
                            {answer.answer || "No answer"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
