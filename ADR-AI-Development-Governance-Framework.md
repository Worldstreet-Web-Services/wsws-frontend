# ADR-2026-09-06: AI Development Control, Quality Governance, and Production Safety Framework

## Status

Accepted — 2026-09-06

## Context

Integrating AI coding agents (such as Antigravity, Claude Code, Qwen Code, Codex, or custom LLM dev harnesses) into software engineering workflows drastically increases code generation velocity. However, unconstrained AI code generation introduces severe technical and operational risks:

1. **Rule Violations & Architectural Drift**: AI agents generating code without consulting architectural standards, changing global patterns, or introducing conflicting abstractions.
2. **Substandard & Untested Code**: Shipping untested code, masking errors with silent `try/catch` wrappers, or removing failing assertions.
3. **Broken Live Environments**: Shipping breaking migrations, unverified UI contracts, missing write-path validations, or untested cross-service dependencies directly to production.
4. **Self-Approving Changes**: AI agents declaring their own architectural plans valid without human oversight.

To enable high-velocity AI-assisted development without compromising production reliability, code quality, or system security, we require an **authoritative, end-to-end AI Governance and Control Framework** that is reusable across any project or technology stack.

---

## Decision

We establish the **7-Pillar AI Development Control & Production Safety Framework**. This governance model combines automated preflight intercepts, mandatory execution lifecycles, dark feature rollouts, scenario contracts, and adversarial review gates.

![7-Pillar AI Development Control & Quality Governance Framework Architecture](ADR-AI-Development-Governance-Framework.svg)

---

## Dual ADR Structure

Pursuant to Directive 2 (Human Approval Gate), this decision is authored as TWO companion documents under `docs/adr/`:

1. **Technical ADR**: [`docs/adr/ADR-2026-09-06-AI-Development-Governance-Framework.md`](file:///Users/ettaraphael/Documents/systems/wsws-frontend/docs/adr/ADR-2026-09-06-AI-Development-Governance-Framework.md)
2. **Companion ADR for Dummies**: [`docs/adr/ADR-2026-09-06-AI-Development-Governance-Framework-for-dummies.md`](file:///Users/ettaraphael/Documents/systems/wsws-frontend/docs/adr/ADR-2026-09-06-AI-Development-Governance-Framework-for-dummies.md)

---

### Pillar 1: Canonical AI Rulebook (`AGENTS.md`)

Every repository adopting this framework MUST maintain a canonical instruction document (`AGENTS.md` in the root repository folder, symlinked or imported by vendor-specific files like `CLAUDE.md`, `GEMINI.md`, or `QWEN.md`).

#### Core Directives Enforced on AI Agents:

- **Read-Only Main Branch**: AI agents are forbidden from committing or pushing directly to `main` (or production branches). All work must occur in isolated Git worktrees (`git worktree add ...`).
- **Human Approval Gate (Phase 1 DECIDE)**: AI agents cannot proceed to implement non-trivial features or architectural shifts without authoring an Architectural Decision Record (ADR) in `docs/adr/` that requires **explicit human user approval**. An AI agent is strictly forbidden from approving its own ADR.
- **Red-Green Test-First Bug Fixing**: For any bug fix, the AI agent MUST write a failing regression test _first_, verify that it fails, and only then implement the fix.
- **No Masking or Swallow Errors**: AI agents are forbidden from fixing errors by wrapping calls in silent `try/catch`, commenting out failing tests, or returning dummy fallback data.

---

### Pillar 2: Multi-Stage Development Lifecycle (Phases 0–8)

All engineering work (whether human or AI-initiated) must follow a structured 9-step lifecycle:

```
[Phase 0: SYNC] ──► [Phase 1: DECIDE] ──► [Phase 2: PLAN]
                                                │
[Phase 5: BUILD] ◄── [Phase 4: RESERVE] ◄── [Phase 3: ISOLATE]
       │
       ▼
[Phase 6: VERIFY] ──► [Phase 7: DOCUMENT] ──► [Phase 8: DELIVER]
```

1. **0 SYNC**: Fetch `origin/main` ground truth. The local `main` branch must never be assumed current.
2. **1 DECIDE**: Author an ADR in `docs/adr/ADR-<YYYY-MM-DD>-<topic>.md` with visual diagrams and obtain **human approval**.
3. **2 PLAN**: Author an implementation plan (`docs/plans/<date>-<feature>-plan.md`) outlining scope, migrations, test strategy, and verified mockups.
4. **3 ISOLATE**: Cut a clean worktree branch off `origin/main`.
5. **4 RESERVE**: Reserve database migration timestamps using controlled generator scripts (e.g., `scripts/new-migration.sh`) to prevent version collisions across concurrent branches.
6. **5 BUILD**: Write implementation code strictly paired with unit/integration tests (TDD).
7. **6 VERIFY**: Run preflight gates and validate changes end-to-end on a local dev stack, browser, or emulator before opening a PR.
8. **7 DOCUMENT**: Create a release note (`docs/release-notes/`), work log, user guide, and scenario impact declaration.
9. **8 DELIVER**: Submit to GitHub Merge Queue after passing mandatory **Adversarial Review**.

---

### Pillar 3: Automated Local Preflight & Git Push Hooks (`preflight.sh`)

A Git pre-push hook (`.githooks/pre-push`) automatically intercepts `git push` and invokes a root preflight dispatcher script (`scripts/preflight.sh`).

#### Strict Quality Gates Enforced:

- **Zero Linter/Compiler Warnings**: Compilers and linters must run with zero-tolerance warning policies (e.g., `clippy -- -D warnings`, `unwrap/expect denied`, `eslint`, `tsc`, `ktlint`).
- **Selective Sub-Project Dispatch**: Differentially compute changed files (`git diff --name-only origin/main...HEAD`) and run preflight checks only for modified sub-projects to keep developer verification fast.
- **Cross-Path Dependency Dispatch**: Automatically trigger preflight checks for dependent sub-projects whenever central files (e.g., `.github/workflows/*`, `contracts/*`, or shared schemas) are modified outside that sub-project's directory.
- **Shell Portability**: Preflight scripts must remain compatible with native macOS shells (Bash 3.2+) to prevent developer environment crashes.

---

### Pillar 4: Feature Flag Safety & Dark Feature Gating ("Platform Labs")

To prevent unverified AI code from breaking live user experiences:

- **Dark Merges by Default**: All new product features must merge behind feature flags with `master_state = 'off'`.
- **Governance Lints**: Automated scripts (e.g., `scripts/check_platform_labs_governance.sh`) verify that database seeds, migration files, and configuration defaults leave features disabled upon deployment.
- **Backend Evaluation Point**: Feature flag checks are enforced at the backend service/DB layer. Hiding UI elements alone is not considered enforcement.
- **Instant Production Kill-Switch**: If a bug occurs post-deployment, the feature flag can be toggled off instantly in production via backend state without requiring an emergency hotfix deployment or code rollback.

---

### Pillar 5: Protected Trunk & Multi-Stage Canary Deployment

- **Protected `main` Branch**: Direct pushing to `main` is blocked by GitHub repository rulesets. Code enters `main` only via Pull Requests, required CI checks (`gate`), review approvals, and the GitHub Merge Queue.
- **Sandbox-First Auto-Deployment**: Merging to `main` automatically deploys code ONLY to an isolated **Sandbox** (non-production) environment.
- **Production Canary Deployments**: Production promotion is strictly isolated from Sandbox:
  - Requires explicit human environment approvals.
  - Deploys backend services via a **5% → 100% Canary pipeline** with automated health monitoring.
  - Automatically rolls back to the previous stable container image if error rates exceed thresholds during canary evaluation.

---

### Pillar 6: Scenario-Based End-to-End Verification & Release Gating

- **Scenario Impact Declarations**: Every governed code change must declare its impact in release note frontmatter (`scenario-impact: updated | needs_automation | none`).
- **Executable Scenario Contracts**: User-facing feature changes require executable end-to-end scenario definitions (`schema_version: 1` YAML contracts) or explicit registered gap files.
- **Release Note CI Gate**: Automated scripts (`scripts/check_release_notes.sh`) block PR merges unless structured release notes with verification proof are provided.

---

### Pillar 7: Recurring Defect Audit Checklist (Mandatory Pre-Review Self-Audit)

Before submitting any PR for review, AI agents and developers MUST self-audit code against catalogued recurring defect classes:

1. **Enforcement on Every Write Path**: Verify that business logic and validation rules are enforced at the DB/service layer across ALL write entry points (registration, API, admin, bulk import, recovery), not just on one UI form.
2. **Wiring Tests, Not Mechanism Tests**: Ensure test suites fail if route paths, dependency injections, or event handlers are misconfigured.
3. **Test-First Fixes**: Lock bug fixes with a failing test _before_ editing production code.
4. **DB Serialization for Check-Then-Act**: Prevent Time-of-Check to Time-of-Use (TOCTOU) race conditions using `FOR UPDATE` row locks, unique indexes, or atomic database transactions.
5. **Crash-Resume Multi-Step Transitions**: Ensure multi-step state transitions (e.g., billing, refunds, provisioning) are atomic or include resume handlers for intermediate states.
6. **Destructive SQL Safety**: Migration repairs and backfills must enumerate all evidence sources and use safe text comparisons in `WHERE` clauses (avoiding hard casts like `::uuid` on untrusted columns).
7. **Existing-State Migration Handling**: Ensure migrations and provisioning logic handle entities already in the OLD state, not just fresh installs.
8. **Mandatory Adversarial Code Review**: Require at least one independent adversarial review round (e.g., Codex↔Claude review loop or human review) before merging code to `main`.

---

## Adaptation Guide for Any Project or Platform

To adopt this framework in a new or existing repository:

1. **Create `AGENTS.md`**: Place the governance directives and Phase 0–8 lifecycle rules in your repository root.
2. **Setup Local Preflight Interceptor**:
   - Create `scripts/preflight.sh` to run linters, type checks, and test suites.
   - Configure `.githooks/pre-push` to invoke `scripts/preflight.sh`.
3. **Configure Protected Branch Rules**: Enable branch protection on `main` in GitHub/GitLab (require PRs, linear history, status checks, and approvals).
4. **Implement Feature Flag Layer**: Wrap new API routes and UI components in feature flag checks defaulting to `off`.
5. **Enforce Pre-Push & Release Note Gates**: Use CI scripts to check for required release notes and test evidence before allowing PR merges.

---

## Decision Diagram

![7-Pillar AI Development Control & Quality Governance Framework Architecture](ADR-AI-Development-Governance-Framework.svg)
