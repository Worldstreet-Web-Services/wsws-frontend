"use client";

// Transport for the chess service. Reads are public and go straight through the
// proxy; writes act on a game and carry the caller's Privy session, which the
// proxy verifies and turns into the wallet address the service identifies
// players by.

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/casino/api/envelope";

const BASE_PATH = "/api/chess";
const FALLBACK_MESSAGE = "Chess is unavailable right now.";

export async function chessGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  return unwrap<T>(await fetch(`${BASE_PATH}${path}${query}`), FALLBACK_MESSAGE);
}

// For reads that are nobody else's business, such as a cashier balance. The
// proxy rejects these without a verified session, so the token has to be on the
// request rather than left to the public path above.
export async function chessAuthedGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  return unwrap<T>(
    await apiFetch(`${BASE_PATH}${path}${query}`, {}, { requireAuth: true }),
    FALLBACK_MESSAGE
  );
}

// The body always exists on this service, even for an action as simple as
// resigning, because the player has to be named. The proxy overwrites that name
// with the verified one before it goes upstream.
export async function chessPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  return unwrap<T>(
    await apiFetch(
      `${BASE_PATH}${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      { requireAuth: true }
    ),
    FALLBACK_MESSAGE
  );
}
