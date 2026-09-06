# Findings register

Authoritative list. Open a new finding by copying [`TEMPLATE.md`](./TEMPLATE.md) to `<ID>.md`, then add a row here and to the summary in [`../audit.md`](../audit.md#4-findings-register-summary).

Status: 🔴 Open · 🟡 In progress · 🟢 Fixed · ⚪ Accepted / won't fix.

## Performance

| ID                        | Title                                                          | Sev         | Conf      | Effort | Status    |
| ------------------------- | -------------------------------------------------------------- | ----------- | --------- | ------ | --------- |
| [PERF-001](./PERF-001.md) | 1s clock in broadcast context re-renders 11 consumers/sec      | High        | Confirmed | M      | 🔴 Open   |
| [PERF-002](./PERF-002.md) | `useMoney` unmemoized formatters defeat `React.memo` (~23)     | High        | Confirmed | S      | 🟢 Fixed  |
| [PERF-003](./PERF-003.md) | `use-portfolio` unstable `tokens` invalidates 35 consumers/60s | High        | Confirmed | M      | 🟢 Fixed  |
| [PERF-004](./PERF-004.md) | Feature marquee polls run on every screen + in background tabs | Medium      | Confirmed | S      | 🟢 Fixed  |
| [PERF-005](./PERF-005.md) | `portfolio-view` runs full table engine for hidden UI          | Medium      | Confirmed | S      | 🔴 Open   |
| [PERF-006](./PERF-006.md) | Prediction hooks polls — mitigated by `subscribed: active`     | ~~Med~~ Low | Confirmed | S      | 🟡 Mitig. |
| PERF-007                  | `use-fx` 10-min refetch cascades to all money consumers        | Low         | Likely    | S      | 🔴        |
| PERF-008                  | Perp/prediction 1s `Map` swap re-renders whole table           | Low         | Likely    | M      | 🔴        |

## Architecture

| ID                        | Title                                                  | Sev    | Conf        | Effort | Status |
| ------------------------- | ------------------------------------------------------ | ------ | ----------- | ------ | ------ |
| [ARCH-001](./ARCH-001.md) | Casino mega-components; docs-flagged files grew        | High   | Confirmed   | L      | 🔴     |
| [ARCH-002](./ARCH-002.md) | `mini-timer.tsx` (678L) mixes state/derivation/layout  | Medium | Likely      | M      | 🔴     |
| [ARCH-003](./ARCH-003.md) | Inconsistent split: `kash-card` vs `balance-card`      | Medium | Confirmed   | M      | 🔴     |
| [ARCH-004](./ARCH-004.md) | Trade surface proliferation; order logic likely copied | Medium | Speculative | M      | 🔴     |
| [ARCH-005](./ARCH-005.md) | Architecture docs drifted (9→12 slices)                | Medium | Confirmed   | S      | 🔴     |
| [ARCH-006](./ARCH-006.md) | No E2E coverage on money paths                         | Medium | Confirmed   | L      | 🔴     |
| ARCH-007                  | `dashboard/page.tsx` coupling hub (deliberate)         | Low    | Confirmed   | —      | ⚪     |

## Security (light track — surface only, not yet exercised)

| ID  | Title                                                                                                                      | Sev | Conf | Effort | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --- | ---- | ------ | ----------- |
| —   | See [`../checklist.md`](../checklist.md#security-lite) — proxy allowlisting/SSRF, `NEXT_PUBLIC_*` audit, AA approvals, CSP | —   | —    | —      | ⚪ deferred |

## Low-severity notes (register rows, no dedicated file yet)

- **PERF-007** — `hooks/use-fx.ts` polls FX every 10 min; each refetch gives `rates` a new identity and re-renders all ~23 `useMoney` consumers. Bounded; compounds [PERF-002](./PERF-002.md). Expand to a file if PERF-002 doesn't subsume it.
- **PERF-008** — `features/trade/hooks/use-perp-price-stream.ts` flushes a **new** `Map` once/sec; `perps-view.tsx` and its price children re-render every second while streaming. Streams are otherwise optimal (buffered, single socket, background-paused). Only worth acting on if the pair table is long → memoize rows.
- **ARCH-007** — `app/dashboard/page.tsx` (422L) is the coupling hub (modal state machine + deep-linking + 9 props to `PortfolioView`). Deliberate per `docs/ARCHITECTURE.md` (callback-to-route pattern) and its sections are memoized, so accepted — revisit only if it grows.
