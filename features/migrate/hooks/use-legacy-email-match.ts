"use client";

import { usePrivy, type User } from "@privy-io/react-auth";
import { useAuthSession } from "@/hooks/use-auth-session";

// The old account must be the SAME PERSON's. The backend already demands a
// live token from both sides, so nobody can link an account they do not
// control — but someone who controls two old accounts can link the wrong one,
// and then the sweep moves the wrong money. The cheapest proof of "same
// person" is the email: what the Decane session signed in with must be what
// the old (Privy) account signed in with.
//
// Only enforced when BOTH sides have an email. Privy allowed signing in with
// X, and those accounts carry a handle and no address; a rule that demanded an
// email would strand every one of them. Case-insensitive: providers disagree
// on capitalisation and Gmail ignores it.

/** The email the old account signed in with, or "" when it has none. */
export function legacyEmail(user: User | null): string {
  return user?.google?.email ?? user?.email?.address ?? "";
}

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

/** The pure rule: true only when both are known and differ. */
export function emailsMismatch(expected: string, actual: string): boolean {
  const a = normalise(expected);
  const b = normalise(actual);
  return Boolean(a && b && a !== b);
}

export interface LegacyEmailMatch {
  /** What the Decane session signed in with — what the old account must match. */
  expected: string;
  /** What the old account signed in with, or "" before sign-in or with no email. */
  actual: string;
  mismatch: boolean;
}

export function useLegacyEmailMatch(): LegacyEmailMatch {
  const { authenticated, user } = usePrivy();
  const { profile } = useAuthSession();
  const expected = profile.email;
  const actual = authenticated ? legacyEmail(user) : "";
  return { expected, actual, mismatch: emailsMismatch(expected, actual) };
}
