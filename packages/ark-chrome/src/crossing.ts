"use client";

import { useEffect, useState, type MouseEvent } from "react";

// After this long a crossing that has not landed is marked busy, so a page
// that looks frozen does not invite a second tap.
export const CROSSING_BUSY_MS = 300;

// A crossing can be called off with nothing to say so: the reader presses
// Stop or Escape, answers "Stay" on a leave prompt, or the response is a
// download or a 204. The old page stays, so after this long the destination is
// dropped and the real active item is lit again. Long enough that a slow page
// load on a phone is not un-lit while it is still coming.
export const CROSSING_GIVE_UP_MS = 8_000;

/**
 * Whether a click on a cross-app anchor will navigate this tab. A click with a
 * modifier, a middle click, or one the host already handled opens a new tab or
 * nothing at all, so the chrome must not light the destination for it.
 */
export function navigatesThisTab(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

interface PendingState {
  id: string | null;
  // The active id the pending one was chosen under. When the host reports a
  // different active id the crossing has landed (or the host moved on), so the
  // pending id is dropped.
  under: string | null;
  busy: boolean;
}

/**
 * The destination of a cross-app navigation that has been clicked but has not
 * loaded yet.
 *
 * A document navigation leaves the old page on screen until the new one
 * paints. Lighting the destination at the click tells the reader the tap
 * registered, and the tab bar's reshuffle plays inside that wait instead of
 * being lost to the page load. The pending id never becomes aria-current: the
 * page has not changed yet.
 */
export function usePendingCrossing(activeId: string | null) {
  const [state, setState] = useState<PendingState>({ id: null, under: activeId, busy: false });

  // A new active id from the host ends any crossing. Adjusted during render,
  // so the stale destination is never painted.
  let current = state;
  if (state.under !== activeId) {
    current = { id: null, under: activeId, busy: false };
    setState(current);
  }

  const pendingId = current.id;

  useEffect(() => {
    if (pendingId === null) return;
    const busyTimer = window.setTimeout(
      () => setState((s) => (s.id === pendingId ? { ...s, busy: true } : s)),
      CROSSING_BUSY_MS
    );
    const giveUpTimer = window.setTimeout(
      () => setState((s) => (s.id === pendingId ? { ...s, id: null, busy: false } : s)),
      CROSSING_GIVE_UP_MS
    );
    return () => {
      window.clearTimeout(busyTimer);
      window.clearTimeout(giveUpTimer);
    };
  }, [pendingId]);

  useEffect(() => {
    // Back or forward restores this page from the back-forward cache exactly
    // as it was left, destination lit. It is the current page again, so the
    // crossing is over.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setState((s) => ({ ...s, id: null, busy: false }));
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return {
    pendingId,
    busy: current.busy,
    start: (id: string) => setState({ id, under: activeId, busy: false }),
  };
}
