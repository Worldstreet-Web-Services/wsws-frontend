"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react";
import {
  PING_MESSAGE,
  STREAM_FRESH_MS,
  STREAM_MAX_RECONNECTS,
  STREAM_PING_MS,
  STREAM_RECONNECT_MS,
  parsePriceFrame,
  subscribeMessage,
  type StreamPrice,
} from "@/lib/perp/stream";

// One WebSocket to the ws-gateway pushing live Pyth marks for the subscribed
// pairs. This is the doc's intended live-price path (REST /prices is for the
// first paint); the hook merely overlays what the socket delivers on top of
// the REST-polled map, so when the stream is quiet — the production publisher
// is not live yet, a market is closed, the socket drops — the UI keeps
// ticking on REST and nothing downstream can tell the difference.
//
// Incoming frames are buffered and flushed on an interval instead of one
// setState per frame: at ~1 update/sec/pair across a hundred subscribed pairs
// that difference is what keeps the section from re-rendering constantly.
//
// A flush lands in a per-symbol store rather than a fresh React Map. The old
// map replaced its identity on every flush, so every price consumer re-rendered
// each second even when its own pair had not moved. The store notifies only the
// symbols whose shown price actually changed, so a price cell that subscribes
// with usePerpPrice re-renders only when its own mark ticks. A single tick still
// re-renders the section as a whole for cells that read getPrice() inline during
// render (the market lists have not adopted the per-symbol subscription yet), so
// displayed prices are unchanged either way.

// The public WebSocket host is intentionally opt-in. The old hard-coded host
// is not a deployed price gateway, so every rendered Perps view opened a
// failing socket and retried it forever. REST /api/perp/prices remains the
// production price source until a working gateway URL is configured.
const WS_URL = process.env.NEXT_PUBLIC_PERP_WS_URL?.trim();

const FLUSH_MS = 1_000;

// A small store keyed by symbol. It holds the latest streamed mark per pair and
// lets a consumer subscribe to a single symbol, so one moving pair does not wake
// the whole table. Module scope because there is one Perps view on screen; a
// remount reuses it and the next flush prunes anything no longer subscribed.
class PerpPriceStore {
  private prices = new Map<string, StreamPrice>();
  private listeners = new Map<string, Set<() => void>>();

  getPrice(symbol: string): StreamPrice | undefined {
    return this.prices.get(symbol);
  }

  subscribe(symbol: string, listener: () => void): () => void {
    let set = this.listeners.get(symbol);
    if (set == null) {
      set = new Set();
      this.listeners.set(symbol, set);
    }
    set.add(listener);
    return () => {
      const current = this.listeners.get(symbol);
      if (current == null) return;
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(symbol);
    };
  }

  private notify(symbol: string): void {
    const set = this.listeners.get(symbol);
    if (set == null) return;
    for (const listener of set) listener();
  }

  // Merge one flush. Mirrors the old map rebuild exactly: pairs no longer wanted
  // are pruned so a delisted mark cannot beat REST forever, and an out-of-order
  // frame never overwrites a newer publish. Returns how many symbols changed
  // their shown price so the caller can skip a re-render when nothing moved.
  apply(updates: ReadonlyMap<string, StreamPrice>, wanted: ReadonlySet<string>): number {
    let changed = 0;
    for (const pair of Array.from(this.prices.keys())) {
      if (!wanted.has(pair)) {
        this.prices.delete(pair);
        this.notify(pair);
        changed += 1;
      }
    }
    for (const [pair, update] of updates) {
      const current = this.prices.get(pair);
      if (current == null || update.publishTime >= current.publishTime) {
        // A newer publish that repeats the same price string is stored (so the
        // publish time stays current for ordering) but shows nothing new, so it
        // does not wake subscribers.
        const priceMoved = current == null || current.price !== update.price;
        this.prices.set(pair, update);
        if (priceMoved) {
          this.notify(pair);
          changed += 1;
        }
      }
    }
    return changed;
  }
}

const priceStore = new PerpPriceStore();

// Stable reader handed to the section: same identity across flushes, so a
// consumer's priceOf closure is not rebuilt every second.
function readPerpPrice(symbol: string): StreamPrice | undefined {
  return priceStore.getPrice(symbol);
}

// Per-row subscription. A price cell reads only its own symbol and re-renders
// only when THAT mark moves. The market lists still read getPrice() inline for
// now; adopting this in those cells (features/trade/components/simple-perps.tsx,
// pro-perps.tsx and perp-positions.tsx) is what stops the whole table
// reconciling on each flush.
export function usePerpPrice(symbol: string): StreamPrice | undefined {
  const subscribe = useCallback(
    (listener: () => void) => priceStore.subscribe(symbol, listener),
    [symbol]
  );
  const getSnapshot = useCallback(() => priceStore.getPrice(symbol), [symbol]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

export function usePerpPriceStream(symbols: readonly string[], enabled: boolean) {
  const [healthy, setHealthy] = useState(false);
  // Bumped when a flush moved at least one shown price. Consumers that read
  // getPrice() inline during render (rather than subscribing per symbol) need a
  // re-render to pick the new mark up; this is that signal, and it fires no more
  // often than the old per-flush map swap did.
  const [, tick] = useReducer((n: number) => n + 1, 0);

  // The symbols array is rebuilt every render by callers; the joined key only
  // changes when the actual set does, so the socket is not torn down on every
  // render. In practice it changes once, when the live pair list arrives.
  const symbolsKey = symbols.join(",");

  useEffect(() => {
    const streamUrl = WS_URL;
    if (!enabled || !streamUrl || symbolsKey === "") return;
    const topics = symbolsKey.split(",");
    // Pairs no longer on screen are pruned at the next flush, so a delisted
    // pair's frozen mark cannot keep beating REST forever.
    const wanted = new Set(topics);

    let ws: WebSocket | null = null;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    const buffer = new Map<string, StreamPrice>();
    let lastFrameAt = 0;
    // Exponential backoff so a downed gateway is not hammered by every open
    // tab in lockstep; a delivered frame resets it. A finite retry budget
    // leaves REST polling in charge when a configured stream is unavailable.
    let reconnectDelay = STREAM_RECONNECT_MS;
    let reconnects = 0;

    const reconnect = () => {
      if (disposed || reconnects >= STREAM_MAX_RECONNECTS || reconnectTimer != null) return;
      // Hidden or offline tabs do not need a live mark; the REST query catches
      // up when they become active again.
      if (document.visibilityState === "hidden" || !navigator.onLine) return;
      reconnects += 1;
      const jitter = Math.round(Math.random() * 250);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        open();
      }, reconnectDelay + jitter);
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
    };

    const open = () => {
      if (disposed) return;
      try {
        ws = new WebSocket(streamUrl);
      } catch {
        // A malformed URL throws synchronously; without the stream the REST
        // fallback carries prices, so fail quiet and don't retry a bad URL.
        return;
      }
      ws.onopen = () => {
        ws?.send(subscribeMessage(topics));
        pingTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(PING_MESSAGE);
        }, STREAM_PING_MS);
      };
      ws.onmessage = (event) => {
        const update = parsePriceFrame(event.data);
        if (update == null) return;
        lastFrameAt = Date.now();
        reconnectDelay = STREAM_RECONNECT_MS;
        reconnects = 0;
        // After a reconnect, frames can arrive out of order; never let an
        // older publish overwrite a newer mark.
        const held = buffer.get(update.pair);
        if (held == null || update.publishTime >= held.publishTime) {
          buffer.set(update.pair, update);
        }
      };
      ws.onclose = () => {
        if (pingTimer != null) clearInterval(pingTimer);
        pingTimer = null;
        reconnect();
      };
      // onclose fires after onerror; reconnect handling lives there alone.
      ws.onerror = () => {};
    };

    // One flusher for both the price store and the health flag. Health decays on
    // its own: when frames stop arriving the flag drops within a tick and REST
    // polling speeds back up.
    const flushTimer = setInterval(() => {
      setHealthy(Date.now() - lastFrameAt < STREAM_FRESH_MS);
      if (buffer.size === 0) return;
      const updates = new Map(buffer);
      buffer.clear();
      // The store notifies the pairs that actually moved; only re-render the
      // inline consumers when something changed.
      if (priceStore.apply(updates, wanted) > 0) tick();
    }, FLUSH_MS);

    open();

    return () => {
      disposed = true;
      clearInterval(flushTimer);
      if (pingTimer != null) clearInterval(pingTimer);
      if (reconnectTimer != null) clearTimeout(reconnectTimer);
      ws?.close();
      setHealthy(false);
    };
  }, [enabled, symbolsKey]);

  // Stable object: its identity changes only when the health flag flips, not on
  // every flush. getPrice is a module singleton, so a consumer's priceOf keeps
  // the same identity across ticks.
  return useMemo(() => ({ getPrice: readPerpPrice, healthy }), [healthy]);
}
