import type { NextConfig } from "next";
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

// next.config.ts is three wrappers deep: withMicrofrontends inside next-intl
// inside Sentry. Each one rewrites the config, so each one's output is checked
// here, on the config a Turbopack production build reads with source map
// upload switched on, the case where the most is at stake.
describe("config wrappers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function buildConfig(): Promise<NextConfig> {
    vi.stubEnv("TURBOPACK", "1");
    vi.stubEnv("WATCHTOWER_AUTH_TOKEN", "test-token");
    vi.stubEnv("WATCHTOWER_ORG", "test-org");
    vi.stubEnv("WATCHTOWER_PROJECT", "test-project");
    vi.resetModules();
    const loaded = await import("./next.config");
    return loaded.default;
  }

  it("applies withMicrofrontends as the default application", async () => {
    const config = await buildConfig();

    expect(process.env.NEXT_PUBLIC_MFE_CURRENT_APPLICATION).toBe("wsws");
    expect(config.transpilePackages).toContain("@vercel/microfrontends");
    const mfeConfig = config.compiler?.defineServer?.["process.env.MFE_CONFIG"];
    expect(typeof mfeConfig).toBe("string");
    expect(JSON.parse(mfeConfig as string)).toMatchObject({
      applications: {
        wsws: { development: { fallback: "https://www.tsionark.com" } },
        "market-square-frontend": { routing: [{ paths: ["/square", "/square/:path*"] }] },
      },
    });
  });

  // Only child applications get an asset prefix. This app's JS and CSS keep
  // their /_next URLs, so nothing already cached or linked moves.
  it("leaves this app's asset URLs where they are", async () => {
    const config = await buildConfig();

    expect(config.assetPrefix).toBeUndefined();
    expect(config.env?._sentryRewriteFramesAssetPrefixPath).toBe("");
  });

  it("keeps the next-intl request config and this app's own aliases", async () => {
    const config = await buildConfig();

    expect(config.turbopack?.resolveAlias).toMatchObject({
      "next-intl/config": "./i18n/request.ts",
      "@stripe/crypto": "./lib/stubs/empty.ts",
      "@farcaster/mini-app-solana": "./lib/stubs/empty.ts",
    });
    expect(config.turbopack?.root).toBe(import.meta.dirname);
    expect(config.experimental?.optimizePackageImports).toContain("next-intl");
  });

  // The package reads the application name from VERCEL_PROJECT_NAME before
  // anything else, and this repository deploys to more than one Vercel
  // project: wsws-test builds the staging branch. Without a fixed name that
  // build, and any checkout `vercel link`ed to it, looks up "wsws-test" in
  // microfrontends.json and fails to load the config at all.
  it("loads as wsws on another Vercel project built from this repository", async () => {
    vi.stubEnv("VERCEL_PROJECT_NAME", "wsws-test");
    vi.stubEnv("NEXT_PUBLIC_MFE_CURRENT_APPLICATION", "");
    const config = await buildConfig();

    expect(process.env.NEXT_PUBLIC_MFE_CURRENT_APPLICATION).toBe("wsws");
    expect(config.assetPrefix).toBeUndefined();
  });

  it("keeps Sentry's release and source map hooks", async () => {
    const config = await buildConfig();

    expect(typeof config.compiler?.runAfterProductionCompile).toBe("function");
    expect(config.productionBrowserSourceMaps).toBe(true);
    expect(config.experimental?.clientTraceMetadata).toContain("sentry-trace");
    expect(config.env?.NEXT_PUBLIC_APP_VERSION).toBeDefined();
  });
});
