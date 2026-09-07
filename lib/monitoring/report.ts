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
 *   4xx            an issue at WARNING. The server is working and telling us
 *                  the request was wrong, so it is not an outage, but the team
 *                  wants every failed request in the channel and this is how it
 *                  gets there while staying tellable apart from a real fault.
 *   5xx, transport an issue at ERROR, fingerprinted per service, method and
 *                  status, so a broken endpoint is ONE issue with a rising
 *                  count rather than one issue per request.
 *   breaker opens  an issue of its own, once, per service. This is the
 *                  "the backend is down" signal worth waking someone for, and
 *                  it fires once instead of once per refused poll.
 *
 * Every function here is safe to call when Sentry is not configured: the SDK
 * no-ops without a DSN, so development and the test suite need no stubs.
 */

import * as Sentry from "@sentry/nextjs";
import { isCircuitFailure } from "@/lib/api/circuit";

/**
 * How often the same failure may cost an event.
 *
 * Grouping is a DISPLAY feature: Sentry folds identical fingerprints into one
 * issue, but every event still counts against the plan's quota. This app polls
 * every second, across several tabs, and retries on failure, so one broken
 * endpoint can bill thousands of events a minute while telling us exactly one
 * thing. A blown quota then drops the events that mattered, which is the
 * failure mode worth engineering against.
 *
 * So the FIRST failure of a kind reports immediately, and the rest are counted
 * rather than sent until the window lapses. Nothing is hidden: the next event
 * through carries how many were suppressed behind it, so the true rate is
 * visible on the issue.
 */
const THROTTLE_MS = 60_000;

/** Bounded so a pathological spread of fingerprints cannot grow without limit. */
const MAX_TRACKED = 200;

interface Throttled {
  lastSentAt: number;
  suppressed: number;
}

const recent = new Map<string, Throttled>();

/**
 * Whether this failure may be sent, and what it should say about the ones it
 * stands for. Module state, so it is per tab: two tabs failing the same way
 * cost two events a minute, not one, which is the honest trade for not
 * coordinating across them.
 */
function throttle(key: string, now: number): { send: boolean; suppressed: number } {
  const seen = recent.get(key);
  if (seen && now - seen.lastSentAt < THROTTLE_MS) {
    seen.suppressed += 1;
    return { send: false, suppressed: seen.suppressed };
  }
  if (!seen && recent.size >= MAX_TRACKED) {
    // Evict the coldest entry. Insertion order is good enough here: the map is
    // only ever this large under a fault that is already being reported.
    const oldest = recent.keys().next().value;
    if (oldest !== undefined) recent.delete(oldest);
  }
  const suppressed = seen?.suppressed ?? 0;
  recent.set(key, { lastSentAt: now, suppressed: 0 });
  return { send: true, suppressed };
}

/** Test seam: the throttle is module state, so a suite must be able to clear it. */
export function resetReportThrottleForTest(): void {
  recent.clear();
}

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

  // A 4xx means the server answered and its answer was "no": the request was
  // wrong, not the service. It is still reported, at warning rather than error,
  // because the team asked for every failed request to reach the channel. The
  // level is what alert rules and the Telegram mark key off, so the two stay
  // tellable apart at a glance.
  const serverFault = isCircuitFailure(status);

  const key = `${service}|${method}|${label}`;
  const { send, suppressed } = throttle(key, Date.now());
  if (!send) return;

  Sentry.withScope((scope) => {
    scope.setLevel(serverFault ? "error" : "warning");
    // Method is part of the fingerprint on purpose: a failing GET poll and a
    // failing POST to the same service are different faults with different
    // urgency, and merging them into one issue hides the one that matters.
    scope.setFingerprint(["api-failure", service, method, label]);
    scope.setTag("api.service", service);
    scope.setTag("api.status", label);
    scope.setTag("api.method", method);
    // A tag an alert rule can filter on, to page harder for failed writes.
    scope.setTag("api.write", isWrite ? "true" : "false");
    // Lets an alert rule separate "our backend broke" from "the request was
    // rejected", without either being silent.
    scope.setTag("api.fault", serverFault ? "server" : "client");
    scope.setContext("request", {
      path,
      method,
      status: status ?? null,
      // What this event stands for. Zero on the first failure of a kind.
      suppressedSinceLastReport: suppressed,
    });
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
