"use client";

// A short move "thock", synthesised with the Web Audio API so no audio asset has
// to ship or download. Played when a move lands on the board (yours or the
// opponent's). Silent on the server and wherever Web Audio is unavailable, and
// it never throws — a missing sound must never break a move.

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  return context;
}

// `capture` gives a slightly brighter, harder knock, the way a piece being taken
// reads differently from a quiet move.
export function playMoveSound(capture = false): void {
  const ac = audioContext();
  if (!ac) return;
  // Autoplay policy suspends the context until a gesture; a move always follows
  // one, so resuming here is safe and the first sound still lands.
  if (ac.state === "suspended") void ac.resume();

  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    const start = capture ? 330 : 250;
    const end = capture ? 170 : 150;
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(capture ? 0.3 : 0.22, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  } catch {
    // Audio glitch — the move still went through, so stay silent.
  }
}
