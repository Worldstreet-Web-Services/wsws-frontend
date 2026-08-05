"use client";

import Link from "next/link";
import { RewardBadge } from "@/components/dashboard/earn/reward-badge";
import { deadlineLabel } from "@/lib/earn/deadline";
import type { JobPost } from "@/lib/earn/api/jobs";

// A job's budget reads differently from a bounty's reward: an hourly job has a
// rate, a fixed-price one has a range the freelancer quotes inside. Neither is
// a single "this is what you get" figure, so the card says which it is.
function Budget({ jobPost }: { jobPost: JobPost }) {
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

// `featured` puts the animated border beam on the first card, matching how the
// bounty feed marks the one thing it wants looked at first.
export function JobCard({ jobPost, featured = false }: { jobPost: JobPost; featured?: boolean }) {
  const deadline = deadlineLabel(jobPost.deadline);
  const skill = jobPost.skills[0]?.skills;

  return (
    <Link
      href={`/earn/job/${jobPost.slug}`}
      className={`ws-card relative flex flex-col gap-3 overflow-hidden rounded-[20px] p-5 transition-colors hover:border-white/25 ${featured ? "ws-beam" : ""}`}
    >
      <div className="min-w-0">
        <div className="ws-display truncate text-[16px] text-white">{jobPost.title}</div>
        <div className="mt-1 line-clamp-2 font-sans text-[12.5px] leading-[1.5] font-normal text-white/50">
          {jobPost.description || "No description yet."}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 px-2.5 py-1 font-sans text-[11.5px] font-medium text-white/55">
          {jobPost.budgetType === "HOURLY" ? "Hourly" : "Fixed price"}
        </span>
        {jobPost.region ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 font-sans text-[11.5px] font-medium text-white/55">
            {jobPost.region}
          </span>
        ) : null}
        {skill ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 font-sans text-[11.5px] font-medium text-white/55">
            {skill}
          </span>
        ) : null}
      </div>

      <div className="mt-1 flex items-end justify-between gap-4">
        <Budget jobPost={jobPost} />
        <div
          className={`tnum text-right font-sans text-[12.5px] font-medium ${
            deadline.closed ? "text-white/35" : "text-white/60"
          }`}
        >
          {deadline.text}
        </div>
      </div>
    </Link>
  );
}
