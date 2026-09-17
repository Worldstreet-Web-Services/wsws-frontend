"use client";

import { useEffect } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMigrationStatus } from "@/features/migrate/hooks/use-migration-status";
import { useLegacyAccount } from "@/features/migrate/hooks/use-legacy-account";
import { useLegacyWalletFunds } from "@/features/migrate/hooks/use-legacy-wallet-funds";
import { EMPTY_MIGRATION_STATUS } from "@/features/migrate/lib/api";
import {
  markEmailLinked,
  maskBalance,
  offerMigration,
  useEmailLinked,
  useFundsMoved,
  useLocalPrivyHistory,
  useMigrationCompleteFlag,
} from "@/features/migrate/lib/visibility";

// Whether to offer the move to Market 2.0, and mask the balance while it is
// pending. The test is "is this account still on the old identity", not "is
// there money in the old wallet": the re-key carries the profile, followers,
// posts, chess ledgers, kash points and tier, none of which a balance can see.
// A user with $0 and four years of history has the most to lose by never
// linking.
export function useOfferMigration(): boolean {
  const { profile } = useAuthSession();
  const email = profile.email;
  // A confirmed link is permanent (the mapping never disappears), so once this
  // device has seen this email's account linked, we already know it is linked
  // before /status answers — and we skip the legacy directory lookup (a Privy
  // management-API call, the expensive "csv" check) entirely. We still probe
  // the old wallet: a linked account can keep residual funds worth moving.
  const knownLinked = useEmailLinked(email);

  const complete = useMigrationCompleteFlag();
  const localHistory = useLocalPrivyHistory();
  const status = useMigrationStatus();
  // Skip the directory call when we already know the account is linked — its
  // only job is to spot a legacy account we have NOT linked yet.
  const legacy = useLegacyAccount(!knownLinked);

  // A hard failure from the service (network, 5xx — the "not configured" case
  // is already mapped to the empty status) is "could not say", not "still
  // loading". Treating it as loading would hide the offer for as long as the
  // service is down, and take the door away from a legacy user for an outage
  // that is not theirs. As "could not say", the device's own signals still get
  // to decide, exactly as before the service existed.
  const statusData = status.isError ? EMPTY_MIGRATION_STATUS : status.data;
  // The same precedence offerMigration applies: a live answer outranks the
  // device's memory, which only fills the gap it leaves.
  const linked = statusData?.linked === true || (knownLinked && statusData?.linked !== false);
  // For a linked account, what is ACTUALLY on the old wallet — read here, not
  // taken from the service, whose flag also fires on pending ledger re-keys.
  const walletFunds = useLegacyWalletFunds(statusData?.legacy ?? null, linked);

  // The first time the service confirms this account is linked, remember it by
  // email so the next load takes the shortcut above. Only ever on a real
  // `true`, never on false or "could not say".
  useEffect(() => {
    if (status.data?.linked === true) markEmailLinked(email);
  }, [status.data?.linked, email]);

  // undefined = the read is still in flight (offerMigration waits);
  // null = it ran and could not tell — a partial read OR a hard failure, both
  // of which fall back to the service flag rather than hiding real money for
  // as long as the RPC is down.
  const walletFundsRead: boolean | null | undefined = walletFunds.isError
    ? null
    : walletFunds.data === undefined
      ? undefined
      : (walletFunds.data?.hasFunds ?? null);

  const offer = offerMigration({
    complete,
    localHistory,
    status: statusData,
    linked: knownLinked,
    legacyAccount: legacy.has,
    walletFunds: walletFundsRead,
  });
  console.log(
    `[migrate] offer migrate-to-2.0: ${offer ? "YES" : "no"}` +
      ` [linked: ${linked ? (statusData?.linked === true ? "yes" : "yes (remembered on this device)") : status.isError ? "service errored" : statusData === undefined ? "loading" : (statusData.linked ?? "service could not say")}, done on this device: ${complete},` +
      ` privy keys here: ${localHistory}, service reports funds: ${statusData?.hasLegacyFunds ?? "unknown"},` +
      ` old wallet on chain: ${walletFunds.isError ? "read failed" : walletFunds.data === undefined ? (linked ? "probing" : "not read") : walletFunds.data === null ? "partial read" : walletFunds.data.hasFunds ? `$${walletFunds.data.usd.toFixed(2)} left` : "empty"},` +
      ` directory: ${knownLinked ? "skipped (known linked)" : legacy.has ? "legacy account found" : "no legacy account"}]`
  );
  return offer;
}

// Whether the balance card should hide the figure. Comes off as soon as a run
// moves anything, so a partial migration shows the money that has arrived
// while the button stays for whatever is left.
export function useMaskBalance(): boolean {
  return maskBalance({ offer: useOfferMigration(), moved: useFundsMoved() });
}
