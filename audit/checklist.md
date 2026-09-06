# Review checklist

Working document, tailored to this repo. Tick items as covered; link the resulting finding ID. `[ ]` open · `[~]` in progress · `[x]` covered (→ ID).

## Re-rendering & React perf

- [~] Every app-wide Context `value` is memoized and **does not** mix volatile (ticking/streaming) state with stable state. → [PERF-001](./findings/PERF-001.md)
- [~] Hooks that return objects/closures memoize them so `React.memo` downstream survives. → [PERF-002](./findings/PERF-002.md)
- [~] Widely-consumed query hooks return **reference-stable** data (ref-guard or `select`). → [PERF-003](./findings/PERF-003.md)
- [ ] No `useEffect` sets state on every render / has unstable deps causing loops.
- [ ] Lists/tables of any size memoize rows; keys are stable.
- [~] Expensive derivations are `useMemo`'d (spot/perp good; portfolio layer is the gap).
- [ ] `key` changes aren't remounting expensive subtrees unnecessarily.
- [ ] Animations run off the main thread / don't setState per frame (streams already buffer — good).

## Data-fetching / polling / realtime

- [~] Polls set `refetchIntervalInBackground: false` (marquee + prediction hooks miss it). → [PERF-004](./findings/PERF-004.md), [PERF-006](./findings/PERF-006.md)
- [ ] Poll intervals match data volatility; failing endpoints back off (`pollUnlessFailing` — good pattern).
- [ ] `refetchOnWindowFocus` default (`true`) isn't causing herd revalidation on core screens.
- [ ] Realtime messages write to caches/buffers, not naive per-message `setState` (streams good; verify vault snapshot fan-out).
- [ ] WebSocket sockets are shared/ref-counted and torn down (chess/vault good — verify perp/prediction).
- [ ] Query `select` used where a consumer needs a narrow slice.

## Architecture & structure

- [x] Layer boundaries enforced; no cross-feature imports. → (strength, see architecture-model)
- [~] No god-components; files split by responsibility. → [ARCH-001](./findings/ARCH-001.md), [ARCH-002](./findings/ARCH-002.md)
- [ ] No dead-but-computed work feeding hidden UI. → [PERF-005](./findings/PERF-005.md)
- [~] Mobile/desktop splits use one dispatcher + shared view-model. → [ARCH-003](./findings/ARCH-003.md)
- [ ] Repeated product logic extracted to `lib/`, not copied across views. → [ARCH-004](./findings/ARCH-004.md)
- [~] Architecture docs match the tree. → [ARCH-005](./findings/ARCH-005.md)
- [ ] Barrels reflect the real public surface of each slice.

## Correctness & tests

- [~] Money paths (deposit/withdraw/buy/sell) have E2E coverage. → [ARCH-006](./findings/ARCH-006.md)
- [ ] Money math stays in `bigint` base units; float only at the display edge.
- [ ] Error/empty/loading states exist for every data surface.
- [ ] New top-level dirs are added to `globals.css` `@source` (silent-failure trap).

## Security-lite

- [ ] `NEXT_PUBLIC_*` contains **no secrets** (only URLs, public IDs, contract addresses).
- [ ] `app/api/**/[...path]` proxies allowlist upstreams; `[network]` params are validated (no SSRF).
- [ ] Proxies forward auth safely and don't leak user A's data to user B (IDOR).
- [ ] Gas-sponsorship routes are rate-limited / abuse-guarded.
- [ ] AA signing/approval sites avoid blind unlimited approvals; permits set deadlines.
- [ ] No `dangerouslySetInnerHTML` with untrusted input; no `eval`.
- [ ] Security headers / CSP configured (`next.config`).
- [ ] `npm audit` reviewed; no high-severity transitive CVEs unaddressed.
