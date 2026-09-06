"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePredictions } from "@/features/prediction/hooks/use-predictions";
import { PREDICTIONS } from "@/lib/data/dashboard";
import type { Prediction } from "@/lib/types";

const ROTATE_MS = 3000;

// The SVG is the exact Figma export with 3 text paths replaced by <text>
// elements. Everything else (layout, design, icons, buttons, photos frames)
// is untouched. We patch only:
//   pred-title / pred-title-2 — question text (2 lines)
//   pred-subtitle             — "68¢ Yes · $4.2M vol"
//   pred-tag                  — badge category
//   pred-photo-1 / pred-photo-2 — market artwork (xlink:href)
function PredictionMobileCard({ prediction: p }: { prediction: Prediction }) {
  const ref = useRef<HTMLObjectElement>(null);
  // Holds the latest prediction so `patch` can stay stable and still read
  // current data. Updated in the effect below, never during render.
  const predRef = useRef(p);

  // Patch the SVG text and photos. Called once on load and whenever the
  // prediction changes. No useEffect chain — the interval in the parent
  // calls patch directly via the ref.
  const patch = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    const pred = predRef.current;

    const set = (id: string, text: string) => {
      const el = doc.getElementById(id);
      if (el) el.textContent = text;
    };

    const q = pred.q;
    const mid = q.lastIndexOf(" ", 28);
    if (mid > 0 && q.length > 28) {
      set("pred-title", q.slice(0, mid));
      set("pred-title-2", q.slice(mid + 1));
    } else {
      set("pred-title", q);
      set("pred-title-2", "");
    }

    set("pred-subtitle", `${pred.yes} Yes · ${pred.vol}`);
    set("pred-tag", pred.tag);

    if (pred.image) {
      const setHref = (id: string) => {
        const el = doc.getElementById(id);
        if (el) {
          el.setAttribute("href", pred.image!);
          el.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", pred.image!);
        }
      };
      setHref("image0_1_5692");
      setHref("image1_1_5692");
    }
  }, []); // stable — reads from ref

  // Patch once when prediction changes. The ref keeps patch stable so this
  // only fires when the actual prediction object changes, not on every render.
  useEffect(() => {
    predRef.current = p;
    patch();
  }, [p, patch]);

  return (
    <object
      ref={ref}
      data="/prediction/card-bg.svg"
      type="image/svg+xml"
      aria-label={p.q}
      onLoad={patch}
      className="pointer-events-auto block aspect-[330/213] w-full overflow-hidden rounded-[15px]"
    />
  );
}

export function PredictionMobile() {
  const t = useTranslations("prediction");
  const { data: live } = usePredictions();
  const predictions = live && live.length > 0 ? live : PREDICTIONS;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (predictions.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % predictions.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [predictions.length]);

  if (predictions.length === 0) return null;

  const current = predictions[index % predictions.length];

  return (
    <div className="w-full p-4">
      <Link href="/prediction" className="inline-flex items-end gap-[3px]">
        <span className="ws-display text-[18px] leading-[1.2] tracking-[-0.36px] text-white">
          {t("mobileHeading")} <span className="text-[#FFD62F]">{t("mobileHeadingAccent")}</span>{" "}
          {t("mobileHeadingSuffix")}
        </span>
        <svg viewBox="0 0 20 20" aria-hidden className="mb-[1px] h-5 w-5 shrink-0" fill="none">
          <path
            d="M7.5 4l6 6-6 6"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <div className="mt-3">
        <PredictionMobileCard prediction={current} />
      </div>
    </div>
  );
}
