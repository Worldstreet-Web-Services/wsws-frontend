"use client";

import type { BrowseQuery, BrowseSort, BrowseTab, ListingStatus } from "@/lib/earn/api/types";

const TABS: { id: BrowseTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bounties", label: "Bounties" },
  { id: "projects", label: "Projects" },
  { id: "grants", label: "Grants" },
];

const STATUSES: { id: ListingStatus; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "review", label: "In review" },
  { id: "completed", label: "Completed" },
];

const SORTS: { id: BrowseSort; label: string }[] = [
  { id: "Date", label: "Newest" },
  { id: "Prize", label: "Reward" },
  { id: "Submissions", label: "Entries" },
];

// The primary tabs read as an underline strip, the way Superteam's feed splits
// All / Bounties / Projects: text buttons, the active one lit white with an
// accent underline drawn beneath it.
function TabLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative cursor-pointer px-1 py-2 font-sans text-[13px] font-medium transition-colors ${
        active
          ? "text-accent after:bg-accent after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:content-['']"
          : "text-white/50 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// Status is a secondary filter, so it stays a row of pill chips with the active
// one inverted. Same treatment as the casino hub's categories.
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-sans text-[12.5px] transition-colors ${
        active
          ? "border-accent bg-accent text-ink font-semibold"
          : "border-white/10 font-medium text-white/55 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function ListingFilters({
  query,
  onChange,
}: {
  query: BrowseQuery;
  onChange: (next: BrowseQuery) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/[0.08]">
        {TABS.map((tab) => (
          <TabLink
            key={tab.id}
            active={query.tab === tab.id}
            onClick={() => onChange({ ...query, tab: tab.id })}
          >
            {tab.label}
          </TabLink>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((status) => (
          <Chip
            key={status.id}
            active={query.status === status.id}
            onClick={() => onChange({ ...query, status: status.id })}
          >
            {status.label}
          </Chip>
        ))}

        <span className="ml-auto flex items-center gap-2">
          <label htmlFor="earn-sort" className="font-sans text-[12px] font-normal text-white/45">
            Sort
          </label>
          <select
            id="earn-sort"
            value={query.sortBy}
            onChange={(event) => onChange({ ...query, sortBy: event.target.value as BrowseSort })}
            className="ws-inset cursor-pointer rounded-full px-3 py-1.5 font-sans text-[12.5px] font-medium text-white outline-none"
          >
            {SORTS.map((sort) => (
              <option key={sort.id} value={sort.id} className="bg-sheet">
                {sort.label}
              </option>
            ))}
          </select>
        </span>
      </div>
    </div>
  );
}
