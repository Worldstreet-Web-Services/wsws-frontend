"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vlog, vwarn } from "@/lib/voice/log";

// Raw PCM capture for the STREAMING voice path (feature-flagged; the batch path
// in use-voice-record.ts is unchanged). Opens the mic at 16kHz, runs the
// pcm-worklet processor (public/pcm-worklet.js), and streams 16-bit PCM (Int16LE)
// chunks continuously to `onChunk` for the whole session — NOT one clip per turn.
// The backend's realtime STT does VAD endpointing, so the frontend just keeps
// the PCM flowing; turn boundaries come back as transcript_committed frames.
//
// This is the counterpart the backend's streaming AudioServer path was built for
// ("the frontend PCM-capture rewrite is separate work; the server path is ready").

// The realtime STT wire format. The AudioContext is opened at this rate so no
// resampling is needed — the worklet emits exactly this.
const SAMPLE_RATE = 16000;

interface UsePcmCapture {
  streaming: boolean;
  supported: boolean;
  // Start streaming PCM chunks to `onChunk` until stop(). Idempotent — a second
  // start() while already running is a no-op. Resolves once the mic + worklet
  // are live.
  start: (onChunk: (pcm: ArrayBuffer) => void) => Promise<void>;
  // Stop streaming and release the mic + audio graph.
  stop: () => void;
}

export function usePcmCapture(): UsePcmCapture {
  const [streaming, setStreaming] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof AudioWorkletNode !== "undefined";

  const stop = useCallback(() => {
    nodeRef.current?.port.close();
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setStreaming(false);
  }, []);

  const start = useCallback(
    async (onChunk: (pcm: ArrayBuffer) => void): Promise<void> => {
      if (nodeRef.current) return; // already running
      if (!supported) {
        vwarn("pcm", "AudioWorklet not supported — cannot stream PCM");
        return;
      }
      vlog("pcm", "opening mic for PCM streaming");
      // Echo cancellation + noise suppression are essential for a hands-free loop
      // so Vivid's own spoken reply doesn't leak back into the mic and get
      // transcribed. Same reasoning as the batch record hook.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
        },
      });
      streamRef.current = stream;

      // Open the context AT 16kHz so the worklet's samples are already the STT
      // wire rate — no resampling. Browsers that ignore the hint and open at
      // 48kHz would need a resample step; every current engine honors it for a
      // mono capture context.
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});

      await ctx.audioWorklet.addModule("/pcm-worklet.js");
      const source = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "pcm-worklet");
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => onChunk(e.data);
      source.connect(node);
      // The worklet has no audio output; connecting to the destination keeps the
      // graph pulling in some browsers without actually playing anything (the
      // node produces no output samples).
      node.connect(ctx.destination);
      nodeRef.current = node;

      setStreaming(true);
      vlog("pcm", "PCM streaming live", { sampleRate: ctx.sampleRate });
    },
    [supported]
  );

  // Always release the mic on unmount.
  useEffect(() => stop, [stop]);

  return { streaming, supported, start, stop };
}
