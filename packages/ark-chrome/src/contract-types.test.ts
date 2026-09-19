import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// The props contract is a TypeScript contract, and the hosts that break it are
// not in this repository. This compiles, with the TypeScript compiler, the
// code a host writes: the README's no-i18n example, and the link components a
// host passes (next/link, and the microfrontends Link, which insists on
// children). A contract change that one of them no longer satisfies fails here
// rather than in the Square's build.

const SRC = import.meta.dirname;
const PACKAGE = join(SRC, "..");
// Virtual files sit inside the package, so `react` and `next` resolve from the
// repository's node_modules exactly as they do for the package's own source.
const VIRTUAL = join(SRC, "__contract__");

// The Link declaration from @vercel/microfrontends 2.4.0
// (dist/next/client.d.ts), which the Square passes as `DocumentLink`. Copied
// rather than installed: WSWS does not depend on the microfrontends package.
const MICROFRONTENDS_CLIENT = `
declare module "@vercel/microfrontends/next/client" {
  import * as react from "react";
  import { AnchorHTMLAttributes } from "react";
  import { LinkProps as LinkProps$1 } from "next/link.js";
  interface BaseProps {
    children: React.ReactNode;
    href: string;
  }
  interface NextLinkProps extends LinkProps$1 {}
  export const Link: react.ForwardRefExoticComponent<
    BaseProps &
      Omit<NextLinkProps, keyof BaseProps> &
      Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> &
      react.RefAttributes<HTMLAnchorElement>
  >;
}
`;

// The README example's one host import, typed as the example uses it.
const SQUARE_SESSION = `
declare module "@/lib/session" {
  import type { ReactNode } from "react";
  export function useSquareSession(): {
    ready: boolean;
    signedIn: boolean;
    displayName: string;
    avatar: ReactNode;
    login: () => void;
    openGoLive: () => void;
  };
}
`;

const LINK_COMPONENTS = `
import NextLink from "next/link";
import { Link as ZoneLink } from "@vercel/microfrontends/next/client";
import type { ChromeLinkComponent } from "@ark/chrome";

export const nextLink: ChromeLinkComponent = NextLink;
export const zoneLink: ChromeLinkComponent = ZoneLink;
`;

/** The README's complete host example: the first tsx block under its heading. */
function readmeExample(): string {
  const readme = readFileSync(join(PACKAGE, "README.md"), "utf8");
  const section = readme.slice(readme.indexOf("## Example: a host with no i18n"));
  const block = /```tsx\n([\s\S]*?)```/.exec(section);
  if (!block) throw new Error("README has no tsx block under its no-i18n example");
  return block[1];
}

function diagnosticsFor(files: Record<string, string>): string[] {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    isolatedModules: true,
    types: [],
    // As a host resolves the installed package: through its exports, to source.
    paths: { "@ark/chrome": [join(SRC, "index.ts")] },
  };
  const virtual = new Map(Object.entries(files).map(([name, text]) => [join(VIRTUAL, name), text]));
  const host = ts.createCompilerHost(options, true);
  const { fileExists, readFile, getSourceFile } = host;
  host.fileExists = (name) => virtual.has(name) || fileExists.call(host, name);
  host.readFile = (name) => virtual.get(name) ?? readFile.call(host, name);
  host.getSourceFile = (name, languageVersion, onError, shouldCreate) => {
    const text = virtual.get(name);
    return text === undefined
      ? getSourceFile.call(host, name, languageVersion, onError, shouldCreate)
      : ts.createSourceFile(name, text, languageVersion, true);
  };
  const program = ts.createProgram([...virtual.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const where = d.file ? `${d.file.fileName.slice(PACKAGE.length + 1)}: ` : "";
    return where + ts.flattenDiagnosticMessageText(d.messageText, "\n");
  });
}

describe("@ark/chrome props contract, as a host compiles it", () => {
  it("accepts next/link and the microfrontends Link as link components, and the README example", () => {
    expect(
      diagnosticsFor({
        "microfrontends-client.d.ts": MICROFRONTENDS_CLIENT,
        "square-session.d.ts": SQUARE_SESSION,
        "link-components.tsx": LINK_COMPONENTS,
        "readme-example.tsx": readmeExample(),
      })
    ).toEqual([]);
  }, 60_000);

  // The check above is only worth something if a broken host does fail it.
  it("refuses a host that breaks the contract", () => {
    const broken = `
import Link from "next/link";
import { ArkSidebar } from "@ark/chrome";

export const rail = (
  <ArkSidebar
    items={[]}
    activeId={null}
    Link={Link}
    brand={{ target: { kind: "action" } }}
    person={{ status: "loading" }}
    drawer={{ open: false, onClose: () => {} }}
    labels={{ menu: "Menu", closeMenu: "Close menu" }}
  />
);
`;
    const diagnostics = diagnosticsFor({ "broken-host.tsx": broken });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatch(/^src\/__contract__\/broken-host\.tsx: Type '"action"'/);
  }, 60_000);
});
