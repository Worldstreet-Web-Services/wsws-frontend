# <ID> — <Short title>

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| **Category**    | Performance / Architecture / Security             |
| **Severity**    | Critical / High / Medium / Low / Info             |
| **Confidence**  | Confirmed / Likely / Speculative                  |
| **Effort**      | S / M / L                                         |
| **Status**      | 🔴 Open / 🟡 In progress / 🟢 Fixed / ⚪ Accepted |
| **Location(s)** | `path/to/file.tsx:NN`                             |

## Summary

One or two sentences: what the issue is.

## Impact

Who/what re-renders, what work is wasted, or what breaks — and how often / how widely. Quantify where possible (e.g. "N consumers, once per second").

## Evidence / Repro

How to observe it. For perf findings, the exact Profiler/Network steps and the number measured. Include the static evidence (file:line + code shape) that raised it.

## Recommendation

The fix, ideally pointing at an existing in-repo pattern to copy. Keep it concrete.

## References

Links to related findings, the intended architecture, or external docs.

## Notes

Verification status, fixing commit/PR when remediated, line-drift on re-check.
