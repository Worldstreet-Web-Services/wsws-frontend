import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A hand-rolled mock, not vi.fn() defaults, so every assertion below reads
// straight off calls the module actually made.
const init = vi.fn();
const identify = vi.fn();
const peopleSet = vi.fn();
const reset = vi.fn();
const track = vi.fn();

vi.mock("mixpanel-browser", () => ({
  default: {
    init,
    identify,
    people: { set: peopleSet },
    reset,
    track,
  },
}));

// The module reads NEXT_PUBLIC_MIXPANEL_TOKEN and caches "initialized" at
// module scope, so each scenario needs its own fresh import.
async function loadWithToken(token: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", token as string);
  return import("@/lib/analytics/mixpanel");
}

beforeEach(() => {
  init.mockClear();
  identify.mockClear();
  peopleSet.mockClear();
  reset.mockClear();
  track.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("without a configured token", () => {
  it("never reaches the SDK", async () => {
    const { initAnalytics, identifyUser, resetAnalytics, trackEvent } =
      await loadWithToken(undefined);
    initAnalytics();
    identifyUser("user_1");
    resetAnalytics();
    trackEvent("withdraw_submitted");
    expect(init).not.toHaveBeenCalled();
    expect(identify).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});

describe("with a configured token", () => {
  it("initializes once with the token", async () => {
    const { initAnalytics } = await loadWithToken("test_token");
    initAnalytics();
    initAnalytics();
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      "test_token",
      expect.objectContaining({ autocapture: false })
    );
  });

  it("identifies with the given id and profile properties", async () => {
    const { initAnalytics, identifyUser } = await loadWithToken("test_token");
    initAnalytics();
    identifyUser("user_1", { $email: "a@b.com" });
    expect(identify).toHaveBeenCalledWith("user_1");
    expect(peopleSet).toHaveBeenCalledWith({ $email: "a@b.com" });
  });

  it("does nothing before initAnalytics has run", async () => {
    const { identifyUser, trackEvent } = await loadWithToken("test_token");
    identifyUser("user_1");
    trackEvent("withdraw_submitted");
    expect(identify).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("tracks an event with its properties", async () => {
    const { initAnalytics, trackEvent } = await loadWithToken("test_token");
    initAnalytics();
    trackEvent("withdraw_submitted", { chain: "base" });
    expect(track).toHaveBeenCalledWith("withdraw_submitted", { chain: "base" });
  });

  it("resets the local identity", async () => {
    const { initAnalytics, resetAnalytics } = await loadWithToken("test_token");
    initAnalytics();
    resetAnalytics();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
