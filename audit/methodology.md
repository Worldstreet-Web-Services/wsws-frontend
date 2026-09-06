# Methodology

How findings are produced, rated, and — critically — **verified**. A finding is not "done" until its confidence is `Confirmed` with a repro recipe, or it is downgraded.

## 1. Approach

1. **Static reconnaissance** — read the intended architecture (`docs/ARCHITECTURE.md`, `docs/RESTRUCTURE-LOG.md`), then sweep for the known re-render/structure smells (unmemoized context values, module store fan-out, polling without background-pause, unstable query results, oversized files, duplicated patterns). Recon findings enter the register at **Likely**.
2. **Dynamic verification** — reproduce and measure each performance finding in a running app (below). Promote **Likely → Confirmed** on observation, or downgrade.
3. **Structural analysis** — measure file sizes, import graphs, and boundary compliance objectively.
4. **Triage & report** — rate Severity/Confidence/Effort, record in the register, recommend the fix by pointing at the in-repo pattern to copy.

## 2. Tools

| Tool                                                                   | Use                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **React DevTools → Profiler**                                          | Record an interaction; read the flame/ranked chart to count which components re-render and why ("Why did this render?"). Primary evidence for PERF findings. |
| **React Scan** (`npx react-scan`)                                      | Live render-count overlay to spot elements re-rendering when they shouldn't.                                                                                 |
| **DevTools → Performance**                                             | Long tasks, scripting time, jank during interactions/animations.                                                                                             |
| **DevTools → Network** (background the tab)                            | Confirm which polls keep firing when the tab is hidden (PERF-004/006).                                                                                       |
| **Bundle analysis** — `source-map-explorer` or `@next/bundle-analyzer` | Route/chunk size, heavy deps.                                                                                                                                |
| **`madge`** (`npx madge --circular`)                                   | Import cycles and dependency graph.                                                                                                                          |
| **`eslint-plugin-boundaries`** (already configured)                    | Layer-rule violations — run the lint config to confirm boundaries still hold.                                                                                |
| **`cloc` / `wc -l`**                                                   | Objective file-size/god-component metrics.                                                                                                                   |
| **`npm audit` / lockfile review**                                      | Dependency risk (security-lite track).                                                                                                                       |
| **`git log`/`blame`**                                                  | Whether a flagged file is churning; whether recorded remediations regressed.                                                                                 |

## 3. Verifying a re-render finding (standard recipe)

1. Run `npm run dev`, log in, open React DevTools → **Profiler**, enable "Record why each component rendered."
2. Trigger the relevant state change (e.g. start a broadcast for PERF-001; switch display currency for PERF-002; wait a 60s tick for PERF-003).
3. Record and read the **commit count** and the consumer list. Confirm the _expected_ components re-render and note the _unexpected_ ones.
4. Capture the number (e.g. "11 consumers, 1 commit/sec while live") in the finding's **Evidence** section; set Confidence = **Confirmed**.
5. After a fix, repeat and record the delta.

Each finding file carries its own tailored repro under **Evidence / Repro**.

## 4. Rating rubric

- **Severity** by _impact × reach_: hot path or every-screen → High; bounded/intermittent → Medium; local → Low. Fund-loss/crash → Critical.
- **Confidence**: Confirmed (measured) / Likely (strong static evidence) / Speculative (hypothesis).
- **Effort**: S (<½d) / M (½–2d) / L (>2d), for triage.

## 5. Keeping the audit living

Findings are pinned to a commit. When re-run against a newer commit, note line-number drift and any status change in the finding's **Notes**. The master register's **Status** column is the single source of truth for remediation progress; fixing commits/PRs are recorded per finding.
