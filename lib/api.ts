"use client";

import { resolveAuthTokens, type AuthIdentity } from "@/lib/auth-token";
import { LegacySessionError } from "@/lib/errors";

export interface ApiFetchOptions {
  // Throw a retryable error instead of firing a token-less request that 401s.
  requireAuth?: boolean;
  // Which identity signs the request: the app's (Decane) by default, or the
  // OLD Privy identity for the migration flow's legacy calls. See
  // lib/auth-token for the rules.
  identity?: AuthIdentity;
}

// The auth headers for one identity, for the few callers that cannot go
// through apiFetch: SDKs that own their own transport (the Polymarket client,
// viem's RPC transport) but must still authenticate to our proxies.
export async function authHeaders(
  identity: AuthIdentity = "current"
): Promise<Record<string, string>> {
  const { accessToken, idToken } = await resolveAuthTokens(identity);
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (idToken) headers["privy-id-token"] = idToken;
  return headers;
}

// Fetch wrapper for our API routes. Attaches the caller's access token so the
// server can verify them, plus the Privy identity token when available so
// routes can resolve the full user without an extra Privy API call.
//
// On a cold first load the provider can report "authenticated" a moment before
// the access token is warm, so the access token is briefly null. Callers of
// auth-gated routes pass `requireAuth` so that, instead of firing a token-less
// request that 401s, we throw a retryable error and let the caller's query
// retry once the token lands. A legacy-identity call with no Privy session is
// not retryable: it throws LegacySessionError so the flow can ask the user to
// sign in to the old account.
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  opts: ApiFetchOptions = {}
): Promise<Response> {
  const identity = opts.identity ?? "current";
  const { accessToken, idToken } = await resolveAuthTokens(identity);
  if (opts.requireAuth && !accessToken) {
    if (identity === "legacy") throw new LegacySessionError();
    throw new Error("Auth not ready, retrying");
  }
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (idToken) headers.set("privy-id-token", idToken);
  return fetch(path, { ...init, headers });
}
