"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";

// App palette plus a jackpot gold.
const COLORS = ["#A78BFA", "#7CE7B0", "#F6D365", "#ffffff", "#8b6ef0"];
const BURST_MS = 4200;
const WON_AUTO_CLOSE_MS = 7000;

export type RoundPhase = "calculating" | "won" | null;

interface RoundOverlayProps {
  phase: RoundPhase;
  // Already-formatted money string (e.g. "$42.00"). No raw data is passed in.
  prizeLabel: string;
  onClose: () => void;
}

// The end-of-round moment. First a short suspense ("calculating the winner")
// that locks everyone in, then — only for the winning wallet — a big jackpot
// with confetti. Shows only the pot as money and generic copy; never an
// address, wallet, or raw game object.
export function RoundOverlay({ phase, prizeLabel, onClose }: RoundOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const reduce = useReducedMotion();

  // Jackpot confetti while the "won" card is up.
  useEffect(() => {
    if (phase !== "won" || reduce || !canvasRef.current) return;
    const fire = confetti.create(canvasRef.current, { resize: true, useWorker: false });
    const end = Date.now() + BURST_MS;
    // Everything emanates from the card's centre (it sits dead-centre of the
    // viewport) so the confetti frames the card instead of scattering off the
    // top of the screen.
    const center = { x: 0.5, y: 0.5 };

    // Opening explosion out of the card, in every direction.
    fire({
      particleCount: 220,
      spread: 360,
      startVelocity: 45,
      gravity: 0.95,
      scalar: 1.05,
      origin: center,
      colors: COLORS,
    });

    // Fountains up the two sides of the card.
    let raf = 0;
    const streams = () => {
      fire({
        particleCount: 6,
        angle: 65,
        spread: 55,
        startVelocity: 55,
        origin: { x: 0.08, y: 0.9 },
        colors: COLORS,
      });
      fire({
        particleCount: 6,
        angle: 115,
        spread: 55,
        startVelocity: 55,
        origin: { x: 0.92, y: 0.9 },
        colors: COLORS,
      });
      if (Date.now() < end) raf = requestAnimationFrame(streams);
    };
    streams();

    // Repeating centred bursts to keep the moment alive.
    const bursts = setInterval(() => {
      fire({
        particleCount: 90,
        spread: 360,
        startVelocity: 32,
        scalar: 1.1,
        origin: center,
        colors: COLORS,
      });
    }, 620);
    const stopBursts = setTimeout(() => clearInterval(bursts), BURST_MS);

    return () => {
      clearTimeout(stopBursts);
      clearInterval(bursts);
      cancelAnimationFrame(raf);
      fire.reset();
    };
  }, [phase, reduce]);

  // Auto-dismiss the jackpot after a beat.
  useEffect(() => {
    if (phase !== "won") return;
    const id = setTimeout(() => onCloseRef.current(), WON_AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const open = phase !== null;
  const won = phase === "won";

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={won ? onClose : undefined}
            className="fixed inset-0 z-[398] bg-black/75 backdrop-blur-[7px]"
          />
          {/* Confetti sits behind the card so the card stays cleanly on top. */}
          {won ? (
            <canvas
              ref={canvasRef}
              aria-hidden
              className="pointer-events-none fixed inset-0 z-[399]"
            />
          ) : null}
          <div className="pointer-events-none fixed inset-0 z-[400] grid place-items-center p-6">
            <AnimatePresence mode="wait">
              {won ? (
                <motion.div
                  key="won"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 22 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={
                    reduce ? { duration: 0.2 } : { type: "spring", stiffness: 300, damping: 20 }
                  }
                  className="ws-glass pointer-events-auto relative w-full max-w-[440px] overflow-hidden rounded-[28px] p-8 text-center shadow-[0_50px_140px_-30px_rgba(167,139,250,0.8)]"
                >
                  <div
                    aria-hidden
                    className="bg-accent/35 pointer-events-none absolute -top-28 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full blur-[80px]"
                  />
                  <div className="relative">
                    <motion.div
                      initial={reduce ? {} : { scale: 0, rotate: -30 }}
                      animate={reduce ? {} : { scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 13 }}
                      className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[linear-gradient(180deg,#F6D365,#e0a83a)] text-[38px] shadow-[0_14px_36px_-8px_rgba(246,211,101,0.8)]"
                    >
                      🏆
                    </motion.div>
                    <div className="text-accent mt-5 text-[13px] font-bold tracking-[0.24em] uppercase">
                      Jackpot
                    </div>
                    <div className="ws-serif mt-1 bg-[linear-gradient(180deg,#ffffff,#cbbcff)] bg-clip-text text-[40px] leading-none text-transparent">
                      You won!
                    </div>
                    <div className="ws-serif tnum mt-4 text-[clamp(48px,13vw,72px)] leading-none text-white drop-shadow-[0_0_32px_rgba(167,139,250,0.55)]">
                      {prizeLabel}
                    </div>
                    <div className="mt-3 text-[13.5px] font-normal text-white/60">
                      The whole pot has been added to your balance.
                    </div>
                    <button
                      onClick={onClose}
                      className="mt-7 w-full cursor-pointer rounded-2xl bg-[linear-gradient(180deg,#c3b0ff,#8b6ef0)] p-4 font-sans text-[16px] font-bold text-white shadow-[0_16px_42px_-12px_rgba(167,139,250,0.9)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Nice!
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="calc"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="ws-glass pointer-events-auto relative w-full max-w-[420px] overflow-hidden rounded-[28px] p-8 text-center shadow-[0_50px_140px_-30px_rgba(167,139,250,0.6)]"
                >
                  <div
                    aria-hidden
                    className="bg-accent/25 pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 animate-pulse rounded-full blur-[80px]"
                  />
                  <div className="relative">
                    {/* Spinning fortune ring. */}
                    <div className="relative mx-auto h-24 w-24">
                      {reduce ? null : (
                        <motion.div
                          aria-hidden
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
                          className="absolute inset-0 rounded-full"
                          style={{
                            background:
                              "conic-gradient(from 0deg, rgba(167,139,250,0) 0deg, #A78BFA 90deg, #F6D365 200deg, rgba(167,139,250,0) 320deg)",
                            mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))",
                            WebkitMask:
                              "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))",
                          }}
                        />
                      )}
                      <div className="absolute inset-[10px] grid place-items-center rounded-full bg-black/40 text-[30px]">
                        <motion.span
                          animate={reduce ? {} : { scale: [1, 1.12, 1] }}
                          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                        >
                          🎰
                        </motion.span>
                      </div>
                    </div>

                    <div className="ws-serif mt-6 text-[26px] leading-tight text-white">
                      Calculating the winner…
                    </div>
                    <div className="mt-2 text-[13px] font-normal text-white/55">
                      Deciding who takes the pot. Hold tight.
                    </div>
                    <div className="tnum text-accent mt-4 text-[15px] font-semibold">
                      {prizeLabel} on the line
                    </div>

                    {/* Suspense progress that fills across the wait. */}
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      {reduce ? (
                        <div className="bg-accent h-full w-1/3 rounded-full" />
                      ) : (
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 5, ease: "linear" }}
                          className="bg-accent h-full rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
