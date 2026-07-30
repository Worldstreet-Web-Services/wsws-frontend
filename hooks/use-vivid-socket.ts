"use client";

import { useCallback } from "react";
import { getAccessToken } from "@privy-io/react-auth";
import { isTerminalFrame, type TerminalFrame, type VividFrame } from "@/lib/voice/vivid-intent";

// The Vivid voice backend's /audio socket base, e.g. wss://ai.worldstreet…
// (dev: ws://localhost:8090). The path (/audio) and the Privy token are added
// here so callers only configure the host.
const AI_WS_BASE = process.env.NEXT_PUBLIC_AI_WS_URL ?? "";

export interface VividTurn {
  // The terminal frame that ended the turn (navigate/confirm/result/…).
  frame: TerminalFrame;
  // The final transcript, when the backend sent one — for logging/UX.
  transcript: string | null;
}

interface UseVividSocket {
  configured: boolean;
  // Streams one recorded utterance to Vivid and resolves with the terminal
  // frame for that turn. Opens a fresh socket per turn (one utterance, one
  // result) and always closes it — matching the tap-to-talk UX.
  send: (audio: Blob) => Promise<VividTurn>;
}

// Owns one turn's WebSocket round-trip to the Vivid backend: authenticate with
// the Privy access token (so the backend binds the wallet and authorizes
// commands — §13.3), push the audio clip followed by an `endpoint` frame, and
// resolve on the first terminal frame. Kept separate from the command flow so
// the transport stays testable and the socket is always released.
export function useVividSocket(): UseVividSocket {
  const send = useCallback((audio: Blob): Promise<VividTurn> => {
    return new Promise<VividTurn>((resolve, reject) => {
      void (async () => {
        if (!AI_WS_BASE) {
          reject(new Error("Voice backend is not configured"));
          return;
        }
        // WebSockets can't send an Authorization header, so the Privy access
        // token rides on the URL; the backend verifies it against Privy's JWKS.
        const token = await getAccessToken();
        if (!token) {
          reject(new Error("Not signed in"));
          return;
        }

        const url = `${AI_WS_BASE.replace(/\/$/, "")}/audio?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";

        let transcript: string | null = null;
        let settled = false;

        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          try {
            ws.close();
          } catch {
            // already closing
          }
          fn();
        };

        ws.onopen = () => {
          void audio.arrayBuffer().then((buf) => {
            if (settled) return;
            ws.send(buf);
            ws.send(JSON.stringify({ type: "endpoint" }));
          });
        };

        ws.onmessage = (ev) => {
          let frame: VividFrame;
          try {
            frame = JSON.parse(String(ev.data)) as VividFrame;
          } catch {
            return;
          }
          if (frame.type === "transcript") {
            if (frame.isFinal) transcript = frame.text;
            return;
          }
          if (frame.type === "session") return;
          if (isTerminalFrame(frame)) {
            finish(() => resolve({ frame, transcript }));
          }
        };

        ws.onerror = () => finish(() => reject(new Error("Voice connection failed")));
        ws.onclose = () => finish(() => reject(new Error("Voice connection closed")));
      })();
    });
  }, []);

  return { configured: Boolean(AI_WS_BASE), send };
}
