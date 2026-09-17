import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// /square is served by the Square zone (docs/adr/ADR-2026-09-16-square-microfrontend.md,
// amended 2026-09-17). next.config rewrites it before this app's files, so any
// route here that answers under /square would be unreachable, and a sign that
// something still thinks this app owns the path.
const APP_DIR = join(__dirname);
const ROUTE_FILE = /^(page|route|default|layout|template|loading|error|not-found)\.(tsx?|jsx?)$/u;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return ROUTE_FILE.test(name) ? [path] : [];
  });
}

function urlSegments(file: string): string[] {
  return relative(APP_DIR, file)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !/^\(.+\)$/u.test(segment) && !segment.startsWith("@"));
}

describe("routes under /square", () => {
  it("serves nothing under /square, which belongs to the Square zone", () => {
    const serving = routeFiles(APP_DIR)
      .filter((file) => urlSegments(file)[0] === "square")
      .map((file) => relative(APP_DIR, file).split(sep).join("/"));
    expect(serving).toEqual([]);
  });

  it("still keeps this app's own /api/square routes", () => {
    const api = routeFiles(APP_DIR).filter((file) => {
      const segments = urlSegments(file);
      return segments[0] === "api" && segments[1] === "square";
    });
    expect(api.length).toBeGreaterThan(0);
  });
});
