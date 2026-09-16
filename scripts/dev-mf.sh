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

group_running() {
    kill -0 -- "-$1" 2>/dev/null
}

# SIGTERM first, so next dev and the proxy shut down cleanly. A command still
# running after the grace period is killed: the script must not return while
# either still holds its port.
stop_all() {
    # Ctrl-C under pnpm delivers several signals (the terminal's SIGINT,
    # pnpm's own SIGINT and SIGTERM, SIGHUP when the terminal goes). Once
    # stopping has begun, those are ignored so none can end the script halfway.
    trap '' INT TERM HUP
    trap - EXIT

    local group
    for group in "$next_group" "$proxy_group"; do
        if group_running "$group"; then
            kill -TERM -- "-$group"
        fi
    done

    local tries=0
    while (group_running "$next_group" || group_running "$proxy_group") && [ "$tries" -lt 50 ]; do
        sleep 0.1
        tries=$((tries + 1))
    done

    for group in "$next_group" "$proxy_group"; do
        if group_running "$group"; then
            echo "dev:mf: process group $group did not stop within 5s; killing it" >&2
            kill -KILL -- "-$group"
        fi
    done

    # A SIGKILL is delivered, not completed: until the kernel tears the
    # processes down and the leaders are reaped, the groups still exist. On a
    # busy machine the script returned in that gap and a caller found the
    # proxy still alive (scripts/dev-mf.test.ts, seen under the full suite).
    # Reap the two leaders, then wait out the rest of each group, so the
    # script never returns while anything it started is still running.
    # `wait` reports each leader's own exit status (143 or 137 here), which is
    # the expected outcome of stopping them, not a failure of the script.
    wait "$next_group" "$proxy_group" 2>/dev/null || true
    tries=0
    while (group_running "$next_group" || group_running "$proxy_group") && [ "$tries" -lt 50 ]; do
        sleep 0.1
        tries=$((tries + 1))
    done
}

trap stop_all EXIT
# 128 plus the signal number, the status a shell reports for a signal.
trap 'stop_all; exit 129' HUP
trap 'stop_all; exit 130' INT
trap 'stop_all; exit 143' TERM

# The script lives as long as next dev does.
wait "$next_group"
