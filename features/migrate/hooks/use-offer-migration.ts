"use client";

import { useEffect } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useMigrationStatus } from "@/features/migrate/hooks/use-migration-status";
import { useLegacyAccount } from "@/features/migrate/hooks/use-legacy-account";
import { EMPTY_MIGRATION_STATUS } from "@/features/migrate/lib/api";
import {
  markAccountLinked,
  maskBalance,
  offerMigration,
  useAccountLinked,
  useFundsMoved,
  useLocalPrivyHistory,
  useMigrationCompleteFlag,
} from "@/features/migrate/lib/visibility";

// Whether to offer the move to Market 2.0, and mask the balance while it is
// pending. The test is "is this account still on the old identity", not "is
// there money in the old wallet": the re-key carries the profile, followers,
// posts, chess ledgers, kash points and tier, none of which a balance can see.
// A user with $0 and four years of history has the most to lose by never
// linking. And once linked, there is nothing left to ask for — the long tail
// of tokens is the account menu's job, never the gate's.
export function useOfferMigration(): boolean {
  const { profile, evmAddress } = useAuthSession();
  const email = profile.email;
  // The device's memory of a confirmed link is authoritative. It is written
  // only once the service has said `linked: true`, under the email and the
  // address, and from then on this account is never offered the migration
  // again on this device — no status wait, no directory lookup (a Privy
  // management-API call), no on-chain probe. A live `linked: false` is the
  // one thing that outranks it (an admin remap), and offerMigration honours
  // that.
  const knownLinked = useAccountLinked({ email, evmAddress });

  const complete = useMigrationCompleteFlag(evmAddress);
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

  // The first time the service confirms this account is linked, remember it so
  // every later load short-circuits above. Only ever on a real `true`, never
  // on false or "could not say".
  useEffect(() => {
    if (status.data?.linked === true) markAccountLinked({ email, evmAddress });
  }, [status.data?.linked, email, evmAddress]);

  const offer = offerMigration({
    complete,
    localHistory,
    status: statusData,
    linked: knownLinked,
    legacyAccount: legacy.has,
  });
  console.log(
    `[migrate] offer migrate-to-2.0: ${offer ? "YES" : "no"}` +
      ` [linked: ${knownLinked ? "yes (remembered on this device)" : status.isError ? "service errored" : statusData === undefined ? "loading" : (statusData.linked ?? "service could not say")},` +
      ` done on this device: ${complete}, privy keys here: ${localHistory},` +
      ` service reports funds: ${statusData?.hasLegacyFunds ?? "unknown"},` +
      ` directory: ${knownLinked ? "skipped (known linked)" : legacy.has ? "legacy account found" : "no legacy account"}]`
  );
  return offer;
}

// Whether the balance card should hide the figure. Comes off as soon as a run
// moves anything, so a partial migration shows the money that has arrived
// while the button stays for whatever is left.
export function useMaskBalance(): boolean {
  const { evmAddress } = useAuthSession();
  return maskBalance({ offer: useOfferMigration(), moved: useFundsMoved(evmAddress) });
}
