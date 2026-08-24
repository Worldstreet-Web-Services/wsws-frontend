"use client";

import { useSyncExternalStore } from "react";
import type { RecoveryShareFile } from "decane-connect-kit";

// Bridges Decane's wallet-recovery callbacks to React UI. The callbacks are
// configured on the DecaneKit provider (a plain config object, no React
// context), so they cannot render anything themselves: each one enqueues a
// request here and awaits it, and DecaneRecoveryHost renders the matching
// dialog and settles the promise with what the user chose.
//
// Why these exist at all: recovering a wallet on a new device rotates the
// Shamir share set, which invalidates the user's previous recovery file. The
// kit refuses to run recovery unless the app can collect a new password
// (onRecoveryRotated) and deliver the replacement file (onRecoveryFileReady).
// The signup-time offer (onRecoveryShareOffer) uses the same two dialogs.

export interface RecoveryAddresses {
  evmAddress: string;
  solanaAddress: string;
}

export interface RecoveryPasswordChoice {
  password: string;
  passwordHint?: string;
}

export interface RecoveryOfferChoice extends RecoveryPasswordChoice {
  wants: boolean;
}

export type RecoveryRequest =
  | {
      kind: "offer";
      addresses: RecoveryAddresses;
      resolve: (choice: RecoveryOfferChoice) => void;
    }
  | {
      kind: "rotated";
      addresses: RecoveryAddresses;
      resolve: (choice: RecoveryPasswordChoice) => void;
    }
  | {
      kind: "file";
      file: RecoveryShareFile;
      filename: string;
      resolve: () => void;
    };

const queue: RecoveryRequest[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function enqueue(request: RecoveryRequest): void {
  queue.push(request);
  notify();
}

// Called by the host once a dialog's promise is settled.
export function completeRecoveryRequest(request: RecoveryRequest): void {
  const index = queue.indexOf(request);
  if (index >= 0) queue.splice(index, 1);
  notify();
}

function currentRequest(): RecoveryRequest | null {
  return queue[0] ?? null;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useRecoveryRequest(): RecoveryRequest | null {
  return useSyncExternalStore(subscribe, currentRequest, () => null);
}

// The three callbacks DecaneKit's social config is wired to.

export function offerRecoveryShare(addresses: RecoveryAddresses): Promise<RecoveryOfferChoice> {
  return new Promise((resolve) => enqueue({ kind: "offer", addresses, resolve }));
}

export function collectRotatedRecoveryPassword(
  addresses: RecoveryAddresses
): Promise<RecoveryPasswordChoice> {
  return new Promise((resolve) => enqueue({ kind: "rotated", addresses, resolve }));
}

export function deliverRecoveryFile(file: RecoveryShareFile, filename: string): Promise<void> {
  return new Promise((resolve) => enqueue({ kind: "file", file, filename, resolve }));
}
