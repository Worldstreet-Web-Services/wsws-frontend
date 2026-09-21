"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { LegacyPrivyProvider } from "@/components/providers/legacy-privy-provider";
import type { VenueAdapter } from "@/lib/migration/types";
import {
  MoveOldMoneyPanel,
  type MigrationEntry,
  type MigrationProgress,
} from "@/features/migrate/components/move-old-money-panel";
import { MigrationGateHeader } from "@/features/migrate/components/migration-gate-header";

// The chrome around the migration panel: a full-height sheet above every
// other modal (the Account modal opens it from underneath), in a portal so
// it escapes whatever scroll container mounted it.
export function MoveOldMoneyFrame({
  onClose,
  children,
  dismissible = true,
}: {
  onClose: () => void;
  children: React.ReactNode;
  /**
   * False turns the sheet into a gate: no Escape, no backdrop click, no close
   * button. The only way out is whatever `children` offer — the migration gate
   * uses this to hold the app until the old account is linked and its money
   * has moved.
   */
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, dismissible]);

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[440]">
      {dismissible ? (
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[7px]"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/70 backdrop-blur-[7px]" />
      )}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:items-center md:p-6">
        {/* The beam lives on a wrapper that does NOT scroll. On the card itself
            it would be positioned inside the scroll container and slide away
            with the content on a long review list. */}
        <div className="ws-beam-upgrade pointer-events-auto relative w-full rounded-t-[24px] md:w-[min(520px,100%)] md:rounded-[24px]">
          <div className="bg-sheet relative max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] border border-white/14 px-[26px] pt-5 pb-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_-20px_90px_-30px_rgba(0,0,0,0.9)] md:rounded-[24px] md:pt-[26px]">
            {dismissible ? (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-[18px] right-[18px] z-[1] grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-full border border-white/12 bg-white/6 text-white/70"
              >
                <CloseIcon />
              </button>
            ) : null}
            {/* Positioned, so it paints above the glow rather than under it. */}
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * The upgrade modal reopened from "Finish upgrading my old account" — the same
 * modal the gate shows on first arrival, not a different sheet.
 *
 * It used to open the bare panel with no header, so the one surface a reader
 * met twice looked like two unrelated things: an announcement with steps the
 * first time, and an unlabelled list the second. It now carries the same header
 * and progress, in the `finish` wording, because to somebody halfway through,
 * "Upgrade your account" reads as the upgrade having started over.
 *
 * Unlike the gate it can be closed: this is a door they chose to walk through,
 * not one the app is holding open. Carries its own Privy mount for entry points
 * that are not already inside LegacyPrivyProvider (the Account modal).
 */
export function MoveOldMoneySheet({
  open,
  onClose,
  adapters,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  adapters: readonly VenueAdapter[];
  entry: MigrationEntry;
}) {
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  if (!open) return null;
  const done =
    progress !== null &&
    !progress.running &&
    progress.linked &&
    progress.discovered &&
    progress.coreRemaining === 0;
  return (
    <MoveOldMoneyFrame onClose={onClose}>
      <LegacyPrivyProvider>
        <MigrationGateHeader stage={progress?.stage ?? "signIn"} done={done} variant="finish" />
        <MoveOldMoneyPanel
          adapters={adapters}
          entry={entry}
          onClose={onClose}
          onProgress={setProgress}
        />
      </LegacyPrivyProvider>
    </MoveOldMoneyFrame>
  );
}
