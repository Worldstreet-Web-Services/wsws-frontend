/**
 * The Sentry options every runtime shares.
 *
 * Next runs this app in three places — the browser, Node, and the edge — and
 * each boots Sentry from its own file. Everything that should be identical
 * across the three lives here so a sample rate or a filter cannot drift
 * between them.
 *
 * Framework-free and runtime-agnostic on purpose: no browser globals, no React,
 * nothing that only exists on the server. It is imported by all three configs.
 */

/**
 * The DSN is PUBLIC by design. It only identifies the project to accept events
 * for; it grants no read access, so it belongs in a NEXT_PUBLIC_ variable and
 * ships in the bundle. The auth token used to upload source maps is the secret
 * one, and that is server-only (see SENTRY_AUTH_TOKEN in .env.example).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * With no DSN the SDK is inert. Stating it explicitly means a developer running
 * without Sentry configured gets no network attempts and no console noise, and
 * the test suite never has to stub the transport.
 */
export const sentryEnabled = Boolean(dsn);

/**
 * Which deployment an event came from, so a preview branch's errors never page
 * anyone about production. Vercel exposes NEXT_PUBLIC_VERCEL_ENV as one of
 * "production", "preview" or "development".
 */
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

/**
 * Ties an event to the build it came from, which is what makes an uploaded
 * source map resolve. next.config.ts already stamps the package version into
 * the bundle for analytics, so the same value serves here rather than a second
 * source of truth.
 */
const release = process.env.NEXT_PUBLIC_APP_VERSION;

/**
 * Errors this app throws deliberately, as control flow, and browser noise no
 * one can act on. None of these represent a fault, and all of them are high
 * volume, so they are dropped before they ever cost an event.
 */
const ignoreErrors = [
  // apiFetch throws this when Privy reports "authenticated" a moment before the
  // tokens are warm. The caller's query retries and succeeds; see lib/api.ts.
  "Auth not ready, retrying",
  // The circuit breaker refusing a read while a service is down. The breaker
  // OPENING is reported once, as its own event; the thousands of refusals that
  // follow are the breaker working, not a fault worth an issue each.
  "Can't reach the server right now",
  // A navigation or an unmount cancelled the request. Routine in an app that
  // polls this hard.
  "AbortError",
  "The user aborted a request",
  // Benign, fires constantly in Chrome, and is not actionable.
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
  // Wallet extensions injecting into the page. Not our stack.
  "Cannot redefine property: ethereum",
];

/**
 * Sampling. Tracing is sampled far below the Sentry default because this app
 * polls harder than anything else we run — live match state every second,
 * tickets every second, several deliberately continuing in a hidden tab. At
 * the documented 10% those polls alone would dominate the span quota and tell
 * us nothing. Errors are never sampled; this governs performance traces only.
 */
const tracesSampleRate = process.env.NODE_ENV === "development" ? 1.0 : 0.02;

export const baseSentryOptions = {
  dsn,
  enabled: sentryEnabled,
  environment,
  release,
  tracesSampleRate,
  ignoreErrors,
  /**
   * This app moves money. Sentry's default is to attach the caller's IP and
   * identifying request data to every event; we turn that off and attach only
   * the Privy DID ourselves where a session is known, so an event is traceable
   * to an account without carrying an email or an address into a third party.
   */
  sendDefaultPii: false,
};
