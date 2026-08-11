#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "refactor(layout): dissolve components/dashboard, tighten the lint map

The folder that held 73 percent of all components is gone. Twelve files were
the shell and moved to components/layout/. The other thirteen were not:

- async-state and avatar were design-system primitives -> components/ui/
- modal-types was a pure type contract read by six features -> lib/
- the kash cards belonged to portfolio
- the spot, perps, meme and markets views belonged to trade
- the activity feed was a ninth slice, split across two folders

The lint element map loses its legacy escape hatch in the same commit.
components/layout/ is now its own type and may compose features; everything
else under components/ is shared-ui and may not import upward. Verified by
planting a features import in components/auth and watching it fail."

git push
