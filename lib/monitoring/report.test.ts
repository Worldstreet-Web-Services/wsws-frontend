import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * What each kind of request failure becomes.
 *
 * The team's requirement is that EVERY failed request reaches the alert
 * channel, so nothing is downgraded to a breadcrumb any more. The level and the
 * api.fault tag are what keep "our backend broke" separable from "the request
 * was rejected" once they are all in the same stream.
 */
const captureException = vi.fn();
const addBreadcrumb = vi.fn();
const scope = {
  setLevel: vi.fn(),
  setFingerprint: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
};

vi.mock("@sentry/nextjs", () => ({
  captureException: (...a: unknown[]) => captureException(...a),
  captureMessage: vi.fn(),
  addBreadcrumb: (...a: unknown[]) => addBreadcrumb(...a),
  setUser: vi.fn(),
  withScope: (cb: (s: typeof scope) => void) => cb(scope),
}));

const { reportRequestFailure, resetReportThrottleForTest } =
  await import("@/lib/monitoring/report");

function tagsFrom(): Record<string, string> {
  return Object.fromEntries(scope.setTag.mock.calls as [string, string][]);
}

describe("reportRequestFailure", () => {
  beforeEach(() => {
    resetReportThrottleForTest();
    captureException.mockClear();
    addBreadcrumb.mockClear();
    scope.setLevel.mockClear();
    scope.setFingerprint.mockClear();
    scope.setTag.mockClear();
    scope.setContext.mockClear();
  });

  it("files a 5xx as an error", () => {
    reportRequestFailure({
      path: "/api/pouch/offramp",
      service: "pouch",
      method: "POST",
      status: 500,
    });
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(scope.setLevel).toHaveBeenCalledWith("error");
    expect(tagsFrom()["api.fault"]).toBe("server");
  });

  /** The change the team asked for: a 4xx used to be a breadcrumb and silent. */
  it("files a 4xx as a warning rather than dropping it to a breadcrumb", () => {
    reportRequestFailure({
      path: "/api/pouch/verify-bank",
      service: "pouch",
      method: "POST",
      status: 422,
    });
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(addBreadcrumb).not.toHaveBeenCalled();
    expect(scope.setLevel).toHaveBeenCalledWith("warning");
    expect(tagsFrom()["api.fault"]).toBe("client");
  });

  it("files a transport failure, which has no status at all, as an error", () => {
    reportRequestFailure({
      path: "/api/portfolio",
      service: "portfolio",
      method: "GET",
      cause: new Error("offline"),
    });
    expect(scope.setLevel).toHaveBeenCalledWith("error");
    expect(tagsFrom()["api.status"]).toBe("network");
  });

  it("marks writes so an alert rule can page harder for them", () => {
    reportRequestFailure({
      path: "/api/pouch/offramp",
      service: "pouch",
      method: "POST",
      status: 500,
    });
    expect(tagsFrom()["api.write"]).toBe("true");
    scope.setTag.mockClear();
    reportRequestFailure({
      path: "/api/portfolio",
      service: "portfolio",
      method: "GET",
      status: 500,
    });
    expect(tagsFrom()["api.write"]).toBe("false");
  });

  /** One broken endpoint must stay one issue, however many times it fails. */
  it("fingerprints on service, method and status, never the full path", () => {
    reportRequestFailure({
      path: "/api/prediction/abc123",
      service: "prediction",
      method: "GET",
      status: 500,
    });
    expect(scope.setFingerprint).toHaveBeenCalledWith(["api-failure", "prediction", "GET", "500"]);
  });
});

/**
 * Quota protection.
 *
 * Sentry groups identical fingerprints into one ISSUE, but bills every EVENT.
 * This app polls every second and retries on failure, so without a throttle one
 * broken endpoint would spend a month's quota in an afternoon and then drop the
 * events that actually mattered.
 */
describe("reportRequestFailure throttling", () => {
  beforeEach(() => {
    resetReportThrottleForTest();
    captureException.mockClear();
    scope.setContext.mockClear();
  });

  const failure = { path: "/api/portfolio", service: "portfolio", method: "GET", status: 500 };

  it("reports the first failure of a kind immediately", () => {
    reportRequestFailure(failure);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("counts the repeats instead of billing for each one", () => {
    for (let i = 0; i < 500; i += 1) reportRequestFailure(failure);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  /** Different faults must not throttle each other. */
  it("throttles per service, method and status, not globally", () => {
    reportRequestFailure(failure);
    reportRequestFailure({ ...failure, status: 503 });
    reportRequestFailure({ ...failure, method: "POST" });
    reportRequestFailure({ ...failure, service: "kash" });
    expect(captureException).toHaveBeenCalledTimes(4);
  });

  /** Nothing is hidden: the next event says how many it stands for. */
  it("carries the suppressed count on the event that follows", () => {
    vi.useFakeTimers();
    try {
      reportRequestFailure(failure);
      for (let i = 0; i < 9; i += 1) reportRequestFailure(failure);
      vi.advanceTimersByTime(61_000);
      scope.setContext.mockClear();
      reportRequestFailure(failure);

      const request = scope.setContext.mock.calls.find((c) => c[0] === "request")?.[1] as {
        suppressedSinceLastReport: number;
      };
      expect(request.suppressedSinceLastReport).toBe(9);
      expect(captureException).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
