"use client";

import { useEffect, useState } from "react";

export function ClockHands() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const seconds = now ? now.getSeconds() + now.getMilliseconds() / 1000 : 0;
  const minutes = now ? now.getMinutes() + seconds / 60 : 0;
  const hours = now ? (now.getHours() % 12) + minutes / 60 : 0;

  return (
    <>
      <g transform={`rotate(${hours * 30} 215 215)`}>
        <path d="M215 215V166" stroke="url(#rwa-metal)" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${minutes * 6} 215 215)`}>
        <path d="M215 215V143" stroke="#F0F0F2" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${seconds * 6} 215 215)`}>
        <path d="M215 229V137" stroke="#BFC0C5" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="215" cy="139" r="2.5" fill="#F4F4F5" />
      </g>
    </>
  );
}
