"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Pop-out Last Man Standing timer. The round's clock resets on every wager by
// anyone, so a player who tabs away loses the one thing the game is about:
// knowing whether they are still last. This keeps the clock (and the pot, and
// the play button where possible) floating above other tabs and apps.
//
// Two tiers, best available wins:
//   1. Document picture-in-picture (Chromium): a real always-on-top window
//      with live HTML — the countdown, the pot, and a working play button, so
//      a wager can be placed without returning to the tab.
//   2. Video picture-in-picture (Safari, Firefox, Android Chrome): the clock
//      and pot drawn to a canvas and streamed into a floating video. Not
//      clickable — clicking it focuses the tab to play — but the countdown
//      stays visible, and on Android it keeps floating over the home screen
//      after leaving the browser.
// Browsers with neither get no button at all: there is no floating surface to
// offer, and pretending otherwise is worse than absence.
//
// Timekeeping is deadline-based, not tick-based. A minimised or backgrounded
// tab has its timers throttled (down to once a minute), so a clock that
// decrements per tick freezes exactly when the pop-out matters most. Instead
// the latest server-reported seconds are turned into an absolute deadline, and
// every repaint derives the remaining time from the wall clock — a late tick
// still shows the right number. The document tier goes further and runs its
// ticker on the pop-out window itself, which is visible and never throttled.

interface DocumentPictureInPictureApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

type PipTier = "document" | "video";

function detectTier(): PipTier | null {
  if (typeof window === "undefined") return null;
  if ("documentPictureInPicture" in window) return "document";
  if (
    typeof document !== "undefined" &&
    document.pictureInPictureEnabled &&
    "captureStream" in HTMLCanvasElement.prototype
  ) {
    return "video";
  }
  return null;
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// The pop-out document starts empty; cloning the page's stylesheets makes the
// app's classes work inside it. Cross-origin sheets can't be read, so those
// are re-linked instead of inlined.
function copyStylesInto(target: Window): void {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      const style = target.document.createElement("style");
      style.textContent = rules;
      target.document.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = target.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        target.document.head.appendChild(link);
      }
    }
  }
}

export interface MiniTimerProps {
  // The latest server-reported seconds remaining. Turned into a deadline
  // here; never ticked down by the caller.
  serverSeconds: number;
  active: boolean;
  // What the clock shows between rounds (the full round duration).
  idleSeconds: number;
  statusLiveLabel: string;
  statusEndingLabel: string;
  // Status line when no round is live (ended / idle), composed by the caller.
  statusIdleLabel: string;
  potLabel: string;
  pot: string;
  balanceLabel: string;
  // The player's spendable balance, already formatted and privacy-masked.
  balance: string;
  stakeLabel: string;
  canStake: boolean;
  staking: boolean;
  onStake: () => void;
  openLabel: string;
  closeLabel: string;
}

const URGENT_SECONDS = 10;
const noSubscription = () => () => {};

export function MiniTimerLauncher(props: MiniTimerProps) {
  // Browser capability, read once per render on the client and null on the
  // server — hydration-safe without an effect, since the capability never
  // changes within a session.
  const tier = useSyncExternalStore(noSubscription, detectTier, () => null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [videoPipActive, setVideoPipActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const open = pipWindow !== null || videoPipActive;

  // The pop-out's own clock while a round is live. Each server reading
  // becomes an absolute deadline inside the effect, and the interval derives
  // the remaining seconds from the wall clock — so a tick that lands late
  // still shows the right number. On the document tier the interval belongs
  // to the pop-out window: it stays visible when the tab is minimised, so
  // the browser never throttles it. The video tier has only the page's
  // window, but an active picture-in-picture video keeps the page exempt
  // from intensive throttling, and the deadline math absorbs whatever delay
  // remains.
  const [ticked, setTicked] = useState(props.serverSeconds);
  useEffect(() => {
    if (!open || !props.active) return;
    const deadline = Date.now() + props.serverSeconds * 1000;
    const host = pipWindow ?? window;
    const id = host.setInterval(
      () => setTicked(Math.max(0, Math.round((deadline - Date.now()) / 1000))),
      500
    );
    return () => host.clearInterval(id);
  }, [open, props.active, props.serverSeconds, pipWindow]);

  // Between interval ticks the freshest server reading wins; once ticking
  // starts, the smaller of the two is always the truth (time only runs down
  // between server updates).
  const remaining = props.active ? Math.min(ticked, props.serverSeconds) : props.idleSeconds;
  const urgent = props.active && remaining > 0 && remaining <= URGENT_SECONDS;
  const clock = formatCountdown(remaining);
  const statusLabel = props.active
    ? urgent
      ? props.statusEndingLabel
      : props.statusLiveLabel
    : props.statusIdleLabel;

  const closeDocumentPip = useCallback(() => {
    pipWindow?.close();
    setPipWindow(null);
  }, [pipWindow]);

  const openDocumentPip = useCallback(async () => {
    const api = (window as Window & { documentPictureInPicture?: DocumentPictureInPictureApi })
      .documentPictureInPicture;
    if (!api) return;
    const win = await api.requestWindow({ width: 300, height: 240 });
    copyStylesInto(win);
    win.document.body.style.background = "#101013";
    win.document.body.style.margin = "0";
    // The browser fires pagehide when the user closes the floating window.
    win.addEventListener("pagehide", () => setPipWindow(null), { once: true });
    setPipWindow(win);
  }, []);

  const closeVideoPip = useCallback(() => {
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    setVideoPipActive(false);
  }, []);

  const openVideoPip = useCallback(async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (!video.srcObject) video.srcObject = canvas.captureStream();
    await video.play();
    await video.requestPictureInPicture();
    video.addEventListener("leavepictureinpicture", () => setVideoPipActive(false), {
      once: true,
    });
    setVideoPipActive(true);
  }, []);

  const toggle = useCallback(() => {
    if (tier === "document") {
      if (pipWindow) closeDocumentPip();
      else void openDocumentPip().catch(() => setPipWindow(null));
    } else if (tier === "video") {
      if (videoPipActive) closeVideoPip();
      else void openVideoPip().catch(() => setVideoPipActive(false));
    }
  }, [
    tier,
    pipWindow,
    videoPipActive,
    closeDocumentPip,
    openDocumentPip,
    closeVideoPip,
    openVideoPip,
  ]);

  // Leaving the arena closes the floating window: its play button and clock
  // belong to a page that no longer exists.
  useEffect(() => {
    return () => {
      pipWindow?.close();
      if (document.pictureInPictureElement) void document.exitPictureInPicture();
    };
  }, [pipWindow]);

  // The canvas frame for the video tier, repainted by the ticker above (and
  // whenever the pot or labels change).
  useEffect(() => {
    if (tier !== "video" || !videoPipActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#101013";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 13px sans-serif";
    ctx.fillText(`${props.potLabel}  ${props.pot}`, canvas.width / 2, 34);
    ctx.fillStyle = urgent ? "#F6A5A5" : "#ffffff";
    ctx.font = "700 64px ui-monospace, monospace";
    ctx.fillText(clock, canvas.width / 2, 108);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "500 12px sans-serif";
    ctx.fillText(statusLabel, canvas.width / 2, 140);
  });

  if (tier === null) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={open}
        className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-[11.5px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6h-2V5H5v14h6v2H5a2 2 0 0 1-2-2V5Zm10 8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6Z" />
        </svg>
        {open ? props.closeLabel : props.openLabel}
      </button>

      {tier === "video" ? (
        // Offscreen surfaces feeding the floating video. Kept mounted so the
        // stream survives re-renders; invisible in the page itself.
        <div aria-hidden className="pointer-events-none fixed h-0 w-0 overflow-hidden">
          <canvas ref={canvasRef} width={320} height={180} />
          <video ref={videoRef} muted playsInline />
        </div>
      ) : null}

      {pipWindow
        ? createPortal(
            <div className="flex h-[100vh] flex-col items-center justify-center gap-1.5 p-4 text-center font-sans">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
                {props.potLabel}
              </div>
              <div className="text-[19px] font-semibold text-white">{props.pot}</div>
              <div
                className={`tnum text-[52px] leading-none font-bold ${
                  urgent ? "animate-pulse text-[#F6A5A5]" : "text-white"
                }`}
              >
                {clock}
              </div>
              <div className="text-[12px] text-white/45">{statusLabel}</div>
              <button
                type="button"
                onClick={props.onStake}
                disabled={!props.canStake || props.staking}
                className="text-ink mt-2 w-full cursor-pointer rounded-xl bg-white p-2.5 text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {props.stakeLabel}
              </button>
              <div className="text-[11px] text-white/40">
                {props.balanceLabel} {props.balance}
              </div>
            </div>,
            pipWindow.document.body
          )
        : null}
    </>
  );
}
