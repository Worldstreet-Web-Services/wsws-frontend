import { spawn, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// scripts/dev-mf.sh starts two long-running commands, the microfrontends
// proxy and next dev, each of which has children of its own. Whatever stops
// the script (Ctrl-C, an IDE task runner's SIGTERM, a closed terminal's
// SIGHUP) must stop both, or the next run finds ports 3024 and 7448 taken.
//
// The real commands take seconds to start and bind real ports, so they are
// replaced by stubs on PATH that behave the same way where it matters: each is
// a process with a child, and each records both pids.

const SCRIPT = join(import.meta.dirname, "dev-mf.sh");
const PID_FILES = ["proxy.pid", "proxy-child.pid", "next.pid", "next-child.pid"];

// ignoreTerm stands in for a command that does not stop when asked, for
// whatever reason: busy, stuck, or finishing work first.
function stub(name: string, { ignoreTerm = false } = {}): string {
  return `#!/usr/bin/env bash
if [ "\${1:-}" = "port" ]; then echo 7448; exit 0; fi
${ignoreTerm ? "trap '' TERM" : ""}
echo $$ > "$STUB_DIR/${name}.pid"
sleep 300 &
echo $! > "$STUB_DIR/${name}-child.pid"
wait
`;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

async function until(condition: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return condition();
}

describe("dev:mf", () => {
  let stubDir: string;
  let script: ChildProcess | undefined;

  function pids(): number[] {
    return PID_FILES.map((file) => Number(readFileSync(join(stubDir, file), "utf8").trim()));
  }

  function writeStubs(options: { ignoreTerm?: boolean } = {}) {
    for (const name of ["microfrontends", "next"]) {
      const bin = name === "microfrontends" ? "proxy" : "next";
      const path = join(stubDir, name);
      writeFileSync(path, stub(bin, options));
      chmodSync(path, 0o755);
    }
  }

  beforeEach(() => {
    stubDir = mkdtempSync(join(tmpdir(), "dev-mf-"));
    writeStubs();
  });

  afterEach(() => {
    // A failing run must not leave stubs sleeping on the machine.
    if (PID_FILES.every((file) => existsSync(join(stubDir, file)))) {
      for (const pid of pids()) if (alive(pid)) process.kill(pid, "SIGKILL");
    }
    if (script?.pid && script.exitCode === null) script.kill("SIGKILL");
    rmSync(stubDir, { recursive: true, force: true });
  });

  async function start(): Promise<ChildProcess> {
    const child = spawn(SCRIPT, [], {
      env: { ...process.env, PATH: `${stubDir}:${process.env.PATH ?? ""}`, STUB_DIR: stubDir },
      stdio: "ignore",
    });
    const started = await until(
      () => PID_FILES.every((file) => existsSync(join(stubDir, file))),
      5_000
    );
    expect(started, "both commands started").toBe(true);
    return child;
  }

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    it(`stops the proxy, next dev and their children on ${signal}`, async () => {
      script = await start();
      const running = pids();
      expect(running.every(alive)).toBe(true);

      const exited = new Promise((resolve) => script?.once("exit", resolve));
      script.kill(signal);
      await exited;

      const stopped = await until(() => !running.some(alive), 3_000);
      const survivors = PID_FILES.filter((_, i) => alive(running[i]));
      expect(stopped, `still running: ${survivors.join(", ")}`).toBe(true);
    }, 15_000);
  }

  // Ctrl-C under `pnpm dev:mf` signals the script more than once: the
  // terminal sends SIGINT to the whole foreground group, pnpm passes SIGINT on
  // and then SIGTERM as it exits, and a closing terminal adds SIGHUP. None of
  // them may cut short a stop that is already under way.
  it("stops both even when a second signal arrives while it is stopping", async () => {
    script = await start();
    const running = pids();

    const exited = new Promise((resolve) => script?.once("exit", resolve));
    script.kill("SIGINT");
    const deadline = Date.now() + 500;
    while (script.exitCode === null && script.signalCode === null && Date.now() < deadline) {
      script.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    await exited;

    const stopped = await until(() => !running.some(alive), 3_000);
    const survivors = PID_FILES.filter((_, i) => alive(running[i]));
    expect(stopped, `still running: ${survivors.join(", ")}`).toBe(true);
  }, 15_000);

  // Seen by hand once: after Ctrl-C the script was gone, but next dev and the
  // proxy were still running with ports 7448 and 3024 held, and a plain
  // SIGTERM stopped both at once afterwards. Whatever kept them from stopping
  // the first time, the script must not return while they still run.
  it("does not leave behind a command that ignores the request to stop", async () => {
    writeStubs({ ignoreTerm: true });
    script = await start();
    const running = pids();

    const exited = new Promise((resolve) => script?.once("exit", resolve));
    script.kill("SIGINT");
    await exited;

    const survivors = PID_FILES.filter((_, i) => alive(running[i]));
    expect(survivors, "still running once the script has returned").toEqual([]);
  }, 20_000);
});
