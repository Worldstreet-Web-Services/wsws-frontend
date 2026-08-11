#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

git add -A
git commit -m "refactor(casino): move chess, Swiss and Last Man Standing into features/casino

35 components, 10 hooks and 23 lib files — the last slice.

lib/casino/chess-identity does not join the slice. It imports @privy-io/node and
its only callers are two route handlers, one of them the perp proxy, so it was
server code filed under a client feature. It moves to lib/server/.

Last Man Standing rendered trade's SellSheet from its own state, deep inside an
1,100-line component. Rather than lift that state, the section now takes a
renderWithdrawSheet render prop and app/casino/last-standing supplies the sheet.
The dependency inverts and the JSX tree is untouched.

Fifteen casino routes plus app/providers now import through the index."

git push
