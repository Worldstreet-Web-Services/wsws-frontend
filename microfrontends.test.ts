import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateRouting } from "@vercel/microfrontends/next/testing";
import { validateSchema } from "@vercel/microfrontends/validation";
import type { NextConfig } from "next";
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import packageJson from "./package.json";
import nextConfig from "./next.config";

// microfrontends.json decides, on Vercel's network, which application answers
// a path on www.tsionark.com. A typo here can take /square down, or hand a
// trading route to the Square, so the file is pinned by these tests. See
// docs/adr/ADR-2026-09-16-square-microfrontend.md.

const CONFIG_PATH = join(import.meta.dirname, "microfrontends.json");
const DEFAULT_APP = "wsws";
const SQUARE_APP = "market-square-frontend";

function readConfig(): string {
  return readFileSync(CONFIG_PATH, "utf8");
}

describe("microfrontends.json", () => {
  it("passes the package's own schema", () => {
    expect(() => validateSchema(readConfig())).not.toThrow();
  });

  // App names are the Vercel project names. The default app runs locally
  // under its package.json name, so packageName maps one to the other;
  // without it withMicrofrontends cannot find this app in the file.
  it("names the two Vercel projects, with wsws as the default", () => {
    const config = validateSchema(readConfig());

    expect(Object.keys(config.applications).sort()).toEqual([SQUARE_APP, DEFAULT_APP].sort());
    expect(config.applications[DEFAULT_APP]).toEqual({
      packageName: packageJson.name,
      development: { fallback: "https://www.tsionark.com" },
    });
  });

  it("gives the Square exactly /square and everything below it, with no flag", () => {
    const config = validateSchema(readConfig());
    const square = config.applications[SQUARE_APP];

    expect(square).toEqual({ routing: [{ paths: ["/square", "/square/:path*"] }] });
  });

  it("routes Square paths to the Square and everything else to this app", () => {
    expect(() =>
      validateRouting(CONFIG_PATH, {
        [SQUARE_APP]: ["/square", "/square/p/x", "/square/u/someone", "/square/api/kash"],
        [DEFAULT_APP]: [
          "/",
          "/portfolio",
          "/spot",
          "/meme",
          "/prediction",
          "/casino/chess",
          // Near misses: a longer first segment, and this app's own API
          // routes that merely contain the word.
          "/squares",
          "/api/square/symbols",
          "/api/market-square/posts",
        ],
      })
    ).not.toThrow();
  });
});

// Once the Square owns /square on Vercel, anything this app serves under it
// is unreachable in production and silently different in local development.
describe("this app under /square", () => {
  const root = import.meta.dirname;

  // Every file that answers a URL: pages, route handlers, and the metadata
  // routes Next serves from a file's own name (opengraph-image, icon and the
  // rest, numbered or not, generated or static).
  const ROUTE_FILE =
    /^(?:(?:page|route)\.(?:tsx?|jsx?|mdx?)|(?:favicon|(?:apple-)?icon\d*|(?:opengraph|twitter)-image\d*|sitemap|robots|manifest)\.[\w.]+)$/u;

  function routeFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) routeFiles(path, out);
      else if (ROUTE_FILE.test(entry.name)) out.push(path);
    }
    return out;
  }

  // The URL segments of the folder a route file sits in. Route groups and
  // parallel-route slots are folders, not URL segments.
  function segmentsOf(appDir: string, file: string): string[] {
    return relative(appDir, file)
      .split(sep)
      .slice(0, -1)
      .filter((segment) => !/^\(.*\)$/u.test(segment) && !segment.startsWith("@"));
  }

  // A route answers under /square when its first segment is "square", or is
  // dynamic: [slug], [...slug] and [[...slug]] all take "square" as a value.
  // A file at the root of app/ answers "/" or its own name (/icon.svg), never
  // anything under /square.
  function answersUnderSquare(segments: string[]): boolean {
    const [first] = segments;
    if (first === undefined) return false;
    return first === "square" || /^\[.+\]$/u.test(first);
  }

  // The files under projectRoot/app that can answer a request for /square or
  // anything below it, relative to projectRoot.
  function filesServingSquare(projectRoot: string): string[] {
    const appDir = join(projectRoot, "app");
    return routeFiles(appDir)
      .filter((file) => answersUnderSquare(segmentsOf(appDir, file)))
      .map((file) => relative(projectRoot, file).split(sep).join("/"))
      .sort();
  }

  it("serves nothing under /square except the in-app Home port", () => {
    // The one allowed exception. PR 3 of the plan
    // (docs/plans/2026-09-16-square-microfrontend-plan.md) deletes this page
    // when /square is handed to the Square; this list then becomes empty.
    expect(filesServingSquare(root)).toEqual(["app/(session)/(app)/square/page.tsx"]);
  });

  // The guard above is only as good as its idea of which files answer which
  // URLs, so that idea is checked on a scratch app with every kind of file
  // that can reach /square, next to near misses that cannot.
  describe("finding what answers /square", () => {
    let fixture: string;

    beforeEach(() => {
      fixture = mkdtempSync(join(tmpdir(), "square-routes-"));
    });

    afterEach(() => {
      rmSync(fixture, { recursive: true, force: true });
    });

    function touch(...files: string[]) {
      for (const file of files) {
        const path = join(fixture, file);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, "");
      }
    }

    it("finds pages, catch-alls, dynamic segments and metadata routes", () => {
      const serving = [
        "app/(session)/(app)/square/page.tsx",
        "app/(session)/(app)/square/opengraph-image.tsx",
        "app/square/p/[id]/twitter-image.png",
        "app/square/icon.svg",
        "app/[...slug]/page.tsx",
        "app/(marketing)/[[...rest]]/page.tsx",
        "app/[handle]/route.ts",
        "app/@modal/[id]/opengraph-image.tsx",
      ];
      touch(
        ...serving,
        "app/page.tsx",
        "app/icon.svg",
        "app/favicon.ico",
        "app/opengraph-image.tsx",
        "app/squares/page.tsx",
        "app/api/square/symbols/route.ts",
        "app/api/market-square/[...path]/route.ts",
        "app/trade/[symbol]/page.tsx",
        "app/square/layout.tsx",
        "app/square/components/card.tsx"
      );

      expect(filesServingSquare(fixture)).toEqual([...serving].sort());
    });
  });

  // next.config.ts can reach /square without a file under app/: a redirect or
  // rewrite whose source matches a Square path takes it over in this app, and
  // one whose destination is a Square path sends this app's traffic across.
  async function configRoutesTouchingSquare(config: NextConfig): Promise<string[]> {
    const problems: string[] = [];
    for (const path of ["/square", "/square/p/x"]) {
      const response = await unstable_getResponseFromNextConfig({
        url: `https://www.tsionark.com${path}`,
        nextConfig: config,
      });
      const redirect = getRedirectUrl(response);
      const rewrite = getRewrittenUrl(response);
      if (redirect) problems.push(`${path} redirects to ${redirect}`);
      if (rewrite) problems.push(`${path} rewrites to ${rewrite}`);
    }

    const rewrites = (await config.rewrites?.()) ?? [];
    const routes = [
      ...((await config.redirects?.()) ?? []),
      ...(Array.isArray(rewrites)
        ? rewrites
        : // Typed as arrays, but withMicrofrontends leaves afterFiles undefined
          // (next.config.test.ts pins that shape).
          [
            ...(rewrites.beforeFiles ?? []),
            ...(rewrites.afterFiles ?? []),
            ...(rewrites.fallback ?? []),
          ]),
    ];
    for (const { source, destination } of routes) {
      const { hostname, pathname } = new URL(destination, "https://www.tsionark.com");
      const sameSite = hostname === "www.tsionark.com" || hostname === "tsionark.com";
      if (sameSite && /^\/square(?:\/|$)/u.test(pathname)) {
        problems.push(`${source} sends to ${destination}`);
      }
    }
    return problems;
  }

  it("has no redirect or rewrite into or out of /square in next.config", async () => {
    expect(await configRoutesTouchingSquare(nextConfig)).toEqual([]);
  });

  it("finds a redirect or rewrite that touches /square", async () => {
    const problems = await configRoutesTouchingSquare({
      async redirects() {
        return [
          { source: "/:slug", destination: "/home", permanent: false },
          { source: "/feed", destination: "/square/feed", permanent: false },
        ];
      },
      async rewrites() {
        return {
          beforeFiles: [],
          afterFiles: [{ source: "/posts/:id", destination: "https://tsionark.com/square/p/:id" }],
          fallback: [{ source: "/elsewhere", destination: "https://example.com/square" }],
        };
      },
    });

    expect(problems).toEqual([
      "/square redirects to https://www.tsionark.com/home",
      "/feed sends to /square/feed",
      "/posts/:id sends to https://tsionark.com/square/p/:id",
    ]);
  });

  it("ships no public files under /square", () => {
    expect(existsSync(join(root, "public", "square"))).toBe(false);
  });
});
