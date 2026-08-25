"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WalletIcon } from "@/components/ui/icons";
import type { VenueAdapter } from "@/lib/migration/types";
import { MoveOldMoneySheet } from "@/features/migrate/components/move-old-money-sheet";

// The always-available door into the migration, for the Account modal. It
// never retires: challenge windows, keeper fills and late bank deposits can
// leave money in the old wallet long after the balance-card button is gone.
export function MoveOldMoneyEntry({
  adapters,
  className,
}: {
  adapters: readonly VenueAdapter[];
  className: string;
}) {
  const t = useTranslations("migrate");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={`${className} text-white`}>
        <WalletIcon size={20} />
        {t("entry")}
      </button>
      <MoveOldMoneySheet
        open={open}
        onClose={() => setOpen(false)}
        adapters={adapters}
        entry="account_modal"
      />
    </>
  );
}
