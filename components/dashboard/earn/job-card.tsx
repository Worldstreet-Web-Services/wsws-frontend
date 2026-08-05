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
  const hourly = jobPost.budgetType === "HOURLY";

  return (
    <Link
      href={`/earn/job/${jobPost.slug}`}
      className={`ws-card group relative flex flex-col overflow-hidden rounded-[20px] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 ${featured ? "ws-beam" : ""}`}
    >
      {/* A soft top-left wash so a grid of cards has depth instead of reading
          as flat rectangles. Silver, per the monochrome brand — the palette
          keeps colour semantic (up/down), not decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 bg-[radial-gradient(circle,rgba(212,212,216,0.10),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-3">
        {/* The budget type leads: it is the first thing that decides whether a
            job is worth reading, and it separates the two feeds at a glance. */}
        <span
          className={`rounded-full border px-2.5 py-1 font-sans text-[11px] font-semibold tracking-[0.02em] ${
            hourly
              ? "border-accent/35 text-accent bg-white/[0.04]"
              : "border-white/15 bg-white/[0.04] text-white/70"
          }`}
        >
          {hourly ? "Hourly" : "Fixed price"}
        </span>
        <span
          className={`tnum shrink-0 font-sans text-[11.5px] font-medium ${
            deadline.closed ? "text-white/30" : "text-white/45"
          }`}
        >
          {deadline.text}
        </span>
      </div>

      <div className="mt-3.5 min-w-0">
        <div className="ws-display truncate text-[16.5px] text-white">{jobPost.title}</div>
        <div className="mt-1.5 line-clamp-2 font-sans text-[12.5px] leading-[1.55] font-normal text-white/45">
          {jobPost.description || "No description yet."}
        </div>
      </div>

      {jobPost.region || skill ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {skill ? <Chip>{skill}</Chip> : null}
          {jobPost.region ? <Chip>{jobPost.region}</Chip> : null}
        </div>
      ) : null}

      {/* Pushed to the bottom so the money line sits on the card's edge no
          matter how short the description is, keeping a grid of cards aligned. */}
      <div className="mt-auto flex items-end justify-between gap-4 border-t border-white/[0.07] pt-4">
        <Budget jobPost={jobPost} />
        <span className="font-sans text-[12px] font-medium text-white/35 transition-colors group-hover:text-white/70">
          View →
        </span>
      </div>
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.09] bg-white/[0.03] px-2.5 py-1 font-sans text-[11px] font-medium text-white/50">
      {children}
    </span>
  );
}
