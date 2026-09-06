# WSWS Frontend — Engineering Audit

> Master report and entry point. Individual findings live in [`findings/`](./findings/README.md).

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| **Auditor**          | _(assigned auditor — fill in)_                              |
| **Engagement start** | 2026-09-06                                                  |
| **Repository**       | `wsws-frontend` (Ark superapp)                              |
| **Commit pinned**    | `bf2770e5d2b210486fb72e3cbf2fd9b36b1d89de`                  |
| **Branch**           | `feat/uchechukwu-2.0-ux`                                    |
| **Primary focus**    | Performance (React re-rendering) · Architecture / structure |
| **Secondary**        | Security (light checklist only — see [scope](./scope.md))   |
| **Status**           | 🟡 In progress — first reconnaissance pass complete         |

---

## 1. Executive summary

This is a Next.js 16 / React 19 web3 "superapp" (~600 files across 12 feature slices) handling real funds: trading (spot/perp/meme), on/off-ramp, a Kash token, prediction markets, and casino betting.

**The structure is healthier than reported.** The stated pain was "bad structure," but the layering is genuinely strong: `eslint-plugin-boundaries` is enforced and there are **zero cross-feature imports** across all feature files. The data-flow contract (`component → hook → lib client → app/api proxy → gateway`) holds, and secrets stay server-side.

**The real problems are two, and they are fixable:**

1. **Render architecture** — a handful of shared providers/stores fan a single change out to many consumers. The worst is a **1-second clock bundled into a broadcast context** that re-renders 11 consumers every second while live (PERF-001), and a **money hook returning fresh formatter closures every render** that defeats `React.memo` across ~23 consumers (PERF-002). These are the likely source of the "re-rendering all over the app" feeling.
2. **Mega-components + dead work** — the `casino` slice holds 8 of the 12 largest files, and the two files the docs _promised to split have grown_ (`play-section.tsx`: 1,530 → **2,604** lines, ARCH-001). Separately, `portfolio-view.tsx` runs a full table engine every render to feed UI that is `hidden` (PERF-005).

**Remaining open priorities:** PERF-001 (M — split the 1s clock out of the broadcast context) and PERF-005 (S — gate the hidden table engine), plus the architecture track (ARCH-001 casino mega-components, ARCH-003 kash-card split).

The codebase already contains the _right_ patterns to copy — `hooks/use-prices.ts` (ref-equality guard + request batching), `lib/api/circuit-store.ts` (no-op publish), and the `balance-card.tsx` dispatcher. Remediation is largely "make the outliers match the good patterns," not a rewrite.

> **Verification log (2026-09-06).** Remediation is running concurrently (parallel fixer agents). On re-check against the working tree: **PERF-002, PERF-003, PERF-004 are already resolved** (formatters memoized; `tokens` ref-guarded; marquee polls background-paused), **PERF-006 is largely mitigated** by `subscribed: active` gating (downgraded Med→Low), and **PERF-001 / PERF-005 remain open**. Each finding file carries the file:line evidence. Auditors should re-check a finding's current state before starting work to avoid colliding with an in-flight fix.

---

## 2. How to use this workspace

| File                                               | Purpose                                                    |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [`scope.md`](./scope.md)                           | What's in / out of scope, environment, assumptions         |
| [`methodology.md`](./methodology.md)               | How findings are produced and **verified** (tools + steps) |
| [`architecture-model.md`](./architecture-model.md) | Intended vs actual architecture; the render/data model     |
| [`checklist.md`](./checklist.md)                   | Per-domain review checklist (working document)             |
| [`findings/README.md`](./findings/README.md)       | The findings register (authoritative list)                 |
| [`findings/TEMPLATE.md`](./findings/TEMPLATE.md)   | Copy this to open a new finding                            |

Workflow: pick a checklist item → investigate → open a finding from the template → add a row to the register → verify per `methodology.md` → update **Status** here.

---

## 3. Severity / Confidence / Effort

This is a performance + architecture audit, so findings are rated on impact and maintainability rather than CVSS. (Security-track findings, if any, use the fund-loss lens — see `scope.md`.)

**Severity**

- **Critical** — fund loss, data loss, or a crash on a core money path.
- **High** — wasted work on a hot path or on _every screen_; or a structural issue that actively blocks safe change.
- **Medium** — bounded/intermittent cost, or a maintainability drag that slows the team.
- **Low** — minor, localized.
- **Info** — observation / note, no action required.

**Confidence** — `Confirmed` (observed via Profiler/repro) · `Likely` (strong static evidence) · `Speculative` (needs investigation). Recon findings begin **Likely**.

**Effort** — `S` (<½ day) · `M` (½–2 days) · `L` (>2 days).

---

## 4. Findings register (summary)

Full detail in [`findings/`](./findings/README.md). Status: 🔴 Open · 🟡 In progress · 🟢 Fixed · ⚪ Won't fix / accepted.

| ID                                 | Title                                                             | Sev         | Conf        | Effort | Status    |
| ---------------------------------- | ----------------------------------------------------------------- | ----------- | ----------- | ------ | --------- |
| [PERF-001](./findings/PERF-001.md) | 1s clock bundled in broadcast context re-renders 11 consumers/sec | High        | Confirmed   | M      | 🔴 Open   |
| [PERF-002](./findings/PERF-002.md) | `useMoney` formatters — now memoized                              | High        | Confirmed   | S      | 🟢 Fixed  |
| [PERF-003](./findings/PERF-003.md) | `use-portfolio` `tokens` — now ref-guarded                        | High        | Confirmed   | M      | 🟢 Fixed  |
| [PERF-004](./findings/PERF-004.md) | Feature marquee polls — now background-paused                     | Medium      | Confirmed   | S      | 🟢 Fixed  |
| [PERF-005](./findings/PERF-005.md) | `portfolio-view` runs full table engine for hidden UI             | Medium      | Confirmed   | S      | 🔴 Open   |
| [PERF-006](./findings/PERF-006.md) | Prediction polls — mitigated by `subscribed: active`              | ~~Med~~ Low | Confirmed   | S      | 🟡 Mitig. |
| PERF-007                           | `use-fx` 10-min refetch cascades to all money consumers           | Low         | Likely      | S      | 🔴        |
| PERF-008                           | Perp/prediction 1s `Map` swap re-renders whole table              | Low         | Likely      | M      | 🔴        |
| [ARCH-001](./findings/ARCH-001.md) | Casino mega-components; docs-flagged files grew, not shrank       | High        | Confirmed   | L      | 🔴        |
| [ARCH-002](./findings/ARCH-002.md) | `mini-timer.tsx` (678L) mixes state/derivation/layout             | Medium      | Likely      | M      | 🔴        |
| [ARCH-003](./findings/ARCH-003.md) | Inconsistent mobile/desktop split: `kash-card` vs `balance-card`  | Medium      | Confirmed   | M      | 🔴        |
| [ARCH-004](./findings/ARCH-004.md) | Trade surface proliferation; order logic likely copied            | Medium      | Speculative | M      | 🔴        |
| [ARCH-005](./findings/ARCH-005.md) | Architecture docs drifted (9→12 slices, 329→~600 files)           | Medium      | Confirmed   | S      | 🔴        |
| [ARCH-006](./findings/ARCH-006.md) | No E2E coverage on money paths                                    | Medium      | Confirmed   | L      | 🔴        |
| ARCH-007                           | `app/dashboard/page.tsx` coupling hub (deliberate)                | Low         | Confirmed   | —      | ⚪        |

**Strengths recorded** (preserve these): enforced layer boundaries · `use-prices.ts` ref-guard + batching · `circuit-store` no-op publish · `casino-nav-guard` ref-based context · `balance-card` dispatcher · memoized scroll-spy sections in `dashboard/page.tsx`. See [`architecture-model.md`](./architecture-model.md#reference-patterns).

---

## 5. Remediation tracking

Fixes are made in application code under the user's direction — **not** in this task. As each finding is remediated, update its **Status** above and in its finding file, and record the fixing commit/PR in the finding's Notes. Re-verify against a fresh commit and note the delta.

---

## 6. Sign-off

| Phase              | Owner       | Date       | Notes                                                  |
| ------------------ | ----------- | ---------- | ------------------------------------------------------ |
| Reconnaissance     | _(auditor)_ | 2026-09-06 | Static + subagent sweep; findings seeded at **Likely** |
| Verification pass  |             |            | Promote Likely → Confirmed via Profiler/repro          |
| Remediation review |             |            |                                                        |
| Final report       |             |            |                                                        |
