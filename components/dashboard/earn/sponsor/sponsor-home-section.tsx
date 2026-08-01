"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AsyncEmpty, AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { useCurrentSponsor } from "@/hooks/use-earn-sponsor";
import { useIsCreateAllowed } from "@/hooks/use-earn-sponsor-listings";
import { useListingFeed } from "@/hooks/use-earn-listings";
import { deadlineLabel } from "@/lib/earn/deadline";
import { formatReward } from "@/lib/earn/reward";
import { DEFAULT_BROWSE_QUERY, type ListingStatus, type RewardAmount } from "@/lib/earn/api/types";

const PAGE = "mx-auto w-full max-w-[900px] px-4 pt-6 pb-20 sm:px-6";

const UNCONFIGURED_DETAIL = "This goes live once the earn service is switched on.";

const STATUSES: { id: ListingStatus; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "review", label: "In review" },
  { id: "completed", label: "Completed" },
];

// Row grid shared by the table header and its rows so the columns line up.
const ROW_COLUMNS = "sm:grid-cols-[minmax(0,1fr)_84px_104px_148px_112px]";

const STATUS_PILL: Record<ListingStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "border-accent/40 text-accent" },
  review: { label: "In review", className: "border-white/15 text-white/50" },
  completed: { label: "Completed", className: "border-up/30 bg-up/10 text-up" },
  closed: { label: "Closed", className: "border-white/15 text-white/50" },
};

function ListingStatusPill({ status }: { status: ListingStatus }) {
  const pill = STATUS_PILL[status];
  return (
    <span
      className={`rounded-full border px-2 py-px font-sans text-[11px] capitalize ${pill.className}`}
    >
      {pill.label}
    </span>
  );
}

// Splits the formatted reward so the token symbol sits lighter than the amount,
// the way the money column reads on Superteam. Keeps the muted note for a
// listing whose reward never loaded.
function PrizeCell({ reward }: { reward: RewardAmount | null }) {
  if (!reward) {
    return <span className="ws-display text-[13px] text-white/35">Reward not set</span>;
  }
  const text = formatReward(reward);
  const split = text.lastIndexOf(" ");
  return (
    <span className="ws-display tnum text-[13.5px]">
      <span className="font-semibold text-white">{text.slice(0, split)}</span>{" "}
      <span className="text-white/40">{text.slice(split + 1)}</span>
    </span>
  );
}

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

  return <SponsorListings sponsorSlug={sponsor.slug} sponsorName={sponsor.name} />;
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

function SponsorListings({
  sponsorSlug,
  sponsorName,
}: {
  sponsorSlug: string;
  sponsorName: string;
}) {
  const [status, setStatus] = useState<ListingStatus>("open");
  const { allowed } = useIsCreateAllowed();

  // Stopgap. The MVP has no endpoint that lists a sponsor's own listings, only
  // one that reads a single listing by slug, so this filters the public feed
  // down to this company. It cannot show unpublished drafts, which never reach
  // that feed. Replace once the service exposes GET /sponsor-dashboard/listings.
  const { listings, isLoading, error } = useListingFeed({ ...DEFAULT_BROWSE_QUERY, status });
  const mine = useMemo(
    () => listings.filter((listing) => listing.sponsor?.slug === sponsorSlug),
    [listings, sponsorSlug]
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
          <AsyncEmpty>Nothing here yet. Drafts stay hidden until you publish them.</AsyncEmpty>
        ) : (
          <div className="overflow-hidden rounded-[16px] border border-white/10">
            <div
              className={`hidden items-center gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-2.5 sm:grid ${ROW_COLUMNS}`}
            >
              <span className="font-sans text-[11px] font-medium tracking-[0.06em] text-white/40 uppercase">
                Listing
              </span>
              <span className="text-right font-sans text-[11px] font-medium tracking-[0.06em] text-white/40 uppercase">
                Entries
              </span>
              <span className="text-right font-sans text-[11px] font-medium tracking-[0.06em] text-white/40 uppercase">
                Deadline
              </span>
              <span className="text-right font-sans text-[11px] font-medium tracking-[0.06em] text-white/40 uppercase">
                Prize
              </span>
              <span className="text-right font-sans text-[11px] font-medium tracking-[0.06em] text-white/40 uppercase">
                Status
              </span>
            </div>

            <ul className="divide-y divide-white/[0.06]">
              {mine.map((listing) => {
                const deadline = deadlineLabel(listing.deadline);
                const entries = `${listing.submissionCount} ${
                  listing.submissionCount === 1 ? "entry" : "entries"
                }`;
                return (
                  <li key={listing.id}>
                    <Link
                      href={`/earn/sponsor/listing/${listing.slug}?type=${listing.type}`}
                      className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04] ${ROW_COLUMNS}`}
                    >
                      <div className="min-w-0">
                        <span className="font-sans text-[10px] font-medium tracking-[0.08em] text-white/35 uppercase">
                          {listing.type}
                        </span>
                        <div className="truncate font-sans text-[14px] font-medium text-white group-hover:underline">
                          {listing.title}
                        </div>
                        <div className="tnum mt-0.5 font-sans text-[12px] font-normal text-white/45 sm:hidden">
                          {entries} · {deadline.text}
                        </div>
                      </div>

                      <div className="tnum hidden text-right font-sans text-[13px] font-normal text-white/55 sm:block">
                        {listing.submissionCount}
                      </div>
                      <div className="tnum hidden text-right font-sans text-[13px] font-normal text-white/55 sm:block">
                        {deadline.text}
                      </div>
                      <div className="hidden text-right sm:block">
                        <PrizeCell reward={listing.reward} />
                      </div>
                      <div className="hidden justify-self-end sm:block">
                        <ListingStatusPill status={listing.status} />
                      </div>

                      <div className="flex flex-col items-end gap-1.5 sm:hidden">
                        <PrizeCell reward={listing.reward} />
                        <ListingStatusPill status={listing.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
