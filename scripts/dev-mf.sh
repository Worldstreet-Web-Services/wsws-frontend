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

# The proxy command starts a second node process of its own, so stopping the
# first one would leave the proxy running. Job control gives the proxy its own
# process group, and the whole group is stopped when this script ends, however
# it ends. A background job in a script ignores Ctrl-C, so without this the
# proxy would outlive the dev server.
set -m
microfrontends proxy microfrontends.json --local-apps wsws &
proxy_group=$!

stop_proxy() {
    if kill -0 -- "-$proxy_group" 2>/dev/null; then
        kill -- "-$proxy_group"
    fi
}
trap stop_proxy EXIT

next dev --port "$(microfrontends port)"
