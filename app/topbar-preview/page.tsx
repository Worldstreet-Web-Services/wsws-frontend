"use client";

// Temporary preview for the ported ray-fan topbar (from new-approach-ui).
// Renders the non-home variant (avatar + centred MARKET wordmark); the home
// variant shows the account name + address in the same slot. Delete once verified.
import { Topbar } from "@/components/layout/topbar";

export default function TopbarPreview() {
  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <Topbar onOpenAccount={() => {}} />
      <div className="p-6 text-sm text-white/40">
        Preview: non-home variant shown (pathname ≠ /portfolio).
      </div>
    </div>
  );
}
