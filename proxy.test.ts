import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { validateMiddlewareConfig } from "@vercel/microfrontends/next/testing";
import { config, proxy } from "@/proxy";

function get(path: string) {
  return proxy(new NextRequest(new URL(`https://tsionark.com${path}`)));
}

const ORIGINAL = { ...process.env };

const MICROFRONTENDS_CONFIG = join(import.meta.dirname, "microfrontends.json");
const CLIENT_CONFIG_PATH = "/.well-known/vercel/microfrontends/client-config";

describe("proxy", () => {
  beforeEach(() => {
    delete process.env.ALLOW_ACCESS;
    delete process.env.NEXT_PUBLIC_LAUNCH_AT;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  // The state the site is in almost all of the time. A guard that is not inert
  // when open is worse than no guard.
  describe("open", () => {
    it("lets every path through when neither switch is closed", async () => {
      for (const path of ["/", "/privacy", "/dashboard", "/api/kash/status"]) {
        expect((await get(path)).status, path).toBe(200);
      }
    });

    it("stays open once the launch time has passed", async () => {
      process.env.NEXT_PUBLIC_LAUNCH_AT = new Date(Date.now() - 60_000).toISOString();
      expect((await get("/dashboard")).status).toBe(200);
    });

    it("ignores a launch time it cannot parse rather than closing the site", async () => {
      process.env.NEXT_PUBLIC_LAUNCH_AT = "not a date";
      expect((await get("/dashboard")).status).toBe(200);
    });
  });

  describe("maintenance (ALLOW_ACCESS=false)", () => {
    beforeEach(() => {
      process.env.ALLOW_ACCESS = "false";
    });

    // 503 rather than a redirect to a 200: the URLs are real and coming back,
    // so a crawler must be told to retry, not that the page has moved.
    it("answers 503 on the landing page, so the notice is not indexed as the site", async () => {
      const res = await get("/");
      expect(res.status).toBe(503);
      expect(res.headers.get("Retry-After")).toBe("3600");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    });

    it("answers 503 on an app route without redirecting, so the URL survives a refresh", async () => {
      const res = await get("/dashboard");
      expect(res.status).toBe(503);
      expect(res.headers.get("Location")).toBeNull();
      expect(res.headers.get("x-middleware-rewrite")).toContain("/");
    });

    it("keeps the legal documents open and indexable", async () => {
      for (const path of ["/privacy", "/terms"]) {
        const res = await get(path);
        expect(res.status, path).toBe(200);
        expect(res.headers.get("X-Robots-Tag"), path).toBeNull();
      }
    });

    it("closes the waitlist endpoint, which the maintenance page does not use", async () => {
      expect((await get("/api/waitlist")).status).toBe(503);
    });

    it("closes regardless of the launch clock", async () => {
      process.env.NEXT_PUBLIC_LAUNCH_AT = new Date(Date.now() - 60_000).toISOString();
      expect((await get("/dashboard")).status).toBe(503);
    });
  });

  // Unchanged behaviour, kept because maintenance now shares this function.
  describe("pre-launch (a launch time in the future)", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_LAUNCH_AT = new Date(Date.now() + 60_000).toISOString();
    });

    it("redirects an app route to the landing page", async () => {
      const res = await get("/dashboard");
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("https://tsionark.com/");
    });

    it("leaves the landing page and the waitlist endpoint open", async () => {
      expect((await get("/")).status).toBe(200);
      expect((await get("/api/waitlist")).status).toBe(200);
    });
  });

  // The routing metadata endpoint the microfrontends client reads. It is not a
  // page and says nothing about whether the app is open, so neither closed
  // state may turn it away. withMicrofrontends puts these two values in the
  // build; the test sets them the same way.
  describe("microfrontends client config", () => {
    beforeEach(() => {
      process.env.MFE_CONFIG = readFileSync(MICROFRONTENDS_CONFIG, "utf8");
      process.env.NEXT_PUBLIC_MFE_CURRENT_APPLICATION = "wsws";
    });

    async function clientConfig() {
      const res = await get(CLIENT_CONFIG_PATH);
      return { status: res.status, body: (await res.json()) as unknown };
    }

    // The client sees applications by a hash of their name, never the name:
    // 64ce06 is "wsws", ce7102 is "market-square-frontend".
    const SQUARE_ROUTING = {
      config: {
        applications: {
          "64ce06": { default: true },
          ce7102: { default: false, routing: [{ paths: ["/square", "/square/:path*"] }] },
        },
      },
    };

    it("answers with the routing table when the site is open", async () => {
      const { status, body } = await clientConfig();
      expect(status).toBe(200);
      expect(body).toEqual(SQUARE_ROUTING);
    });

    it("answers under maintenance", async () => {
      process.env.ALLOW_ACCESS = "false";
      const { status, body } = await clientConfig();
      expect(status).toBe(200);
      expect(body).toEqual(SQUARE_ROUTING);
    });

    it("answers before launch", async () => {
      process.env.NEXT_PUBLIC_LAUNCH_AT = new Date(Date.now() + 60_000).toISOString();
      const { status, body } = await clientConfig();
      expect(status).toBe(200);
      expect(body).toEqual(SQUARE_ROUTING);
    });
  });
});

// Which requests reach the gate at all. The matcher is the only thing standing
// between Square traffic and a gate that belongs to this app, so it is tested
// with Next's own matcher, not by reading the pattern.
describe("proxy matcher", () => {
  function reaches(path: string): boolean {
    return unstable_doesMiddlewareMatch({ config, url: `https://www.tsionark.com${path}` });
  }

  // Until PR 3 of docs/plans/2026-09-16-square-microfrontend-plan.md, /square
  // is still this app's own page (app/(session)/(app)/square) in production:
  // no microfrontends group exists, so nothing routes it anywhere else. The
  // gate keeps covering it, so a maintenance window or the launch clock closes
  // it like every other page. The package flags a matcher that sees a child's
  // paths; these two are declared as the deliberate exception, and it fails
  // if they are declared but no longer matched. PR 3 deletes the page, empties
  // this list, and takes /square out of the matcher.
  const SQUARE_PATHS_GATED_UNTIL_PR_3 = ["/square", "/square/:path*"];

  it("agrees with microfrontends.json, as the package checks it", () => {
    expect(() =>
      validateMiddlewareConfig(config, MICROFRONTENDS_CONFIG, SQUARE_PATHS_GATED_UNTIL_PR_3)
    ).not.toThrow();
  });

  it("still gates this app's own /square page until the Square takes the path", () => {
    for (const path of ["/square", "/square/", "/square/p/abc", "/square/u/someone"]) {
      expect(reaches(path), path).toBe(true);
    }
  });

  // The Square's JS and CSS live under its generated asset prefix. The
  // prefix is the package's hash of the project name; validateMiddlewareConfig
  // above fails if it ever changes.
  it("never sees the Square's asset prefix", () => {
    for (const path of [
      "/vc-ap-ce7102/_next/static/chunks/main",
      "/vc-ap-ce7102/_next/image",
      "/vc-ap-ce7102/_next/data/build/page",
    ]) {
      expect(reaches(path), path).toBe(false);
    }
  });

  it("still guards every route it guarded before", () => {
    for (const path of [
      "/",
      "/portfolio",
      "/spot",
      "/meme",
      "/perps",
      "/prediction/markets",
      "/casino/chess/play",
      "/dashboard",
      "/privacy",
      "/terms",
      "/api/waitlist",
      "/api/kash/status",
      "/api/market-square/posts",
      "/api/square/symbols",
      // Near misses that are not the Square's.
      "/squares",
      "/square-launch",
      "/squared/x",
    ]) {
      expect(reaches(path), path).toBe(true);
    }
  });

  it("still leaves static files alone", () => {
    for (const path of ["/_next/static/chunks/app.js", "/_next/image", "/favicon.ico"]) {
      expect(reaches(path), path).toBe(false);
    }
  });

  it("sees the microfrontends client config endpoint", () => {
    expect(reaches(CLIENT_CONFIG_PATH)).toBe(true);
  });
});
