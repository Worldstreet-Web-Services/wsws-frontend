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
// (onRecoveryRotated), deliver the replacement file (onRecoveryFileReady),
// and, on a device with neither share nor passkey, take the saved file back
// in (promptForRecoveryFile). There is no signup-time offer: since 2.7.4
// server-assisted provisioning covers new devices, and the kit no longer
// calls onRecoveryShareOffer unless offerRecoveryAtSignup is set explicitly.

export interface RecoveryAddresses {
  evmAddress: string;
  solanaAddress: string;
}

export interface RecoveryPasswordChoice {
  password: string;
  passwordHint?: string;
}

export type RecoveryRequest =
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
    }
  | {
      // A new device with no passkey: the user supplies the recovery file they
      // saved, plus its password. null means they cancelled, which the kit
      // reports as NewDeviceError.
      kind: "restore";
      resolve: (supplied: RecoveryFileSupply | null) => void;
    };

export interface RecoveryFileSupply {
  value: unknown;
  getPassword: () => Promise<string | null>;
}

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

export function collectRotatedRecoveryPassword(
  addresses: RecoveryAddresses
): Promise<RecoveryPasswordChoice> {
  return new Promise((resolve) => enqueue({ kind: "rotated", addresses, resolve }));
}

export function deliverRecoveryFile(file: RecoveryShareFile, filename: string): Promise<void> {
  return new Promise((resolve) => enqueue({ kind: "file", file, filename, resolve }));
}

export function promptForRecoveryFile(): Promise<RecoveryFileSupply | null> {
  return new Promise((resolve) => enqueue({ kind: "restore", resolve }));
}
