import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The package is installed by an app that has none of WSWS's providers, path
// aliases or Tailwind tokens. ESLint stops those imports while editing; this
// reads the shipped files themselves, so a lint override cannot let one through.

const SRC = import.meta.dirname;
const PACKAGE = join(SRC, "..");

function sourceFiles(): string[] {
  return readdirSync(SRC)
    .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name))
    .map((name) => join(SRC, name));
}

function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);
}

describe("@ark/chrome isolation", () => {
  it("imports only React, motion and its own files", () => {
    const allowed = /^(react|react\/jsx-runtime|react-dom|motion\/react|\.\/[\w-]+)$/;
    const offenders = sourceFiles().flatMap((file) =>
      importsOf(file)
        .filter((spec) => !allowed.test(spec))
        .map((spec) => `${file.slice(PACKAGE.length + 1)}: ${spec}`)
    );
    expect(offenders).toEqual([]);
  });

  it("marks every module that needs the browser as a client module", () => {
    // State, effects, refs and motion only run in the browser. A module that
    // uses none of them (the icons) stays renderable from a server component.
    const clientOnly = /\buse(State|Effect|LayoutEffect|Ref|Reducer)\b|["']motion\/react["']/;
    const missing = sourceFiles()
      .filter((file) => clientOnly.test(readFileSync(file, "utf8")))
      .filter((file) => !readFileSync(file, "utf8").startsWith('"use client";'))
      .map((file) => file.slice(PACKAGE.length + 1));
    expect(missing).toEqual([]);
  });

  it("styles only its own prefixed classes", () => {
    for (const sheet of ["styles.css", "transitions.css"]) {
      const css = readFileSync(join(SRC, sheet), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      // Each prelude is the text between the previous brace or semicolon and
      // the next opening brace. At-rules (@media, @view-transition) are not
      // selectors and are skipped.
      const selectors = [...css.matchAll(/(?<=^|[{};])\s*([^{};]+?)\s*(?=\{)/g)]
        .map((m) => m[1].trim())
        .filter((s) => s && !s.startsWith("@") && !/^(from|to|\d+%)$/.test(s));
      for (const group of selectors) {
        for (const selector of group.split(",").map((s) => s.trim())) {
          expect(selector, `${sheet}: ${selector}`).toMatch(/^\.ark-chrome-[\w-]+/);
        }
      }
    }
  });

  it("names no Tailwind layer, so host utilities cannot outrank it", () => {
    const css = readFileSync(join(SRC, "styles.css"), "utf8");
    expect(css).not.toMatch(/@layer|@apply|@tailwind|@theme/);
  });

  it("ships the art its stylesheets point at", () => {
    const files = readdirSync(join(PACKAGE, "assets"));
    for (const sheet of ["styles.css", "fonts.css"]) {
      const css = readFileSync(join(SRC, sheet), "utf8");
      for (const [, ref] of css.matchAll(/url\("\.\.\/assets\/([^"]+)"\)/g)) {
        expect(files).toContain(ref);
      }
    }
  });
});
