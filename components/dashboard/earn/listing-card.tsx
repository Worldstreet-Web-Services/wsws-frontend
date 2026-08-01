"use client";

import Link from "next/link";
import { RewardBadge } from "@/components/dashboard/earn/reward-badge";
import { deadlineLabel } from "@/lib/earn/deadline";
import type { ListingSummary } from "@/lib/earn/api/types";

const TYPE_LABEL: Record<ListingSummary["type"], string> = {
  bounty: "Bounty",
  project: "Project",
  hackathon: "Hackathon",
  grant: "Grant",
};

// A thin muted pipe between meta items, the way Superteam separates a listing's
// type, deadline, and entry count on one line.
function Pipe() {
  return (
    <span aria-hidden className="text-white/20">
      |
    </span>
  );
}

// One listing as a horizontal row: sponsor logo, then title and meta, with the
// reward pinned to the right. This is Superteam Earn's feed anatomy, kept in the
// app's own dark palette. `featured` gives the first row a faint highlight
// instead of a boxed card, since the feed is a list of rows, not a grid.
export function ListingCard({
  listing,
  featured = false,
}: {
  listing: ListingSummary;
  featured?: boolean;
}) {
  const deadline = deadlineLabel(listing.deadline);

  return (
    <Link
      href={`/earn/listing/${listing.slug}`}
      className={`flex items-center gap-3 rounded-[12px] px-2.5 py-3.5 transition-colors hover:bg-white/[0.04] sm:gap-5 ${
        featured ? "bg-white/[0.03]" : ""
      }`}
    >
      {listing.sponsor?.logo ? (
        // Sponsor logos are arbitrary remote URLs, so they go through a plain
        // img rather than the Next image loader.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.sponsor.logo}
          alt=""
          className="size-12 shrink-0 rounded-[10px] border border-white/10 object-cover sm:size-14"
        />
      ) : (
        <div className="ws-inset grid size-12 shrink-0 place-items-center rounded-[10px] font-sans text-[15px] font-semibold text-white/40 sm:size-14">
          {listing.sponsor?.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-white sm:text-[15px]">
          {listing.title}
        </div>
        <div className="mt-0.5 truncate font-sans text-[12px] font-normal text-white/50 sm:text-[12.5px]">
          {listing.sponsor?.name ?? "Unknown sponsor"}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-sans text-[11px] font-medium text-white/45">
          <span>{TYPE_LABEL[listing.type]}</span>
          <Pipe />
          <span className={deadline.closed ? "text-white/30" : "text-white/50"}>
            {deadline.text}
          </span>
          <Pipe />
          <span className="tnum">
            {listing.submissionCount} {listing.submissionCount === 1 ? "entry" : "entries"}
          </span>
          {listing.isPro ? (
            <>
              <Pipe />
              <span className="text-accent font-semibold">Pro</span>
            </>
          ) : null}
          {!deadline.closed ? (
            <span aria-hidden className="bg-up ml-0.5 size-1.5 rounded-full" title="Open" />
          ) : null}
        </div>
      </div>

      <div className="hidden shrink-0 pl-2 text-right sm:block">
        <RewardBadge reward={listing.reward} />
      </div>
    </Link>
  );
}
