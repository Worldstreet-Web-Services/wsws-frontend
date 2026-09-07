/**
 * What this app reports to Sentry beyond an unhandled crash.
 *
 * Sentry catches what throws. A fetch that returns 500 and is handled by the
 * caller throws nothing, so a failing backend is invisible to it unless we say
 * so — which is what this module is for.
 *
 * The hard part is not capturing failures, it is capturing them without
 * drowning. This app polls harder than anything else we run, so a single
 * unreachable service can produce thousands of failed requests a minute. The
 * volume is handled by severity rather than by silence:
 *
 *   4xx            a breadcrumb. The server is working and telling us the
 *                  request was wrong. It shows up in the trail of any real
 *                  error that follows, and creates no issue of its own.
 *   5xx, transport an issue, fingerprinted per service and status, so a broken
 *                  endpoint is ONE issue with a rising count rather than one
 *                  issue per request.
 *   breaker opens  an issue of its own, once, per service. This is the
 *                  "the backend is down" signal worth waking someone for, and
 *                  it fires once instead of once per refused poll.
 *
 * Every function here is safe to call when Sentry is not configured: the SDK
 * no-ops without a DSN, so development and the test suite need no stubs.
 */

import * as Sentry from "@sentry/nextjs";
import { isCircuitFailure } from "@/lib/api/circuit";

interface RequestFailure {
  /** The request path, e.g. "/api/portfolio/balances". */
  path: string;
  /** The breaker's service for that path: the segment after /api. */
  service: string;
  /** GET, POST, PUT, DELETE. Reads and writes fail very differently. */
  method: string;
  /** Absent for a transport failure — DNS, TCP, CORS, offline. */
  status?: number;
  /** The thrown error, when the request never got a response at all. */
  cause?: unknown;
}

/**
 * A request through apiFetch that did not return a usable response.
 *
 * The fingerprint is deliberately coarse: service plus status, never the full
 * path. Paths carry ids — a market, a game, a token address — and fingerprinting
 * on those would file one issue per id and bury the fact that a single endpoint
 * is down. The full path travels in the event's context, where it is readable
 * without fragmenting the issue.
 */
export function reportRequestFailure({
  path,
  service,
  method,
  status,
  cause,
}: RequestFailure): void {
  const label = status === undefined ? "network" : String(status);
  // A write is the user doing something deliberate: a trade, a withdrawal, a
  // KYC submission. When one fails the action did not happen, which is a
  // different kind of problem from a poll that will retry a second later.
  const isWrite = method !== "GET" && method !== "HEAD";

  if (!isCircuitFailure(status)) {
    // The server answered, and its answer was "no". Worth the trail, not an issue.
    Sentry.addBreadcrumb({
      category: "fetch",
      type: "http",
      level: "warning",
      message: `${method} ${service} responded ${label}`,
      data: { path, method, status },
    });
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel("error");
    // Method is part of the fingerprint on purpose: a failing GET poll and a
    // failing POST to the same service are different faults with different
    // urgency, and merging them into one issue hides the one that matters.
    scope.setFingerprint(["api-failure", service, method, label]);
    scope.setTag("api.service", service);
    scope.setTag("api.status", label);
    scope.setTag("api.method", method);
    // A tag an alert rule can filter on, to page harder for failed writes.
    scope.setTag("api.write", isWrite ? "true" : "false");
    scope.setContext("request", { path, method, status: status ?? null });
    Sentry.captureException(
      cause instanceof Error ? cause : new Error(`${method} ${service} failed (${label})`)
    );
  });
}

/**
 * A service's breaker just opened: enough consecutive failures that the app has
 * stopped calling it at all.
 *
 * This is the event alerting should be built on. It fires once per service per
 * outage, it means "users cannot use this part of the app right now", and it
 * cannot be produced by one flaky connection — the breaker needs consecutive
 * qualifying failures before it trips.
 */
export function reportCircuitOpen(service: string, failures: number): void {
  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setFingerprint(["circuit-open", service]);
    scope.setTag("api.service", service);
    scope.setTag("alert", "circuit-open");
    scope.setContext("circuit", { service, failures });
    Sentry.captureMessage(`Circuit opened for ${service}: ${failures} consecutive failures`);
  });
}

/**
 * Ties events to an account without sending an email or a wallet address.
 *
 * baseSentryOptions turns Sentry's own PII collection off, so this is the only
 * identity that reaches it: the Privy DID, which is meaningless outside our own
 * systems but lets a reported bug be matched to the session that hit it.
 */
export function identifySentryUser(id: string | undefined): void {
  Sentry.setUser(id ? { id } : null);
}
