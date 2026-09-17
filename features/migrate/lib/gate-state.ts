"use client";

import { useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useOfferMigration } from "@/features/migrate/hooks/use-offer-migration";

// Whether the migration gate has been completed for an account, kept PER
// ACCOUNT (not per device — the device-wide flag is what let one user's finish
// hide the migration from the next user of the same browser). Written only once
// the gate's own conditions were met, so it is never a lie.
const GATE_DONE_PREFIX = "ws.migrationGateDone:";

export function gateDoneKey(evmAddress: string | null): string | null {
  return evmAddress ? `${GATE_DONE_PREFIX}${evmAddress.toLowerCase()}` : null;
}

export function readGateDone(key: string | null): boolean {
  if (!key || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

// Same-tab reactivity: a storage event only fires in OTHER tabs, so writeGateDone
// notifies these listeners directly. Anything reading the flag through
// useSyncExternalStore then re-renders the moment the gate finishes.
const listeners = new Set<() => void>();

export function writeGateDone(key: string | null): void {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage refused (private mode, quota): the gate simply shows once more.
  }
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Whether the migration gate is currently blocking the screen: the migration is
 * offered AND this account has not yet finished it. Reactive — flips to false
 * the instant the gate is completed, so anything waiting on the migration (the
 * product tour, say) can proceed without a reload.
 */
export function useMigrationGateActive(): boolean {
  const offer = useOfferMigration();
  const { evmAddress } = useAuthSession();
  const key = gateDoneKey(evmAddress);
  const done = useSyncExternalStore(
    subscribe,
    () => readGateDone(key),
    () => false
  );
  return offer && !done;
}
