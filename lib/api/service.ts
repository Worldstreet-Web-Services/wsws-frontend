"use client";

// One transport for every platform service.
//
// Each service is reached through our own same-origin proxy under /api/<name>,
// because the gateway sends no CORS headers and because the proxy is where the
// secret and the session check live. What differs per service is only the base
// path and the sentence a user sees when it is unreachable, so a service gets a
// client by naming those two things rather than by copying the wrapper.
//
// Before this existed there were four hand-written copies. They had drifted:
// one carried its own weaker unwrap that lost plain-text upstream errors, and
// only one dropped undefined query values instead of sending the string
// "undefined".

import { apiFetch } from "@/lib/api";
import { unwrap } from "@/lib/api/envelope";

export type QueryParams = Record<string, string | number | boolean | undefined>;

// Drops undefined entries so an unset filter is absent from the URL rather
// than sent as "undefined".
function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

// A body-carrying request. Some actions carry no body, and sending a JSON
// content-type with nothing in it is rejected by strict servers, so the header
// only goes on when there is actually a body.
function bodyInit(method: string, body: unknown): RequestInit {
  if (body === undefined) return { method };
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export interface ServiceClient {
  // A public read. Stays a plain fetch so it remains cacheable.
  get<T>(path: string, params?: QueryParams): Promise<T>;
  // A read scoped to the caller. `requireAuth` turns a cold Privy token into a
  // retryable error rather than a 401 the user has to make sense of.
  authedGet<T>(path: string, params?: QueryParams): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  del<T>(path: string, body?: unknown): Promise<T>;
}

export function createServiceClient(basePath: string, fallbackMessage: string): ServiceClient {
  const url = (path: string, params?: QueryParams) => `${basePath}${path}${buildQuery(params)}`;

  const authed = <T>(path: string, init: RequestInit): Promise<T> =>
    apiFetch(path, init, { requireAuth: true }).then((res) => unwrap<T>(res, fallbackMessage));

  return {
    get: <T>(path: string, params?: QueryParams) =>
      fetch(url(path, params)).then((res) => unwrap<T>(res, fallbackMessage)),
    authedGet: <T>(path: string, params?: QueryParams) => authed<T>(url(path, params), {}),
    post: <T>(path: string, body?: unknown) => authed<T>(url(path), bodyInit("POST", body)),
    put: <T>(path: string, body?: unknown) => authed<T>(url(path), bodyInit("PUT", body)),
    del: <T>(path: string, body?: unknown) => authed<T>(url(path), bodyInit("DELETE", body)),
  };
}
