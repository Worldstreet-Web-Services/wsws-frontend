import "server-only";

import { DecaneClient } from "decane-node";

let client: DecaneClient | null = null;

// Decane verifies access tokens against its published JWKS (or the optional
// DECANE_VERIFICATION_KEY env var, which decane-node picks up on its own), so
// unlike Privy there is no app secret to hold here.
export function getDecaneClient(): DecaneClient {
  if (client) return client;
  const appId = process.env.NEXT_PUBLIC_DECANE_APP_ID;
  if (!appId) {
    throw new Error("Decane is not configured. Set NEXT_PUBLIC_DECANE_APP_ID.");
  }
  client = new DecaneClient({ appId });
  return client;
}

export function decaneConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_DECANE_APP_ID);
}

// ── The user's preferences record on Decane ──────────────────────────────────
//
// Decane keeps a flat per-user `preferences` record (strings, numbers and
// booleans under short keys), written with the user's own access token. It is
// what Privy's custom metadata was for the account-stored settings here —
// Shine and the consent record — now that a Decane session has no Privy user
// to hang them on.
//
// decane-node 1.4.0 exposes these as getPreferences / updatePreferences on
// the client. Until that version is on the registry the two calls are made
// here directly, against the same endpoints, so this file is the only thing
// to collapse when it lands.

export type DecaneRecord = Record<string, string | number | boolean>;
export type DecaneRecordPatch = Record<string, string | number | boolean | null>;

export class DecanePreferencesError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "DecanePreferencesError";
  }
}

const PREFERENCES_TIMEOUT_MS = 10_000;

// The same resolution decane-node uses for every request it makes: the env
// override when it is set to something, else the public backend. An empty
// value counts as unset, since deploy templates write `DECANE_API_BASE=`.
function decaneApiBase(): string {
  const env = process.env.DECANE_API_BASE?.trim();
  return (env || "https://backend.decane.app").replace(/\/+$/, "");
}

async function preferencesRequest(
  token: string,
  init: { method: "GET" | "PATCH"; body?: unknown }
): Promise<DecaneRecord> {
  let res: Response;
  try {
    res = await fetch(`${decaneApiBase()}/me/preferences`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(PREFERENCES_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new DecanePreferencesError(`Decane unreachable: ${String(error)}`, 0);
  }
  if (!res.ok) {
    const envelope = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    throw new DecanePreferencesError(
      envelope.error?.message ?? `Decane answered ${res.status}`,
      res.status
    );
  }
  const body = (await res.json()) as { preferences?: unknown };
  const record = body.preferences;
  return record && typeof record === "object" ? (record as DecaneRecord) : {};
}

/** The token owner's preferences. `{}` for an account that never wrote any. */
export function readDecanePreferences(token: string): Promise<DecaneRecord> {
  return preferencesRequest(token, { method: "GET" });
}

/**
 * Merges into the token owner's preferences: each key is set, or removed when
 * its value is null; keys not named stay. Resolves to the whole record
 * afterwards, which is what a caller should answer with rather than what it
 * guessed the record would hold.
 */
export function updateDecanePreferences(
  token: string,
  patch: DecaneRecordPatch
): Promise<DecaneRecord> {
  return preferencesRequest(token, { method: "PATCH", body: { preferences: patch } });
}
