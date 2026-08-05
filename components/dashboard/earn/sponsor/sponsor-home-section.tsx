"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AsyncEmpty, AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { RewardBadge } from "@/components/dashboard/earn/reward-badge";
import { useCurrentSponsor } from "@/hooks/use-earn-sponsor";
import { useIsCreateAllowed, useSponsorListings } from "@/hooks/use-earn-sponsor-listings";
import { useMyJobPosts } from "@/hooks/use-earn-jobs";
import { deadlineLabel } from "@/lib/earn/deadline";
import type { ListingStatus } from "@/lib/earn/api/types";
import type { JobPost } from "@/lib/earn/api/jobs";

const PAGE = "mx-auto w-full max-w-[1520px] px-4 pt-6 pb-20 sm:px-6";

const UNCONFIGURED_DETAIL = "This goes live once the earn service is switched on.";

const STATUSES: { id: ListingStatus; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "review", label: "In review" },
  { id: "completed", label: "Completed" },
];

export function SponsorHomeSection() {
  const { sponsor, isLoading, error } = useCurrentSponsor();

  // A failed lookup must not hide the way to sign up. "We couldn't read your
  // company" and "you don't have one yet" look identical from here, and only
  // one of them has a dead end.
  if (error) {
    return (
      <div className={PAGE}>
        <AsyncError error={error} subject="your company" unconfiguredDetail={UNCONFIGURED_DETAIL} />
        <div className="mt-4 text-center">
          <Link
            href="/earn/sponsor/new"
            className="font-sans text-[12.5px] font-medium text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            Set up a company instead
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={PAGE}>
        <AsyncLoading label="Loading your company" rows={4} />
      </div>
    );
  }

  // No sponsor is the normal first visit, not a failure. Prompt rather than
  // redirect, so the user sees what they are being asked to do.
  if (!sponsor) return <NoSponsorPrompt />;

  return <SponsorListings sponsorName={sponsor.name} />;
}

function NoSponsorPrompt() {
  return (
    <div className={PAGE}>
      <div className="ws-card rounded-[20px] px-6 py-10 text-center">
        <h1 className="ws-display text-[22px] text-white">Post work, get it built</h1>
        <p className="mx-auto mt-2 max-w-[46ch] font-sans text-[13px] font-normal text-white/55">
          Set up a company page and you can publish bounties, review what comes in, and pay the
          people who ship.
        </p>
        <Link
          href="/earn/sponsor/new"
          className="bg-accent text-ink mt-6 inline-block cursor-pointer rounded-full px-5 py-2.5 font-sans text-[13px] font-semibold"
        >
          Set up your company
        </Link>
      </div>
    </div>
  );
}

function SponsorListings({ sponsorName }: { sponsorName: string }) {
  const [status, setStatus] = useState<ListingStatus>("open");
  const { allowed } = useIsCreateAllowed();

  // The sponsor's own listings rather than the public feed filtered down to
  // them. The feed cannot answer this: it never carries unpublished work, and
  // it is paged for browsing, not scoped to one company.
  const { listings, isLoading, error } = useSponsorListings();

  // A listing the service did not report on counts as published here and is
  // left off the drafts screen, so every listing shows up in exactly one of
  // the two views.
  const published = useMemo(
    () => listings.filter((listing) => listing.isPublished !== false),
    [listings]
  );
  const draftCount = listings.length - published.length;
  const mine = useMemo(
    () => published.filter((listing) => listing.status === status),
    [published, status]
  );

  return (
    <div className={PAGE}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ws-display text-[clamp(22px,3vw,30px)] tracking-[-0.02em] text-white">
            {sponsorName}
          </h1>
          <p className="mt-1 font-sans text-[13px] font-normal text-white/50">
            Your published listings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/earn/sponsor/drafts"
            className="ws-inset cursor-pointer rounded-full px-4 py-2.5 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white"
          >
            Drafts{draftCount > 0 ? ` (${draftCount})` : ""}
          </Link>

          <Link
            href="/earn/sponsor/job/new"
            className="ws-inset cursor-pointer rounded-full px-4 py-2.5 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white"
          >
            New job
          </Link>

          {allowed ? (
            <Link
              href="/earn/sponsor/listing/new"
              className="bg-accent text-ink cursor-pointer rounded-full px-4 py-2.5 font-sans text-[12.5px] font-semibold"
            >
              New listing
            </Link>
          ) : (
            <span className="ws-inset rounded-full px-4 py-2.5 font-sans text-[12.5px] font-medium text-white/40">
              Listing limit reached
            </span>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setStatus(option.id)}
            aria-pressed={status === option.id}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] transition-colors ${
              status === option.id
                ? "border-accent bg-accent text-ink font-semibold"
                : "border-white/10 font-medium text-white/55 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {error ? (
          <AsyncError
            error={error}
            subject="your listings"
            unconfiguredDetail={UNCONFIGURED_DETAIL}
          />
        ) : isLoading ? (
          <AsyncLoading label="Loading your listings" rows={3} />
        ) : mine.length === 0 ? (
          <AsyncEmpty>
            {draftCount > 0 ? (
              <>
                Nothing published under this status.{" "}
                <Link
                  href="/earn/sponsor/drafts"
                  className="text-white/70 underline-offset-2 hover:underline"
                >
                  You have {draftCount} {draftCount === 1 ? "draft" : "drafts"} waiting.
                </Link>
              </>
            ) : (
              "Nothing here yet. Drafts stay hidden until you publish them."
            )}
          </AsyncEmpty>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {mine.map((listing) => {
              const deadline = deadlineLabel(listing.deadline);
              return (
                <li key={listing.id}>
                  <Link
                    href={`/earn/sponsor/listing/${listing.slug}?type=${listing.type}`}
                    className="ws-card flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition-colors hover:border-white/25"
                  >
                    <div className="min-w-0">
                      <div className="ws-display truncate text-[14.5px] text-white">
                        {listing.title}
                      </div>
                      <div className="tnum mt-0.5 font-sans text-[12px] font-normal text-white/45">
                        {listing.submissionCount}{" "}
                        {listing.submissionCount === 1 ? "entry" : "entries"} · {deadline.text}
                      </div>
                    </div>
                    <RewardBadge reward={listing.reward} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SponsorJobs />
    </div>
  );
}

// Jobs are a parallel system to bounty listings, not a filter of them: a job
// takes proposals and ends in a contract, where a listing takes submissions
// and ends in an announced winner. They share this screen because they are
// both "work this company has posted", and nothing else.
function SponsorJobs() {
  const { jobPosts, isLoading, error } = useMyJobPosts();

  return (
    <section className="mt-10">
      <h2 className="ws-display text-[16px] text-white">Jobs</h2>
      <p className="mt-1 font-sans text-[13px] font-normal text-white/50">
        Ongoing work, hired through proposals.
      </p>

      <div className="mt-4">
        {error ? (
          <AsyncError error={error} subject="your jobs" unconfiguredDetail={UNCONFIGURED_DETAIL} />
        ) : isLoading ? (
          <AsyncLoading label="Loading your jobs" rows={2} />
        ) : jobPosts.length === 0 ? (
          // Says so rather than rendering nothing: a sponsor who has never
          // posted a job would otherwise have no way to tell the feature is
          // there at all.
          <AsyncEmpty>
            No jobs yet.{" "}
            <Link
              href="/earn/sponsor/job/new"
              className="text-white/70 underline-offset-2 hover:underline"
            >
              Post one
            </Link>{" "}
            to start taking proposals.
          </AsyncEmpty>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {jobPosts.map((jobPost) => (
              <li key={jobPost.id}>
                <Link
                  href={`/earn/sponsor/job/${jobPost.slug}`}
                  className="ws-card flex items-center justify-between gap-4 rounded-[16px] px-4 py-3.5 transition-colors hover:border-white/25"
                >
                  <div className="min-w-0">
                    <div className="ws-display truncate text-[14.5px] text-white">
                      {jobPost.title}
                    </div>
                    <div className="mt-0.5 font-sans text-[12px] font-normal text-white/45">
                      {jobStatusLabel(jobPost)} · {deadlineLabel(jobPost.deadline).text}
                    </div>
                  </div>
                  <RewardBadge reward={jobBudget(jobPost)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function jobStatusLabel(jobPost: JobPost): string {
  if (jobPost.status === "DRAFT") return "Draft";
  if (jobPost.status === "HIRED") return "Hired";
  if (jobPost.status === "OPEN") return "Taking proposals";
  return jobPost.status === "CANCELLED" ? "Cancelled" : "Closed";
}

// One figure for a row: the rate on an hourly job, the low end of the range on
// a fixed-price one. The detail page shows the full range.
function jobBudget(jobPost: JobPost) {
  return jobPost.budgetType === "HOURLY"
    ? jobPost.hourlyRate
    : (jobPost.minBudget ?? jobPost.maxBudget);
}
