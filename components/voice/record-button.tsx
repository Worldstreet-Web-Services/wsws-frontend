"use client";

import { usePrivy } from "@privy-io/react-auth";
import { motion, useReducedMotion } from "motion/react";
import { useVoiceCommand } from "@/hooks/use-voice-command";
import { VoiceAvatar } from "@/components/voice/avatar";
import { VoiceGlow } from "@/components/voice/voice-glow";
import { VoiceOrb } from "@/components/voice/voice-orb";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const ANCHOR = "fixed right-5 bottom-14 z-[200]";
// Both states are circles in the same spot but are different elements, so they
// share a layoutId and Motion moves one into the other instead of one popping
// out as the other pops in.
const LAYOUT_ID = "voice-control";
const IDLE_SIZE = 68;
const LISTENING_SIZE = 76;
const MORPH = { type: "spring", stiffness: 320, damping: 30 } as const;

// The floating voice control, mounted once globally and shown only to a
// signed-in user. Tap the avatar once, then just speak: the mic auto-stops when
// you pause and the command runs. No hold, no second tap.
//
// While it listens the avatar gives way to an orb that moves with your voice,
// with a stop button beside it, so the state lives on the control itself rather
// than in a toast next to it.
export function RecordButton() {
  const { ready, authenticated } = usePrivy();
  const reduceMotion = useReducedMotion();
  const { recording, busy, supported, level, run, cancel } = useVoiceCommand();

  // Match AuthGuard's gate: nothing renders until the session is known and
  // signed in. A browser without microphone support simply gets no button.
  if (!ready || !authenticated || !supported) return null;

  if (recording) {
    return (
      <>
        <VoiceGlow listening busy={false} />
        <div
          className={cn(ANCHOR, "flex items-center gap-3")}
          role="status"
          aria-live="polite"
          aria-label="Listening, speak your command"
        >
        {/* Stop sits to the left so the orb stays where the button was. */}
        <motion.button
          type="button"
          onClick={cancel}
          aria-label="Stop listening"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={MORPH}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-black/60 text-white/80 backdrop-blur transition-colors hover:border-white/50 hover:text-white"
        >
          <CloseIcon size={13} />
        </motion.button>

          <motion.div layoutId={LAYOUT_ID} transition={MORPH}>
            <VoiceOrb level={level} size={LISTENING_SIZE} reduceMotion={!!reduceMotion} />
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <VoiceGlow listening={false} busy={busy} />
      <motion.button
        layoutId={LAYOUT_ID}
      type="button"
      aria-label={busy ? "Working" : "Tap to speak"}
      aria-busy={busy}
      onClick={() => void run()}
      disabled={busy}
      transition={MORPH}
      style={{ width: IDLE_SIZE, height: IDLE_SIZE }}
      className={cn(
        ANCHOR,
        // A circle, so width and height match: the avatar inside is taller than
        // it is wide, and sizing the button to it would make an oval.
        "grid place-items-center rounded-full border-2 shadow-2xl",
        "bg-gradient-to-b from-[#8B5CF6] to-[#5320A8] select-none",
        "transition-colors disabled:opacity-70",
        // A persistent purple halo so the control stands out against the page.
        "border-white/40 shadow-[0_0_22px_4px_rgba(139,92,246,0.45)] hover:border-white/60",
        // A slow breathing pulse so it's noticeable rather than hidden. A CSS
        // animation rather than a Motion one, because an `animate` prop fights
        // the layoutId morph for control of the same transform. It turns itself
        // off under prefers-reduced-motion.
        "ws-voice-breathe"
      )}
    >
        {/* 36 wide renders 50 tall, which clears the circle's edge on the tight
            axis without floating in the middle of it. */}
        <VoiceAvatar size={36} />
      </motion.button>
    </>
  );
}
