"use client";

import { useMigrationStatus } from "@/features/migrate/hooks/use-migration-status";
import {
  offerMigration,
  useLocalPrivyHistory,
  useMigrationCompleteFlag,
} from "@/features/migrate/lib/visibility";

// Whether the balance card shows Update Balance and masks the balance: the
// device's own Privy history, or the server saying the old wallet still holds
// money, unless the migration already completed here.
export function useOfferMigration(): boolean {
  const complete = useMigrationCompleteFlag();
  const localHistory = useLocalPrivyHistory();
  const status = useMigrationStatus();
  return offerMigration({ complete, localHistory, status: status.data });
}
