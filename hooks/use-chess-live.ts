"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toChessMatch, type ChessMatchWire } from "@/lib/casino/api/chess-wire";
import type { ChessMatch } from "@/lib/casino/api/types";

// Live board updates for one match.
//
// The chess service holds no sockets of its own: it publishes frames to the
// shared WS gateway, which is the same hub the vault game subscribes to. So this
// opens one socket at the gateway root, subscribes to the match's own topic, and
// writes what arrives straight into the react-query cache the REST fetch already
// fills. Consumers read `useChessMatch` and never learn which source updated it.
//
// The gateway does not replay state on subscribe, so the REST snapshot remains
// the bootstrap and a reconnect resyncs it.

const RECONNECT_MS = 2_000;
const PING_MS = 25_000;

// Frames on chess:match:<id>. `state` is a whole match; `position` is the board
// delta after a move; `gameOver` closes the game out.
interface PositionFrame {
  fen: string;
  turn: "white" | "black";
  ply: number;
  lastMove?: { uci: string; san: string };
  clocks: { whiteMs: number; blackMs: number };
  status: string;
}

function gatewayUrl(): string | undefined {
  // One gateway serves every game. The vault shipped first and named the
  // variable after itself, so it stands in until deployments carry the shared
  // name.
  return process.env.NEXT_PUBLIC_WS_GATEWAY_URL ?? process.env.NEXT_PUBLIC_VAULT_WS_URL;
}

export function useChessLive(
  matchId: string | null,
  topic: string | null,
  matchKey: readonly unknown[]
) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = gatewayUrl();
    if (!url || !matchId || !topic) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let closedByUs = false;
    let everConnected = false;

    const connect = () => {
      socket = new WebSocket(url);

      socket.onopen = () => {
        setConnected(true);
        socket?.send(JSON.stringify({ type: "subscribe", topics: [topic] }));
        // Nothing is replayed on subscribe, so anything that happened while the
        // socket was down is only recovered by refetching.
        if (everConnected) void queryClient.invalidateQueries({ queryKey: matchKey });
        everConnected = true;
        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_MS);
      };

      socket.onmessage = (event) => {
        let frame: { type: string; data: unknown };
        try {
          frame = JSON.parse(event.data);
        } catch {
          return;
        }

        // Control acks (welcome/subscribed/unsubscribed/pong/error) carry no
        // game data.
        if (frame.type === "state") {
          const wire = frame.data as ChessMatchWire;
          if (wire?.id !== matchId) return;
          // A state frame is a whole match, but it carries no move list, so the
          // history already in the cache is kept.
          queryClient.setQueryData<ChessMatch>(matchKey, (prev) => ({
            ...toChessMatch(wire),
            moves: prev?.moves ?? [],
            lastMoveUci: prev?.lastMoveUci ?? null,
          }));
          return;
        }

        if (frame.type === "position") {
          const data = frame.data as PositionFrame;
          queryClient.setQueryData<ChessMatch>(matchKey, (prev) => {
            if (!prev) return prev;
            const san = data.lastMove?.san;
            return {
              ...prev,
              fen: data.fen,
              turn: data.turn === "white" ? "w" : "b",
              ply: data.ply,
              clocks: { w: data.clocks.whiteMs / 1000, b: data.clocks.blackMs / 1000 },
              // The frame is the moment the clocks were true, so the local
              // countdown restarts from here.
              clockUpdatedAt: new Date().toISOString(),
              // Frames can repeat, so a move is only appended when it actually
              // advances the game.
              moves:
                san && data.ply > prev.ply
                  ? [...prev.moves.slice(0, data.ply - 1), san]
                  : prev.moves,
              lastMoveUci: data.ply > prev.ply ? (data.lastMove?.uci ?? null) : prev.lastMoveUci,
            };
          });
          return;
        }

        if (frame.type === "gameOver") {
          // The frame says only how it ended; refetching gets the settled match
          // in the shape every screen already reads.
          void queryClient.invalidateQueries({ queryKey: matchKey });
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = null;
        socket = null;
        if (!closedByUs) reconnectTimer = setTimeout(connect, RECONNECT_MS);
      };

      socket.onerror = () => socket?.close();
    };

    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "unsubscribe", topics: [topic] }));
      }
      socket?.close();
    };
    // matchKey is rebuilt each render; matchId identifies it just as well.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, topic, queryClient]);

  return connected;
}
