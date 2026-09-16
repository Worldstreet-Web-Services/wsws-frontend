#!/usr/bin/env bash
# Runs this app behind the Vercel microfrontends local proxy, so one address
# serves the whole www.tsionark.com group: this app from the local dev server,
# /square from wherever microfrontends.json points the Square. With only this
# app local, that is the development fallback, https://www.tsionark.com.
#
#   pnpm dev:mf    then open http://localhost:3024
#
# The proxy port (3024) is the package default. The dev server port is derived
# from the application name by `microfrontends port`, so the proxy knows where
# to find it without configuration.
set -euo pipefail

port="$(microfrontends port)"

# Both commands start child processes of their own (the proxy a second node
# process, next dev its next-server), so stopping the direct child is not
# enough. Job control puts each command and its children in a process group
# of its own, and both whole groups are stopped when this script ends.
#
# Neither runs in the foreground. Bash defers a trap until the foreground
# command returns, so with next dev in the foreground a SIGTERM (an IDE task
# runner, `kill`) or a SIGHUP (a closed terminal) stopped the script and the
# proxy but never reached next dev, which kept port 7448. `wait` returns as
# soon as a trapped signal arrives. scripts/dev-mf.test.ts covers each signal.
set -m
microfrontends proxy microfrontends.json --local-apps wsws &
proxy_group=$!
next dev --port "$port" &
next_group=$!

stop_group() {
    if kill -0 -- "-$1" 2>/dev/null; then
        kill -TERM -- "-$1"
    fi
}

stop_all() {
    trap - EXIT INT TERM HUP
    stop_group "$next_group"
    stop_group "$proxy_group"
}

trap stop_all EXIT
# 128 plus the signal number, the status a shell reports for a signal.
trap 'stop_all; exit 129' HUP
trap 'stop_all; exit 130' INT
trap 'stop_all; exit 143' TERM

# The script lives as long as next dev does.
wait "$next_group"
