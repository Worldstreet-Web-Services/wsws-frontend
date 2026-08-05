"use client";

import { useState } from "react";
import Link from "next/link";
import { AsyncError, AsyncLoading } from "@/components/dashboard/async-state";
import { ListingCard } from "@/components/dashboard/earn/listing-card";
import { JobCard } from "@/components/dashboard/earn/job-card";
import { NotificationBell } from "@/components/dashboard/earn/notification-bell";
import { ListingFilters } from "@/components/dashboard/earn/listing-filters";
import { useListingFeed } from "@/hooks/use-earn-listings";
import { useJobFeed } from "@/hooks/use-earn-jobs";
import { useCurrentSponsor } from "@/hooks/use-earn-sponsor";
import { DEFAULT_BROWSE_QUERY, type BrowseQuery } from "@/lib/earn/api/types";
import { BRAND } from "@/lib/brand";

// relative + overflow-x-clip keep the decorative glow, which pokes past the
// right edge, from widening the page into a horizontal scroll on mobile.
const PAGE =
  "relative mx-auto w-full max-w-[1520px] overflow-x-clip px-4 pt-8 pb-20 sm:px-6 lg:px-8";

const UNCONFIGURED_DETAIL = "Bounties go live once the earn service is switched on.";

const PAGE_SIZE = 12;

// Only the type and status rows can hide listings. Sort does not change what is
// in the feed, and category and context are never moved off their defaults.
function isFiltered(query: BrowseQuery): boolean {
  return query.tab !== DEFAULT_BROWSE_QUERY.tab || query.status !== DEFAULT_BROWSE_QUERY.status;
}

// An empty feed is two different situations and they need different exits. A
// narrowed feed has work behind it, so the way out is dropping the filters. A
// feed that is empty at its widest has nothing to browse to, so the only useful
// thing to offer is posting the first listing.
function EmptyFeed({
  query,
  onClearFilters,
  hasSponsor,
}: {
  query: BrowseQuery;
  onClearFilters: () => void;
  hasSponsor: boolean;
}) {
  const filtered = isFiltered(query);

  return (
    <div className="ws-inset grid place-items-center px-5 py-12 text-center">
      <div className="max-w-[44ch]">
        <div className="text-[14px] font-semibold text-white/85">
          {filtered ? "Nothing open under these filters." : "No work is open right now."}
        </div>
        <div className="mt-1.5 text-[12.5px] font-normal text-white/50">
          {filtered
            ? "There may be listings under a different type or status."
            : `New listings land here as companies post them. ${BRAND} is early, so the feed fills up in bursts.`}
        </div>
        {filtered ? (
          <button
            onClick={onClearFilters}
            className="mt-4 cursor-pointer rounded-full border border-white/15 px-4 py-2 font-sans text-[12.5px] font-semibold text-white transition-colors hover:border-white/35"
          >
            Show everything
          </button>
        ) : (
          <Link
            href="/earn/sponsor"
            className="mt-4 inline-block cursor-pointer rounded-full border border-white/15 px-4 py-2 font-sans text-[12.5px] font-semibold text-white transition-colors hover:border-white/35"
          >
            {hasSponsor ? "Post a listing" : "Post the first one"}
          </Link>
        )}
      </div>
    </div>
  );
}

// Bounties and jobs are parallel systems, not two filters of one feed: a
// bounty takes submissions and ends in an announced winner, a job takes
// proposals and ends in a contract. They are browsed from the same page
// because both answer "what paid work is open", and nothing else.
type Feed = "bounties" | "jobs";

export function BrowseSection() {
  const [feed, setFeed] = useState<Feed>("bounties");
  const [query, setQuery] = useState<BrowseQuery>(DEFAULT_BROWSE_QUERY);
  const [page, setPage] = useState(1);
  const { listings, count, isLoading, error } = useListingFeed(query);
  const { sponsor } = useCurrentSponsor();

  // The feed arrives whole, so pagination is client-side; a filter change
  // starts back at page one.
  const pageCount = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageListings = listings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const changeQuery = (next: BrowseQuery) => {
    setQuery(next);
    setPage(1);
  };

  return (
    <div className={PAGE}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 right-[-120px] -z-10 h-[560px] w-[560px] bg-[radial-gradient(circle,rgba(212,212,216,0.16),transparent_65%)]"
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ws-display mt-2.5 bg-[linear-gradient(180deg,#ffffff,#cfcfd4)] bg-clip-text text-[clamp(30px,4.4vw,44px)] tracking-[-0.02em] text-transparent">
            Earn
          </h1>
          <p className="mt-1.5 max-w-[52ch] font-sans text-[13.5px] font-normal text-white/55">
            Paid work posted by companies building on {BRAND}. Pick something, ship it, get paid.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NotificationBell />
          <Link
            href="/earn/applications"
            className="ws-inset cursor-pointer rounded-full px-4 py-2.5 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white"
          >
            Your applications
          </Link>
          <Link
            href="/earn/profile"
            className="ws-inset cursor-pointer rounded-full px-4 py-2.5 font-sans text-[12.5px] font-semibold text-white/75 transition-colors hover:text-white"
          >
            Your profile
          </Link>
          <Link
            href="/earn/sponsor"
            className="ws-inset cursor-pointer rounded-full px-4 py-2.5 font-sans text-[12.5px] font-semibold text-white transition-colors hover:border-white/30"
          >
            {sponsor ? "Your company" : "Post a listing"}
          </Link>
        </div>
      </header>

      <div className="mt-7 flex flex-wrap gap-2">
        {(["bounties", "jobs"] as Feed[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFeed(option)}
            aria-pressed={feed === option}
            className={`cursor-pointer rounded-full border px-4 py-2 font-sans text-[12.5px] transition-colors ${
              feed === option
                ? "border-accent bg-accent text-ink font-semibold"
                : "border-white/10 font-medium text-white/55 hover:text-white"
            }`}
          >
            {option === "bounties" ? "Bounties" : "Jobs"}
          </button>
        ))}
      </div>

      {feed === "jobs" ? (
        <JobFeed hasSponsor={!!sponsor} />
      ) : (
        <>
          <div className="mt-5">
            <ListingFilters query={query} onChange={changeQuery} />
          </div>

          <div className="mt-6">
            {error ? (
              <AsyncError
                error={error}
                subject="listings"
                unconfiguredDetail={UNCONFIGURED_DETAIL}
              />
            ) : isLoading ? (
              <AsyncLoading label="Loading listings" rows={5} />
            ) : listings.length === 0 ? (
              <EmptyFeed
                query={query}
                onClearFilters={() => changeQuery(DEFAULT_BROWSE_QUERY)}
                hasSponsor={!!sponsor}
              />
            ) : (
              <>
                {count !== null ? (
                  <div className="tnum mb-3 font-sans text-[12.5px] font-normal text-white/45">
                    {count} {count === 1 ? "listing" : "listings"}
                  </div>
                ) : null}
                <div className="grid gap-3 min-[1280px]:grid-cols-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pageListings.map((listing, index) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      featured={safePage === 1 && index === 0}
                    />
                  ))}
                </div>
                {pageCount > 1 ? (
                  <div className="mt-5 flex items-center justify-between">
                    <span className="tnum text-[12.5px] font-normal text-white/45">
                      {safePage} / {pageCount}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="cursor-pointer rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-white/75 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        disabled={safePage >= pageCount}
                        className="cursor-pointer rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-white/75 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// The public job feed. Unlike the bounty feed it takes no filters yet: the
// service's own /job-posts only accepts region and status, neither of which
// has a picker here until there is enough posted work to need narrowing.
function JobFeed({ hasSponsor }: { hasSponsor: boolean }) {
  const { jobs, isLoading, error } = useJobFeed();

  if (error) {
    return (
      <div className="mt-6">
        <AsyncError
          error={error}
          subject="jobs"
          unconfiguredDetail="Jobs go live once the earn service is switched on."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-6">
        <AsyncLoading label="Loading jobs" rows={5} />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="mt-6">
        <div className="ws-inset grid place-items-center px-5 py-12 text-center">
          <div className="max-w-[44ch]">
            <div className="text-[14px] font-semibold text-white/85">No jobs are open yet.</div>
            <div className="mt-1.5 text-[12.5px] font-normal text-white/50">
              Jobs are ongoing work hired through proposals, rather than a one-off bounty.
            </div>
            <Link
              href="/earn/sponsor"
              className="mt-4 inline-block cursor-pointer rounded-full border border-white/15 px-4 py-2 font-sans text-[12.5px] font-semibold text-white transition-colors hover:border-white/35"
            >
              {hasSponsor ? "Post a job" : "Post the first one"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="tnum mb-3 font-sans text-[12.5px] font-normal text-white/45">
        {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
      </div>
      <div className="grid gap-3 min-[1280px]:grid-cols-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((jobPost, index) => (
          <JobCard key={jobPost.id} jobPost={jobPost} featured={index === 0} />
        ))}
      </div>
    </div>
  );
}
