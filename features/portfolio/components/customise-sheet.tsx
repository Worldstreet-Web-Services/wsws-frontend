"use client";

import { useState } from "react";
import { saveCustomise, loadCustomise } from "@/lib/preferences";

const SECTIONS = [
  { id: "tokens", label: "Tokens" },
  { id: "perps", label: "Perps" },
  { id: "predictions", label: "Predictions" },
  { id: "memecoins", label: "Memecoins" },
  { id: "arkade", label: "Arkade" },
] as const;

function DragHandle() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="5" r="1.5" fill="rgba(255,255,255,0.4)" />
      <circle cx="15" cy="5" r="1.5" fill="rgba(255,255,255,0.4)" />
      <circle cx="9" cy="12" r="1.5" fill="rgba(255,255,255,0.4)" />
      <circle cx="15" cy="12" r="1.5" fill="rgba(255,255,255,0.4)" />
      <circle cx="9" cy="19" r="1.5" fill="rgba(255,255,255,0.4)" />
      <circle cx="15" cy="19" r="1.5" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative h-5 w-10 shrink-0 cursor-pointer rounded-[50px]"
    >
      <span
        className={`absolute inset-0 rounded-[50px] transition-colors ${
          checked ? "bg-[#ffcf33]" : "bg-white/20"
        }`}
        style={{ boxShadow: "inset 0 1.5px 2px rgba(0,0,0,0.1)" }}
      />
      <span
        className={`absolute top-1/2 block size-3.5 -translate-y-1/2 rounded-full transition-all ${
          checked
            ? "left-[22px] bg-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            : "left-[4px] bg-white/60"
        }`}
      />
    </button>
  );
}

/**
 * Full-screen customise overlay for mobile. Slides in over the dashboard so
 * the user never leaves the page — no full reload, no navigation history entry.
 * Call `onClose` to dismiss; the parent re-reads localStorage after close to
 * apply the new section visibility.
 */
export function CustomiseSheet({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const hidden = new Set(loadCustomise());
    return Object.fromEntries(SECTIONS.map((s) => [s.id, !hidden.has(s.id)]));
  });

  const filtered = SECTIONS.filter((s) => s.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f0f] pt-[max(70px,env(safe-area-inset-top,70px))]">
      {/* Header */}
      <div className="relative flex h-[75px] items-center px-4 pb-1">
        <button
          type="button"
          onClick={onClose}
          className="z-10 grid size-8 cursor-pointer place-items-center rounded-full bg-[rgba(244,244,244,0.02)]"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="#f3f3f3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="absolute inset-x-0 text-center text-[20px] leading-7 font-bold tracking-[-0.2px] text-[#f3f3f3]">
          Customise Portfolio
        </p>
      </div>

      {/* Search */}
      <div className="mt-5 px-[42px]">
        <div className="flex h-[42px] items-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="shrink-0"
          >
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" />
            <path
              d="m20 20-3.5-3.5"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ..."
            className="w-full bg-transparent text-[13.5px] text-white outline-none placeholder:text-white/40"
          />
        </div>
      </div>

      {/* Section list */}
      <div className="mt-11 flex flex-col gap-4 px-[38px]">
        {filtered.map((section) => (
          <div key={section.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DragHandle />
              <span className="text-base leading-6 font-semibold tracking-[0.15px] text-white">
                {section.label}
              </span>
            </div>
            <Toggle
              checked={enabled[section.id]}
              onChange={() =>
                setEnabled((prev) => {
                  const next = { ...prev, [section.id]: !prev[section.id] };
                  const hidden = Object.entries(next)
                    .filter(([, on]) => !on)
                    .map(([id]) => id);
                  saveCustomise(hidden);
                  return next;
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
