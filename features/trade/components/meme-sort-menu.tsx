"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui/icons";
import { ModalShell } from "@/components/ui/modal-shell";
import {
  SCREENER_METRICS,
  type ScreenerMetric,
  type ScreenerSort,
  type SortOrder,
} from "@/lib/meme/screener";

// The screener's sort control (ADR-2026-09-15-meme-trending-screener §3). It
// is one menu of radio items: the default order and the seven metrics, then,
// once a sort is in force, the two directions for it. A menu rather than a
// radio group because picking a metric closes it, and a radio group would
// commit a new sort on every arrow press.
//
// The menu lives in a modal on the desk as well as on the phone, so the two
// surfaces read the same way and a long list of metrics is never clipped by
// the toolbar it hangs off.

export const METRIC_KEYS: Record<ScreenerMetric, string> = {
  marketCap: "metricMarketCap",
  price: "metricPrice",
  age: "metricAge",
  transactions: "metricTransactions",
  volume: "metricVolume",
  traders: "metricTraders",
  liquidity: "metricLiquidity",
};

/** Newest first for age, since a younger pair has fewer minutes; high to low for the rest. */
export function defaultOrder(metric: ScreenerMetric): SortOrder {
  return metric === "age" ? "asc" : "desc";
}

/** The words for a direction: newest and oldest for age, high and low for the rest. */
export function directionKey(by: ScreenerMetric, order: SortOrder): string {
  if (by === "age") return order === "asc" ? "sortNewest" : "sortOldest";
  return order === "asc" ? "sortAsc" : "sortDesc";
}

/**
 * Marks the ModalShell panel that a `useModalTrigger` focus trap belongs to.
 *
 * The shell owns its own chrome, the close button included, and renders our
 * content one level deeper. Tagging the panel through the shell's public
 * `panelClassName` prop lets the trap find the whole dialog, so Tab reaches
 * the close button instead of cycling only the content we passed in. The class
 * carries no styles; it exists to be found.
 */
export const MODAL_PANEL_CLASS = "ws-meme-modal";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
].join(",");

/**
 * The elements Tab visits inside the dialog, in document order.
 *
 * The tabIndex check is the load-bearing part: the sort menu parks every item
 * but the current one at -1, so the whole menu is one stop and the arrow keys
 * move within it. Matching on the tag alone would put all eight metrics in the
 * cycle.
 */
function tabStops(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.tabIndex >= 0);
}

/**
 * Open state for a toolbar modal. Escape closes it and hands focus back to the
 * trigger, and Tab cycles inside the dialog rather than walking out into the
 * page behind it. A press on the backdrop is the shell's job, and the caller
 * decides whether that returns focus.
 *
 * `panelRef` goes on the dialog element inside the shell. The trap works from
 * the marked shell panel when there is one, so the shell's close button counts
 * as a stop, and falls back to the dialog itself otherwise.
 */
export function useModalTrigger() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  const close = useCallback((returnFocus: boolean) => {
    refocus.current = returnFocus;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      if (refocus.current) {
        refocus.current = false;
        triggerRef.current?.focus();
      }
      return;
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        close(true);
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = panelRef.current;
      if (dialog === null) return;
      const trap = dialog.closest<HTMLElement>(`.${MODAL_PANEL_CLASS}`) ?? dialog;
      const stops = tabStops(trap);
      if (stops.length === 0) {
        e.preventDefault();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && trap.contains(active);
      if (!inside) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return { open, show: () => setOpen(true), close, triggerRef, panelRef };
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 5v14M8 19l-3-3M8 19l3-3M16 19V5M16 5l-3 3M16 5l3 3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The metric's default direction first, so the pair reads the same way the
// metric sorts when it is picked.
function directionsFor(metric: ScreenerMetric): SortOrder[] {
  return metric === "age" ? ["asc", "desc"] : ["desc", "asc"];
}

interface MemeSortMenuProps {
  variant: "desk" | "phone";
  sort: ScreenerSort | null;
  onSortChange: (sort: ScreenerSort | null) => void;
}

export function MemeSortMenu({ variant, sort, onSortChange }: MemeSortMenuProps) {
  const t = useTranslations("memeScreener");
  const { open, show, close, triggerRef, panelRef } = useModalTrigger();
  const dialogId = useId();
  const titleId = useId();
  const directionId = useId();
  const phone = variant === "phone";

  // Focus lands on the sort in force, so Enter on an unchanged menu is a no-op.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("[data-current]")?.focus();
  }, [open, panelRef]);

  const pick = (next: ScreenerSort | null) => {
    const same = next === null ? sort === null : sort?.by === next.by && sort.order === next.order;
    if (!same) onSortChange(next);
    close(true);
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')
    );
    const at = items.findIndex((item) => item === document.activeElement);
    let next: number;
    if (e.key === "ArrowDown") next = (at + 1) % items.length;
    else if (e.key === "ArrowUp") next = at <= 0 ? items.length - 1 : at - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    items[next]?.focus();
  };

  const row = `flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-sans font-medium outline-none transition-colors hover:bg-white/6 focus-visible:bg-white/6 aria-checked:text-white ${
    phone ? "py-3 text-[14px] text-white/70" : "py-2.5 text-[13.5px] text-white/70"
  }`;
  const groupLabel =
    "px-3 pt-2 pb-1 text-[10.5px] font-medium tracking-[0.1em] text-white/35 uppercase";

  const item = (
    key: string,
    label: string,
    checked: boolean,
    current: boolean,
    onPick: () => void
  ) => (
    <button
      key={key}
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={current ? 0 : -1}
      data-current={current ? "" : undefined}
      onClick={onPick}
      className={row}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {checked ? (
        <span aria-hidden className="shrink-0">
          <CheckIcon size={16} className="text-accent" />
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close(false) : show())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        className={`flex h-[36px] cursor-pointer items-center gap-1.5 rounded-full border px-3 font-sans text-[12px] font-semibold transition-colors ${
          // The phone row shares its width with the timeframe track; the sort
          // chip under it carries the full wording.
          phone ? "max-w-[132px]" : "max-w-[220px]"
        } ${
          sort !== null
            ? "border-white/30 bg-white/10 text-white"
            : "border-white/12 bg-white/4 text-white/60 hover:border-white/25 hover:text-white"
        }`}
      >
        <SortIcon />
        {sort === null ? (
          t("sortLabel")
        ) : (
          <span className="min-w-0 truncate">
            <span className="sr-only">{t("sortLabel")}</span>{" "}
            {t("sortApplied", {
              metric: t(METRIC_KEYS[sort.by]),
              direction: t(directionKey(sort.by, sort.order)),
            })}
          </span>
        )}
      </button>

      <ModalShell open={open} onClose={() => close(true)} panelClassName={MODAL_PANEL_CLASS}>
        <div
          ref={panelRef}
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="outline-none"
        >
          {/* Padded past the shell's close button so a long title never runs under it. */}
          <div id={titleId} className="ws-display mb-3 pr-10 text-[20px]">
            {t("sortTitle")}
          </div>
          <div
            role="menu"
            aria-labelledby={titleId}
            onKeyDown={onMenuKey}
            className="flex flex-col"
          >
            {item("none", t("sortNone"), sort === null, sort === null, () => pick(null))}
            {SCREENER_METRICS.map((metric) =>
              item(metric, t(METRIC_KEYS[metric]), sort?.by === metric, sort?.by === metric, () =>
                pick({ by: metric, order: defaultOrder(metric) })
              )
            )}
            {sort !== null ? (
              <>
                <div role="separator" className="my-1.5 h-px bg-white/8" />
                <div role="group" aria-labelledby={directionId}>
                  <div id={directionId} className={groupLabel}>
                    {t(METRIC_KEYS[sort.by])}
                  </div>
                  {directionsFor(sort.by).map((order) =>
                    // A direction keeps the modal open, so the reader sees the flip land.
                    item(
                      order,
                      t(directionKey(sort.by, order)),
                      sort.order === order,
                      false,
                      () => {
                        if (sort.order !== order) onSortChange({ by: sort.by, order });
                      }
                    )
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
