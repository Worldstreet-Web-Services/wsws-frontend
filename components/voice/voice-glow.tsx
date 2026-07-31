"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

// A soft light around the edge of the screen while the assistant is active.
//
// The control itself sits in one corner, which is easy to miss on a tall page
// and easy to forget once you have started talking. Lighting the whole frame
// makes "the mic is open" visible wherever the user happens to be looking.
//
// Purely decorative: the control already carries the accessible status
// (role="status", aria-live), so this is aria-hidden and never announced twice.
// It is click-through, so it cannot intercept anything underneath it.
export function VoiceGlow({ listening, busy }: { listening: boolean; busy: boolean }) {
  const active = listening || busy;

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="voice-glow"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Fades in quickly enough to feel like a response to the tap, and out
          // slowly enough not to snap off mid-thought.
          transition={{ duration: 0.28, ease: "easeOut" }}
          // Listening takes precedence: while the mic is open that is the state
          // that matters, even if a previous command is still finishing.
          className={cn("ws-voice-glow", !listening && "ws-voice-glow-busy")}
        />
      ) : null}
    </AnimatePresence>
  );
}
