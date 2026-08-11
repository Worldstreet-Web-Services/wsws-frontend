#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "refactor(earn): move the bounty board into features/earn

24 components, 8 hooks and 18 lib files — the first slice that moves whole.
The consumer sweep found exactly one shared file, use-image-upload, which was
an earn component's own hook parked in the flat hooks folder.

Ten route pages under app/earn now import from the index rather than reaching
for section files directly. Earn stayed this clean because it talks to its own
gateway service and shares no money rails with the rest of the app."

git push
