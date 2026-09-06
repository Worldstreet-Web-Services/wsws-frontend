# Scope

Pinned to commit `bf2770e` on `feat/uchechukwu-2.0-ux`. All findings reference `file:line` at this commit; re-verify after rebases.

## In scope (primary)

- **React re-rendering & runtime performance** — context/provider design, store fan-out, memoization, effects, polling and realtime subscriptions, derived-data stability, hidden/dead work.
- **Architecture & structure** — layer boundaries, feature-slice hygiene, state ownership and prop flow, component size/responsibility, duplication and inconsistent patterns, documentation accuracy.

## In scope (secondary, light)

- **Security checklist only** — a high-level pass (see [`checklist.md`](./checklist.md#security-lite)). Not a full penetration test. Surfaces to note but not deeply exercise this pass: Privy auth + `/api/auth/me`; the ~20 `app/api/**/[...path]` proxy routes (upstream allowlisting, auth/header forwarding, SSRF via `[network]` params); account-abstraction signing/approval sites (52 files); gas-sponsorship routes; secrets/`NEXT_PUBLIC_` exposure; CSP/security headers.

## Out of scope

- Any change to **application code** (this engagement produces findings only).
- Backend/gateway services behind the BFF proxies (frontend-repo audit only).
- Smart-contract source review (contracts are external; only client interaction patterns are in scope).
- Design/visual QA, copy, i18n completeness.
- Full security engagement (auth/proxy/SSRF/AA/money-flow deep-dive) — **recommended as a follow-up track**; the surface is enumerated above so it can be scoped later.

## Environment & assumptions

- Node/Next dev via `npm run dev`; production on Vercel.
- Auth-gated screens (`AuthGuard`) can't be driven headless without a session — perf verification uses the running dev server with a logged-in browser, React DevTools, and DevTools Network/Performance panels.
- "Done" for the audit = every checklist domain triaged, each open finding either **Confirmed** (with a repro recipe) or downgraded, and the register reflecting reality.

## Deliverables

The [`audit/`](./audit.md) workspace: master report, methodology, architecture model, checklist, and a findings register with per-finding files.
