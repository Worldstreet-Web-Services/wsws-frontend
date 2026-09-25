"use client";

import { useId, useRef, type JSX, type KeyboardEvent, type ReactNode } from "react";

import { PlayerAvatar } from "@/features/casino/components/last-standing/player-avatar";

export interface ActivityRow {
  id: string;
  /** The full wallet address. Seeds the avatar; never rendered, never logged. */
  address: string;
  /** The truncated form the design shows, e.g. "0x36g3gt…993". */
  addressLabel: string;
  avatarUrl: string | null;
  /** Already-localised, e.g. "Won the round". */
  action: string;
  /** Already formatted for display, e.g. "$0.8". */
  amount: string;
  /** Already-localised relative time, e.g. "Just now". */
  time: string;
  isYou: boolean;
  /** Where this play can be read on chain. Optional: a row built from a socket
   *  frame may not carry a transaction hash yet, and the table still stands
   *  without the link. */
  href?: string;
}

export interface ActivityTab {
  id: string;
  label: string;
}

export interface ActivityPanelProps {
  tabs: ActivityTab[];
  activeTab: string;
  onTabChange(id: string): void;
  columns: { player: string; action: string; amount: string; time: string };
  rows: ActivityRow[];
  emptyLabel: string;
  isLoading?: boolean;
  /** Rendered instead of the table for non-activity tabs. */
  children?: ReactNode;
}

// The row height the design draws, shared by a data row and a skeleton row so
// the table does not jump by a pixel when the real rows arrive.
const ROW_HEIGHT = "h-[54px]";
const SKELETON_ROWS = 5;

// Cell rhythm. The player column is fixed to the design's width so the address
// and the action never dance as rows change; the rest share what is left.
const CELL = "px-0 py-0 pr-6 last:pr-0 align-middle";

function SkeletonRow({ width }: { width: string }): JSX.Element {
  return <div className={`bg-surface-strong h-[10px] animate-pulse rounded-full ${width}`} />;
}

// The activity panel at the foot of the Last Man Standing screen: a tab row
// over a table of what just happened in the round. Presentational only —
// every string, including the empty line and the column headings, arrives as a
// prop, and the tab state is the caller's.
export function ActivityPanel({
  tabs,
  activeTab,
  onTabChange,
  columns,
  rows,
  emptyLabel,
  isLoading = false,
  children,
}: ActivityPanelProps): JSX.Element {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const tabId = (id: string) => `${baseId}-tab-${id}`;
  // Keyed by tab id rather than index, so a tab list that changes between
  // renders cannot move focus onto the wrong button.
  const buttons = useRef(new Map<string, HTMLButtonElement | null>());

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeTab)
  );

  // Arrow keys move the selection, as the tabs pattern expects; Home and End
  // jump to the ends. Selection follows focus, which suits a panel whose
  // contents are already in hand.
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (tabs.length === 0) return;

    let next: number;
    if (event.key === "ArrowRight") next = (activeIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    const target = tabs[next];
    // Focus moves here rather than in an effect: the panel is controlled, so
    // the caller may re-render at its own pace, and focus must not wait.
    buttons.current.get(target.id)?.focus();
    if (target.id !== activeTab) onTabChange(target.id);
  }

  return (
    <section className="ws-card w-full max-w-full rounded-[15px] px-4 py-4 sm:px-6 sm:py-5">
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="border-hairline -mx-4 flex [scrollbar-width:none] gap-6 overflow-x-auto border-b px-4 sm:-mx-6 sm:gap-9 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              ref={(node) => {
                buttons.current.set(tab.id, node);
              }}
              onClick={() => {
                if (!selected) onTabChange(tab.id);
              }}
              onKeyDown={onKeyDown}
              className={`focus-visible:ring-kash/70 relative shrink-0 cursor-pointer pb-3 text-[14px] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
                selected ? "text-kash" : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
              {/* The active indicator. aria-selected above carries the same
                  fact, so the colour is never the only signal. */}
              <span
                aria-hidden
                className={`absolute inset-x-0 -bottom-px h-[3px] rounded-full ${
                  selected ? "bg-kash" : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabs.length > 0 ? tabId(tabs[activeIndex].id) : undefined}
        tabIndex={0}
        className="pt-4 outline-none sm:pt-5"
      >
        {children ?? (
          <ActivityTable
            columns={columns}
            rows={rows}
            emptyLabel={emptyLabel}
            isLoading={isLoading}
          />
        )}
      </div>
    </section>
  );
}

// The avatar and the address, as a link to the play on chain when the caller
// supplied one. The link wraps only this cell: a row-wide anchor would swallow
// the whole table row, and the amount beside it is the app's own figure rather
// than something the explorer would confirm.
function PlayerCell({ row }: { row: ActivityRow }): JSX.Element {
  const inner = (
    <>
      {/* Decorative: the address beside it is the label. */}
      <PlayerAvatar src={row.avatarUrl} seed={row.address} alt="" />
      <span
        className={`tnum truncate text-[14px] font-semibold ${
          row.isYou ? "text-white" : "text-white/40"
        }`}
      >
        {row.addressLabel}
      </span>
    </>
  );

  if (row.href === undefined) return <span className="flex items-center gap-3">{inner}</span>;

  return (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md transition-opacity hover:opacity-80"
    >
      {inner}
    </a>
  );
}

function ActivityTable({
  columns,
  rows,
  emptyLabel,
  isLoading,
}: Pick<ActivityPanelProps, "columns" | "rows" | "emptyLabel"> & {
  isLoading: boolean;
}): JSX.Element {
  // Loading wins over empty: a first paint with nothing in hand is not the
  // same statement as "nobody has played", and reading it as one is a lie.
  if (!isLoading && rows.length === 0) {
    return (
      <p className={`flex items-center justify-center text-[14px] text-white/40 ${ROW_HEIGHT}`}>
        {emptyLabel}
      </p>
    );
  }

  return (
    // The card scrolls its own table on a narrow screen; the page never does.
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      <table className="w-full min-w-[480px] border-collapse text-left">
        <thead>
          <tr>
            <th
              scope="col"
              className={`${CELL} w-[38%] pb-3 text-[14px] font-medium text-white/40`}
            >
              {columns.player}
            </th>
            <th
              scope="col"
              className={`${CELL} w-[26%] pb-3 text-[14px] font-medium text-white/40`}
            >
              {columns.action}
            </th>
            <th
              scope="col"
              className={`${CELL} w-[18%] pb-3 text-[14px] font-medium text-white/40`}
            >
              {columns.amount}
            </th>
            <th
              scope="col"
              className={`${CELL} w-[18%] pb-3 text-[14px] font-medium text-white/40`}
            >
              {columns.time}
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <tr
                  key={`skeleton-${i}`}
                  data-testid="activity-skeleton-row"
                  className={`border-rule border-t ${ROW_HEIGHT}`}
                >
                  <td className={CELL}>
                    <span className="flex items-center gap-3">
                      <span className="bg-surface-strong size-[28px] shrink-0 animate-pulse rounded-full" />
                      <SkeletonRow width="w-24" />
                    </span>
                  </td>
                  <td className={CELL}>
                    <SkeletonRow width="w-28" />
                  </td>
                  <td className={CELL}>
                    <SkeletonRow width="w-12" />
                  </td>
                  <td className={CELL}>
                    <SkeletonRow width="w-16" />
                  </td>
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={row.id}
                  data-you={row.isYou ? "true" : undefined}
                  className={`border-rule border-t ${ROW_HEIGHT} ${row.isYou ? "bg-surface" : ""}`}
                >
                  <td className={CELL}>
                    <PlayerCell row={row} />
                  </td>
                  <td className={`${CELL} text-[14px] font-medium text-white`}>{row.action}</td>
                  <td className={`${CELL} tnum text-[14px] font-medium text-white`}>
                    {row.amount}
                  </td>
                  <td className={`${CELL} text-[14px] font-medium whitespace-nowrap text-white`}>
                    {row.time}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
