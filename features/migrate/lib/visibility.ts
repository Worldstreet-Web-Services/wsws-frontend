"use client";

import { useSyncExternalStore } from "react";
import type { MigrationStatus } from "@/features/migrate/lib/api";

// Whether to offer the one-click Update Balance migration on the balance
// card. Three facts decide it:
//
// 1. This browser holds Privy session state (the `privy:` auth keys), which
//    only a past Privy sign-in leaves behind. A Decane-native signup never
//    sees the button.
// 2. The migration service, once linked, says the old wallet still holds
//    money or has a bank deposit on its way. This is what makes a brand-new
//    device offer the button too.
// 3. The migration has not already completed here. The button marks
//    completion when every asset landed, or when the old account turned out
//    to hold nothing to move.
//
// The Account modal's entry ignores all of this and is always available.

// Keys Privy only writes around a real session, not on a bare provider mount
// (which would false-positive as soon as the button itself mounts Privy).
const PRIVY_SESSION_KEYS = [
  "privy:token",
  "privy:refresh_token",
  "privy:id_token",
  "privy:connections",
];

const MIGRATION_COMPLETE_KEY = "ws.migrationComplete";

// Set the first time a run actually moves something. The migration can stay
// unfinished for days (challenge windows, keeper fills, a venue that was
// down), and masking a balance that already holds the user's money is worse
// than showing a figure that is not final yet.
const FUNDS_MOVED_KEY = "ws.migrationMoved";

// Set once this device has CONFIRMED the signed-in email's account is linked —
// either the service answered `linked: true`, or a link landed here. Being
// linked is a permanent, monotonic fact (the mapping never disappears), so this
// is a safe thing to cache: a later load with the same email can treat the
// account as migrated without re-running the status call, the legacy directory
// lookup, and the on-chain read again. Keyed by email so it never leaks between
// accounts on a shared browser. Any residual old-wallet funds stay reachable
// through the always-open "Move money from old wallet" entry in the account
// menu, which this flag does not touch.
const LINKED_EMAIL_PREFIX = "ws.migrationLinkedEmail:";

// The storage event only fires in OTHER tabs, so same-tab completion notifies
// subscribers directly.
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function markMigrationComplete(): void {
  try {
    window.localStorage.setItem(MIGRATION_COMPLETE_KEY, "1");
  } catch {
    // Storage unavailable: the banner keeps showing, the sweep still worked.
  }
  notify();
}

// Re-opens the one-click door, for when a later bank deposit or a settled
// window puts money back in the old wallet.
export function clearMigrationComplete(): void {
  try {
    window.localStorage.removeItem(MIGRATION_COMPLETE_KEY);
  } catch {
    // Storage unavailable: nothing was stored to clear.
  }
  notify();
}

export function markFundsMoved(): void {
  try {
    window.localStorage.setItem(FUNDS_MOVED_KEY, "1");
  } catch {
    // Storage unavailable: the balance stays masked, the money still moved.
  }
  notify();
}

export function hasMovedFunds(): boolean {
  try {
    return window.localStorage.getItem(FUNDS_MOVED_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMigrationComplete(): boolean {
  try {
    return window.localStorage.getItem(MIGRATION_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasLocalPrivyHistory(): boolean {
  try {
    return PRIVY_SESSION_KEYS.some((key) => window.localStorage.getItem(key) !== null);
  } catch {
    return false;
  }
}

// The device-only decision, with no server knowledge.
export function shouldOfferMigration(): boolean {
  return !isMigrationComplete() && hasLocalPrivyHistory();
}

function linkedEmailKey(email: string | null | undefined): string | null {
  const normalised = email?.trim().toLowerCase();
  return normalised ? `${LINKED_EMAIL_PREFIX}${normalised}` : null;
}

// Has this device already confirmed the given email's account is linked. False
// for a missing email, or when storage is unavailable — either way the caller
// falls back to asking the service, which is never wrong, only slower.
export function isEmailLinked(email: string | null | undefined): boolean {
  const key = linkedEmailKey(email);
  if (!key) return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

// Record that this email's account is linked. Only ever called once the fact is
// confirmed (see the note on LINKED_EMAIL_PREFIX), never speculatively.
export function markEmailLinked(email: string | null | undefined): void {
  const key = linkedEmailKey(email);
  if (!key) return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage refused (private mode, quota): the account is simply re-checked
    // next load, which is correct, just not free.
  }
  notify();
}

// The full decision. Pure, so every arm is tested.
export function offerMigration(input: {
  complete: boolean;
  localHistory: boolean;
  status: MigrationStatus | undefined;
  /**
   * This account is already on the new identity. Passed in because it can be
   * known before /status returns — a device that has confirmed this email
   * linked once remembers it (see markEmailLinked). Defaults to the service's
   * own answer.
   */
  linked?: boolean;
  /**
   * The signed-in identity belongs to a legacy account — see useLegacyAccount.
   * Whether that account's WALLET holds anything is deliberately not part of
   * this decision.
   */
  legacyAccount?: boolean;
  /**
   * The frontend's own read of the old wallet, for a linked account:
   *   true  — holds money,     false — confirmed empty,
   *   null  — could not read,  undefined — the read is still in flight.
   * For a linked account the chain read is the sole judge; the service's
   * `hasLegacyFunds` is only a fallback for a definite "could not read",
   * because it also says "yes" while a ledger re-key is pending.
   */
  walletFunds?: boolean | null;
}): boolean {
  const linked = input.linked ?? input.status?.linked === true;

  if (linked) {
    // On the new identity already. The one reason to keep the move open is
    // money physically left on the old wallet, judged by the chain read — never
    // the service flag, which also fires on a pending ledger re-key. While that
    // read is still in flight (undefined) we show nothing, so the gate never
    // flashes open on the service's optimistic guess and then closes; it opens
    // only once the wallet is CONFIRMED to still hold something. A definite
    // "could not read" (null) is the only case that falls back to the service.
    if (input.status?.pendingOnramps.length) return true;
    if (input.walletFunds === true) return true;
    if (input.walletFunds === false) return false;
    if (input.walletFunds === null) return Boolean(input.status?.hasLegacyFunds);
    return false;
  }

  // Not (yet) known linked. Until the service has answered we cannot tell a
  // migrated account from a legacy one, so we wait rather than flash the offer
  // on and then off once the answer lands.
  if (input.status === undefined) return false;

  // ── the account is not linked ──
  //
  // Money still on the old wallet, or a deposit still landing there, keeps the
  // offer open no matter what else is true.
  const fundsOnChain = input.walletFunds ?? null;
  const fundsLeft = fundsOnChain !== null ? fundsOnChain : Boolean(input.status.hasLegacyFunds);
  if (fundsLeft || input.status.pendingOnramps.length) return true;
  // Marked done on this device. That flag only fills the gap the service leaves
  // (could not say): when the service has answered "not linked", its answer
  // wins. The flag is per DEVICE, not per user, and can be set by a sweep whose
  // link never landed — so localStorage never gets to overrule a live "no".
  if (input.complete && input.status.linked !== false) return false;

  // Anything below means "still on the old identity".
  //
  // An empty wallet is NOT a reason to stay quiet. The sweep moves tokens; the
  // re-key moves the profile, the followers, the posts, the chess ledgers, the
  // kash points and tier — none of which a balance can see. A user with $0 and
  // four years of history has the most to lose by never linking.
  if (input.localHistory) return true;
  if (input.legacyAccount) return true;
  return false;
}

// Whether to hide the balance figure. Only while the old account still holds
// everything: once any of it has landed, the number is real money the user
// can see, even though more may still be on its way.
export function maskBalance(input: { offer: boolean; moved: boolean }): boolean {
  return input.offer && !input.moved;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// SSR sees neither flag; the store corrects it on hydration.
export function useMigrationCompleteFlag(): boolean {
  return useSyncExternalStore(subscribe, isMigrationComplete, () => false);
}

export function useLocalPrivyHistory(): boolean {
  return useSyncExternalStore(subscribe, hasLocalPrivyHistory, () => false);
}

export function useFundsMoved(): boolean {
  return useSyncExternalStore(subscribe, hasMovedFunds, () => false);
}

// Reactive read of the per-email linked flag. Flips to true the moment
// markEmailLinked runs (same tab), so the offer can short-circuit without a
// reload. SSR sees false and hydration corrects it.
export function useEmailLinked(email: string | null | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isEmailLinked(email),
    () => false
  );
}
