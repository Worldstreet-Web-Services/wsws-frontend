# ARCH-006 — No end-to-end coverage on the money paths

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| **Category**    | Architecture / Correctness                        |
| **Severity**    | Medium                                            |
| **Confidence**  | Confirmed                                         |
| **Effort**      | L                                                 |
| **Status**      | 🔴 Open                                           |
| **Location(s)** | repo-wide (deposit / withdraw / buy / sell flows) |

## Summary

There are no end-to-end tests. `docs/ARCHITECTURE.md` lists Playwright as the top open "what's left" item, and the money paths — deposit, withdraw, buy, sell — have **zero automated coverage**. 228/263 components are client components with no server data-fetch, an acknowledged unratified default.

## Impact

The highest-risk flows (movement of real funds) can only be validated by hand, so regressions ship silently and refactors (including the ones this audit recommends) carry outsized risk. Any of the performance/structure fixes touches these surfaces; without E2E, they're hard to change with confidence.

## Evidence / Repro

- No `playwright`/`e2e` config or specs in the repo.
- `docs/ARCHITECTURE.md` "what's left" names Playwright as the top item.

## Recommendation

Stand up Playwright and cover the four money paths first (deposit, withdraw, buy, sell) against the dev server with a seeded/test account. Wire into CI as a gate on those flows. This unblocks safe remediation of the perf/structure findings and is the single biggest risk-reducer.

## References

- `docs/ARCHITECTURE.md` open-items section.
- The `verify` project skill / dev-server verification approach used elsewhere in this repo.

## Notes

Confirmed. Effort **L**, but foundational — sequence it early if the team intends to act on the structural findings.
