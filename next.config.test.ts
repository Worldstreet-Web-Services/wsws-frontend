import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "./next.config";

describe("chess R2 routing", () => {
  it("redirects namespaced Lichess media to the immutable R2 release", async () => {
    const redirects = await nextConfig.redirects?.();
    const pieceRoute = redirects?.find((route) => route.source === "/chess/lichess/piece/:path*");

    expect(pieceRoute).toMatchObject({
      destination:
        "https://pub-669f5226f445418d8b07f013b8de572d.r2.dev/chess-assets/v1/chess/lichess/piece/:path*",
      permanent: false,
    });
  });

  it("uses fallback rewrites so local npm workers and shared app images win first", async () => {
    const rewrites = await nextConfig.rewrites?.();
    if (!rewrites || Array.isArray(rewrites)) throw new Error("Expected grouped Next.js rewrites");

    expect(rewrites.fallback).toEqual(
      expect.arrayContaining([
        {
          source: "/npm/:path*",
          destination:
            "https://pub-669f5226f445418d8b07f013b8de572d.r2.dev/chess-assets/v1/npm/:path*",
        },
        {
          source: "/images/:path*",
          destination:
            "https://pub-669f5226f445418d8b07f013b8de572d.r2.dev/chess-assets/v1/chess/lichess/images/:path*",
        },
      ])
    );
  });
});

// The Market Square is served at /square as a Next.js Multi-Zone
// (docs/adr/ADR-2026-09-16-square-microfrontend.md, amended 2026-09-17): a
// second deployment of the Square answers everything under /square, and this
// app forwards those requests before its own files are consulted.
describe("the Square zone at /square", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function rewritesWith(zoneUrl: string | undefined) {
    vi.resetModules();
    if (zoneUrl === undefined) vi.stubEnv("SQUARE_ZONE_URL", "");
    else vi.stubEnv("SQUARE_ZONE_URL", zoneUrl);
    const { default: config } = await import("./next.config");
    const rewrites = await config.rewrites?.();
    if (!rewrites || Array.isArray(rewrites)) throw new Error("Expected grouped Next.js rewrites");
    return rewrites;
  }

  it("forwards /square and everything below it to the zone before any file, keeping the prefix", async () => {
    const rewrites = await rewritesWith("https://square-ark.vercel.app");
    expect(rewrites.beforeFiles).toEqual([
      { source: "/square", destination: "https://square-ark.vercel.app/square" },
      { source: "/square/:path*", destination: "https://square-ark.vercel.app/square/:path*" },
    ]);
  });

  it("tolerates a trailing slash on the zone URL", async () => {
    const rewrites = await rewritesWith("https://square-ark.vercel.app/");
    expect(rewrites.beforeFiles?.[0]).toEqual({
      source: "/square",
      destination: "https://square-ark.vercel.app/square",
    });
  });

  it("refuses a zone URL that is not a bare https origin", async () => {
    await expect(rewritesWith("http://square-ark.vercel.app")).rejects.toThrow(/https origin/u);
    await expect(rewritesWith("https://square-ark.vercel.app/square")).rejects.toThrow(
      /https origin/u
    );
  });

  it("forwards nothing when no zone is configured", async () => {
    const rewrites = await rewritesWith(undefined);
    expect(rewrites.beforeFiles ?? []).toEqual([]);
  });

  it("keeps the chess fallback rewrites alongside the zone", async () => {
    const rewrites = await rewritesWith("https://square-ark.vercel.app");
    expect(rewrites.fallback?.length ?? 0).toBeGreaterThan(0);
  });
});
