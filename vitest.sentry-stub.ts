/**
 * Stand-in for @sentry/nextjs in tests.
 *
 * The real package pulls in @sentry/server-utils, whose bundler plugin calls
 * fileURLToPath on a non-file URL the moment it is imported. Under Vitest that
 * throws before any test runs, so every suite that reaches the transport —
 * lib/api, the circuit store, the casino wire modules — failed at import.
 *
 * Stubbing is also the right answer on its own terms: a unit test should not be
 * booting an APM SDK. These are no-ops with the real shapes, so code under test
 * calls them exactly as it would in the browser. A test that wants to assert
 * something WAS reported mocks @/lib/monitoring/report instead, which is the
 * seam that carries our own meaning rather than the vendor's.
 */

interface StubScope {
  setLevel: (level: string) => StubScope;
  setFingerprint: (fingerprint: string[]) => StubScope;
  setTag: (key: string, value: string) => StubScope;
  setContext: (key: string, context: unknown) => StubScope;
  setUser: (user: unknown) => StubScope;
}

function scope(): StubScope {
  const self: StubScope = {
    setLevel: () => self,
    setFingerprint: () => self,
    setTag: () => self,
    setContext: () => self,
    setUser: () => self,
  };
  return self;
}

export function init(): void {}
export function captureException(): string {
  return "";
}
export function captureMessage(): string {
  return "";
}
export function addBreadcrumb(): void {}
export function setUser(): void {}
export function captureRouterTransitionStart(): void {}
export function captureRequestError(): void {}

export function withScope<T>(callback: (s: StubScope) => T): T {
  return callback(scope());
}
