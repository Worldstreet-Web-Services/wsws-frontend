"use client";

import { useCallback, useSyncExternalStore } from "react";

// The tokens a user has switched off in Manage Tokens, remembered across reloads
// and shared with the surfaces that list tokens. Persisted the same way as the
// balance-visibility toggle: a tiny external store over localStorage read through
// useSyncExternalStore, so it is SSR-safe (the server renders "nothing hidden",
// the client reconciles on hydration) and syncs across tabs.
const STORAGE_KEY = "ws.hiddenTokens.v1";

const listeners = new Set<() => void>();

// getSnapshot must return a stable reference while the value is unchanged, or
// useSyncExternalStore loops. The parsed Set is cached against the raw string it
// came from and only rebuilt when the stored value actually changes.
let cachedRaw = "";
let cachedSet: Set<string> = new Set();
const EMPTY: Set<string> = new Set();

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function readSet(): Set<string> {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSet = new Set(raw ? raw.split(",").filter(Boolean) : []);
  }
  return cachedSet;
}

function write(next: Set<string>): void {
  const raw = [...next].join(",");
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // localStorage can throw in private mode; the notify below still updates UI.
  }
  cachedRaw = raw;
  cachedSet = new Set(next);
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

interface HiddenTokens {
  // The symbols currently switched off.
  hidden: Set<string>;
  isHidden: (symbol: string) => boolean;
  // Flip a token between shown and hidden.
  toggle: (symbol: string) => void;
}

export function useHiddenTokens(): HiddenTokens {
  const hidden = useSyncExternalStore(subscribe, readSet, () => EMPTY);
  const isHidden = useCallback((symbol: string) => hidden.has(symbol), [hidden]);
  const toggle = useCallback((symbol: string) => {
    const next = new Set(readSet());
    if (next.has(symbol)) next.delete(symbol);
    else next.add(symbol);
    write(next);
  }, []);
  return { hidden, isHidden, toggle };
}
