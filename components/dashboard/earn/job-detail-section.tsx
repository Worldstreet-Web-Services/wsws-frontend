"use client";

import { useMemo, useState } from "react";
import { AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { RewardBadge } from "@/components/dashboard/earn/reward-badge";
import { ProposeSheet } from "@/components/dashboard/earn/propose-sheet";
import { useJobPost, useMyProposals } from "@/hooks/use-earn-jobs";
import { deadlineLabel, formatDeadline } from "@/lib/earn/deadline";
import type { JobPost, ProposalStatus } from "@/lib/earn/api/jobs";

const PAGE = "mx-auto w-full max-w-[1520px] px-4 pt-6 pb-20 sm:px-6 lg:px-8";

const UNCONFIGURED_DETAIL = "Jobs go live once the earn service is switched on.";

const APPLIED_LABEL: Partial<Record<ProposalStatus, string>> = {
  SUBMITTED: "You've applied. The company is reviewing proposals.",
  SHORTLISTED: "You've been shortlisted.",
  ACCEPTED: "You got this one. Your contract is open.",
  REJECTED: "This one went to somebody else.",
  WITHDRAWN: "You withdrew your proposal.",
};

export function JobDetailSection({ slug }: { slug: string | null }) {
  const { jobPost, isLoading, error } = useJobPost(slug);
  // The service has no "did I apply to this" endpoint, so the caller's own
  // proposal list answers it. Cheap: it is one request the applications
  // screen already makes, and React Query shares the cache entry.
  const { proposals } = useMyProposals();
  const [proposeOpen, setProposeOpen] = useState(false);

  // Only an active proposal blocks a new one — the service accepts a fresh
  // proposal once the previous was withdrawn or rejected, so a dead one must
  // not sit here holding the apply button shut. The most recent is shown
  // either way, since "you were turned down" is still worth saying.
  const mine = useMemo(() => {
    if (!jobPost) return undefined;
    const forJob = proposals.filter((proposal) => proposal.jobPostId === jobPost.id);
    return forJob.find((p) => p.status !== "WITHDRAWN" && p.status !== "REJECTED") ?? forJob[0];
  }, [proposals, jobPost]);

  const blocked = !!mine && mine.status !== "WITHDRAWN" && mine.status !== "REJECTED";

  if (error) {
    return (
      <div className={PAGE}>
        <AsyncError error={error} subject="this job" unconfiguredDetail={UNCONFIGURED_DETAIL} />
      </div>
    );
  }

  if (isLoading || !jobPost) {
    return (
      <div className={PAGE}>
        <AsyncLoading label="Loading the job" rows={6} />
      </div>
    );
  }

  const deadline = deadlineLabel(jobPost.deadline);
  // Only an OPEN job takes proposals: once somebody is hired the service closes
  // it, and a draft was never public in the first place.
  const canApply = !blocked && !deadline.closed && jobPost.status === "OPEN";

  return (
    <div className={PAGE}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article>
          {jobPost.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={jobPost.coverImage}
              alt=""
              className="mb-6 h-[180px] w-full rounded-[20px] border border-white/10 object-cover sm:h-[260px]"
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 px-2.5 py-1 font-sans text-[11.5px] font-medium text-white/55">
              {jobPost.budgetType === "HOURLY" ? "Hourly" : "Fixed price"}
            </span>
            {jobPost.region ? (
              <span className="rounded-full border border-white/10 px-2.5 py-1 font-sans text-[11.5px] font-medium text-white/55">
                {jobPost.region}
              </span>
            ) : null}
          </div>

          <h1 className="ws-display mt-4 text-[clamp(24px,3.4vw,34px)] tracking-[-0.02em] text-white">
            {jobPost.title}
          </h1>

          <Description text={jobPost.description} />

          {jobPost.skills.length ? (
            <section className="mt-7">
              <h2 className="ws-display text-[15px] text-white/85">Skills</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {jobPost.skills.flatMap((group) =>
                  group.subskills.length
                    ? group.subskills.map((sub) => <Tag key={`${group.skills}-${sub}`}>{sub}</Tag>)
                    : [<Tag key={group.skills}>{group.skills}</Tag>]
                )}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="ws-card flex flex-col gap-4 rounded-[20px] p-5">
            <div>
              <div className="font-sans text-[12px] font-normal text-white/45">
                {jobPost.budgetType === "HOURLY" ? "Hourly rate" : "Budget"}
              </div>
              <div className="mt-1">
                <Budget jobPost={jobPost} />
              </div>
            </div>

            <div>
              <div className="font-sans text-[12px] font-normal text-white/45">Deadline</div>
              <div
                className={`tnum mt-0.5 font-sans text-[13px] font-medium ${
                  deadline.closed ? "text-white/35" : "text-white/80"
                }`}
              >
                {formatDeadline(jobPost.deadline)}
              </div>
            </div>

            {blocked && mine ? (
              <div className="ws-inset rounded-[14px] px-4 py-3">
                <div className="font-sans text-[12.5px] font-normal text-white/70">
                  {APPLIED_LABEL[mine.status] ?? "You've applied."}
                </div>
              </div>
            ) : canApply ? (
              <div className="flex flex-col gap-2">
                {/* A previous proposal that went nowhere is still worth saying,
                    since applying again is now allowed and the reason matters. */}
                {mine ? (
                  <div className="font-sans text-[12px] font-normal text-white/45">
                    {APPLIED_LABEL[mine.status]} You can send another.
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setProposeOpen(true)}
                  className="bg-accent text-ink cursor-pointer rounded-full px-5 py-3 font-sans text-[13px] font-semibold transition-opacity hover:opacity-90"
                >
                  {mine ? "Send a new proposal" : "Send a proposal"}
                </button>
              </div>
            ) : (
              <div className="ws-inset rounded-[14px] px-4 py-3 text-center">
                <div className="font-sans text-[12.5px] font-normal text-white/55">
                  {jobPost.status === "HIRED"
                    ? "Somebody has been hired for this."
                    : deadline.closed
                      ? "This job has closed."
                      : "This job isn't taking proposals."}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <ProposeSheet open={proposeOpen} onClose={() => setProposeOpen(false)} jobPost={jobPost} />
    </div>
  );
}

function Budget({ jobPost }: { jobPost: JobPost }) {
  if (jobPost.budgetType === "HOURLY") {
    return (
      <span className="flex items-baseline gap-1">
        <RewardBadge reward={jobPost.hourlyRate} size="lg" />
        <span className="font-sans text-[12px] font-normal text-white/45">/hr</span>
      </span>
    );
  }

  const { minBudget, maxBudget } = jobPost;
  if (minBudget && maxBudget && minBudget.minor !== maxBudget.minor) {
    return (
      <span className="flex flex-wrap items-baseline gap-1.5">
        <RewardBadge reward={minBudget} size="lg" />
        <span className="font-sans text-[12px] font-normal text-white/45">to</span>
        <RewardBadge reward={maxBudget} size="lg" />
      </span>
    );
  }
  return <RewardBadge reward={minBudget ?? maxBudget} size="lg" />;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 px-2.5 py-1 font-sans text-[11.5px] font-medium text-white/55">
      {children}
    </span>
  );
}

// Descriptions arrive as plain text from the service. Rendering them as HTML
// would let a company inject markup into everyone else's browser, so paragraphs
// are split on blank lines and nothing else is interpreted.
function Description({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  if (!paragraphs.length) return null;

  return (
    <div className="mt-5 flex flex-col gap-3">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="font-sans text-[13.5px] leading-[1.7] font-normal whitespace-pre-line text-white/70"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
