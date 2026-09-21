"use client";

import { useTranslations } from "next-intl";
import type { MigrationStage } from "@/features/migrate/components/move-old-money-panel";

const STAGES: readonly MigrationStage[] = ["signIn", "move", "finish"];
const LABEL: Record<MigrationStage, string> = {
  signIn: "gateStepSignIn",
  move: "gateStepMove",
  finish: "gateStepFinish",
};

/**
 * Which door the reader came through. `gate` is the upgrade the app holds open
 * on first arrival; `finish` is the same modal reopened from "Finish upgrading
 * my old account" in the account menu, for somebody picking up where they left
 * off. Same modal, same steps — only the words change, because "Upgrade your
 * account" to somebody halfway through reads as the upgrade having started over.
 */
export type GateHeaderVariant = "gate" | "finish";

/*
  `eyebrow` is the small gold line, `title` the large one. On first arrival the
  ANNOUNCEMENT is the headline — "New economy unveiling." — and what to do about
  it sits above it in the small line. Reopened from the account menu there is
  nothing to announce any more, so the task itself takes the headline.
*/
const COPY: Record<GateHeaderVariant, { eyebrow: string; title: string; intro: string }> = {
  gate: { eyebrow: "gateTitle", title: "gateEyebrow", intro: "gateIntro" },
  finish: { eyebrow: "gateFinishEyebrow", title: "gateFinishTitle", intro: "gateFinishIntro" },
};

/**
 * The top of the upgrade modal: what this is and how far along the reader is.
 *
 * ─── WHERE THE COLOUR GOES ──────────────────────────────────────────────────
 * The app is white on black, and so is almost all of this. The upgrade gold is
 * spent only on the things that MEAN
 * something here: the announcement line, the progress the reader has made, and
 * (in the panel and the frame) the action and the moment itself. The title and
 * the body stay white, so the colour reads as signal rather than as a coat of
 * paint over everything.
 */
export function MigrationGateHeader({
  stage,
  done,
  variant = "gate",
}: {
  stage: MigrationStage;
  done: boolean;
  variant?: GateHeaderVariant;
}) {
  const t = useTranslations("migrate");
  const at = STAGES.indexOf(stage);
  const copy = COPY[variant];
  return (
    <header className="mb-5 border-b border-white/10 pb-5">
      {/* The announcement, not a label: sentence case in the soft gold, so it reads as
          a line of the page rather than a tracked-out eyebrow. */}
      <p className="text-upgrade-soft mb-1.5 text-[12.5px] font-semibold">{t(copy.eyebrow)}</p>
      <h2 className="ws-display text-[28px] leading-[1.1] tracking-[-0.015em] md:text-[30px]">
        {t(copy.title)}
      </h2>
      <p className="mt-2 max-w-[44ch] text-[13.5px] leading-normal text-white/60">
        {t(copy.intro)}
      </p>
      <ol
        className="mt-5 grid grid-cols-3 gap-2"
        aria-label={t("gateProgress", { step: done ? STAGES.length : at + 1, of: STAGES.length })}
      >
        {STAGES.map((s, i) => {
          const filled = done || i < at;
          const active = !done && i === at;
          return (
            <li key={s} aria-current={active ? "step" : undefined}>
              <div className="h-[4px] overflow-hidden rounded-full bg-white/10">
                {/* Progress is the one piece of the reader's own doing on this
                    screen, so it gets the colour. The step in hand glows. */}
                <div
                  className={`bg-upgrade h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${
                    active ? "shadow-[0_0_12px_rgba(254,218,75,0.55)]" : ""
                  }`}
                  style={{ width: filled ? "100%" : active ? "50%" : "0%" }}
                />
              </div>
              <div
                className={`mt-2 text-[12.5px] leading-snug ${
                  active || filled ? "text-white" : "text-white/45"
                }`}
              >
                {t(LABEL[s])}
              </div>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
