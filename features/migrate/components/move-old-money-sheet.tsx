"use client";

import { useState } from "react";
import { LegacyPrivyProvider } from "@/components/providers/legacy-privy-provider";
import { MoveOldMoneyFrame } from "@/features/migrate/components/move-old-money-frame";

// Kept here too: the gate and the hosts import the frame from the sheet.
export { MoveOldMoneyFrame };
import type { VenueAdapter } from "@/lib/migration/types";
import {
  MoveOldMoneyPanel,
  type MigrationEntry,
  type MigrationProgress,
} from "@/features/migrate/components/move-old-money-panel";
import { UpgradeHeader } from "@/features/migrate/components/upgrade-header";
import { upgradeView } from "@/features/migrate/lib/upgrade-progress";

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
    progress.coreRemaining === 0 &&
    progress.settled;
  return (
    <MoveOldMoneyFrame onClose={onClose}>
      <LegacyPrivyProvider>
        <UpgradeHeader view={upgradeView(progress, done)} variant="finish" />
        <div className="px-[26px] pt-5 pb-[26px]">
          <MoveOldMoneyPanel
            adapters={adapters}
            entry={entry}
            onClose={onClose}
            onProgress={setProgress}
            compact
          />
        </div>
      </LegacyPrivyProvider>
    </MoveOldMoneyFrame>
  );
}
