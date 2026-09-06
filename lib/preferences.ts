// Persists the user's chosen interest so the dashboard can shape itself around it.
// Client-safe and UI-free: importable from server-rendered modules without side effects.

const INTEREST_KEY = "ws.interest.v1";

export function saveInterest(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INTEREST_KEY, key);
  } catch {
    // Storage can be unavailable (private mode, quota). The choice is a
    // nice-to-have preference, so losing it is acceptable.
  }
}

export function loadInterest(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(INTEREST_KEY);
  } catch {
    return null;
  }
}

export function clearInterest(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(INTEREST_KEY);
  } catch {
    // Nothing to do: if storage is unavailable there is nothing stored.
  }
}

// Which sections the user has toggled off on the Customise Portfolio screen.
// Stored as an array of customise section ids (e.g. ["perps", "arkade"]).
const CUSTOMISE_KEY = "ws.customise.v1";

export function saveCustomise(hidden: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOMISE_KEY, JSON.stringify(hidden));
  } catch {
    // Storage unavailable — preference is a nice-to-have, losing it is fine.
  }
}

export function loadCustomise(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOMISE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
