"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WalletIcon } from "@/components/ui/icons";
import type { VenueAdapter } from "@/lib/migration/types";
import { MoveOldMoneySheet } from "@/features/migrate/components/move-old-money-sheet";
import { useMigrationStatus } from "@/features/migrate/hooks/use-migration-status";
import { useLegacyWalletFunds } from "@/features/migrate/hooks/use-legacy-wallet-funds";
import { useLegacyAccount } from "@/features/migrate/hooks/use-legacy-account";
import { useLocalPrivyHistory } from "@/features/migrate/lib/visibility";

// The row on its own, with the sheet left to the caller. Needed wherever the
// door lives inside something that unmounts: the sheet portals to document.body
// and so falls outside a popover's "was that click inside me?" test, meaning the
// first click in the sheet dismisses the popover and takes the sheet down with
// it, mid-click. Hosting the sheet as a sibling of the popover's body keeps it
// alive. See AccountPopover.
export function MoveOldMoneyButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className: string;
}) {
  const t = useTranslations("migrate");
  const status = useMigrationStatus();
  const linked = status.data?.linked === true;
  // The device's own Privy keys. Synchronous, so a returning legacy user sees
  // the door immediately rather than after a round trip.
  const localHistory = useLocalPrivyHistory();
  // The directory. Skipped for an account already known linked — it exists to
  // spot a legacy account we have NOT linked yet.
  const legacy = useLegacyAccount(!linked);
  // The frontend's own read of the old wallet when it has one (every token,
  // not the service's ETH-and-USDC probe), else the service's figure.
  const wallet = useLegacyWalletFunds(status.data?.legacy ?? null, linked);
  const left = wallet.data?.usd ?? (status.data?.hasLegacyFunds ? status.data.legacyFundsUsd : 0);

  /*
    Who this door is for.

    It is the always-open way back to an old account — challenge windows,
    keeper fills and late bank deposits can leave something there long after
    the balance-card offer is gone. But that is a sentence about people who
    HAD an old account. Somebody who signed up on Market 2.0 has nothing
    behind this row, and offering it tells them they have unfinished business
    they have never had.

    So it needs a positive reason to appear, rather than appearing by default:
    the account is linked, this device carries the old app's session keys, or
    the directory found them. Nothing showing while the directory is still
    answering is deliberate — a row that appears a moment late for a legacy
    user on a new device is better than one that appears for everybody and
    then vanishes.
  */
  if (!linked && !localHistory && !legacy.has) return null;

  return (
    <button onClick={onClick} className={`${className} text-white`}>
      <WalletIcon size={20} />
      <span className="min-w-0 flex-1 truncate">{t("entry")}</span>
      {left > 0 ? (
        <span className="tnum bg-accent/20 text-accent shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold">
          {t("entryBadge")}
        </span>
      ) : null}
    </button>
  );
}

// The always-available door into the migration, for the Account modal. It
// never retires: challenge windows, keeper fills and late bank deposits can
// leave money in the old wallet long after the balance-card button is gone.
// Self-contained, so only for callers whose own tree stays mounted while the
// sheet is open.
export function MoveOldMoneyEntry({
  adapters,
  className,
}: {
  adapters: readonly VenueAdapter[];
  className: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MoveOldMoneyButton onClick={() => setOpen(true)} className={className} />
      <MoveOldMoneySheet
        open={open}
        onClose={() => setOpen(false)}
        adapters={adapters}
        entry="account_modal"
      />
    </>
  );
}
