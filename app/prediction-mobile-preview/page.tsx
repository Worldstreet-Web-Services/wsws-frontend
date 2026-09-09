"use client";

// Temporary preview for the mobile prediction carousel. Scrolls to the second
// slide (boxing card) after mount so the crop can be verified. Delete once done.
import { useEffect } from "react";
import { PredictionMobile } from "@/features/prediction";

export default function PredictionMobilePreview() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".overflow-x-auto");
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <div className="mx-auto w-full max-w-[420px]">
        <PredictionMobile />
      </div>
    </div>
  );
}
