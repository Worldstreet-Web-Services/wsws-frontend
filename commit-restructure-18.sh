#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "test: colocate 87 tests with the code they cover

Each test moves beside its subject and takes its name, so presenter.ts is
covered by presenter.test.ts in the same folder. A slice can now be read,
moved or deleted with its tests attached.

The 11 left in __tests__/ have no single subject: route handlers, the two
live-registry probes and the smoke test. vitest needed no change — its include
glob was already repository-wide.

Colocation puts the boundary rules over the tests too, which caught a schema
test in lib/ importing formatApy from features/rwa. It was testing two layers
at once; the presenter assertions moved to the presenter's own test."

git push
