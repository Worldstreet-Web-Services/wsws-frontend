"use client";

import { useEffect, useState } from "react";
import { MigrationGate } from "@/features/migrate/components/migration-gate";
import { MoveOldMoneyFrame } from "@/features/migrate/components/move-old-money-sheet";
import { useOfferMigrationState } from "@/features/migrate/hooks/use-offer-migration";
import { MIGRATION_ADAPTERS } from "@/components/layout/migration-adapters";

/**
 * The longest the skeleton may hold the screen while the offer is decided.
 * The answers it waits on are two small reads; past this, an outage is the
 * likelier explanation, and the dashboard must not be held for one.
 */
const DECIDING_CEILING_MS = 6_000;

/**
 * The migration gate with its adapter list bound, for the shell to load behind
 * next/dynamic. Same reasoning as update-balance-host: it mounts the whole
 * Privy SDK and reaches four feature barrels, which must not ride into every
 * signed-in route's first load.
 *
 * While the offer is still being decided, a skeleton of the upgrade card
 * holds the screen instead: the dashboard used to paint, and the gate then
 * dropped over it a beat later.
 */
export function MigrationGateHost() {
  const { deciding } = useOfferMigrationState();
  const [ceilingHit, setCeilingHit] = useState(false);
  useEffect(() => {
    if (!deciding) return;
    const timer = setTimeout(() => setCeilingHit(true), DECIDING_CEILING_MS);
    return () => clearTimeout(timer);
  }, [deciding]);

  if (deciding && !ceilingHit) return <UpgradeSkeleton />;
  return <MigrationGate adapters={MIGRATION_ADAPTERS} />;
}

const noop = () => {};

/** The card's shape, before its words: art strip, mark, two lines, a pill. */
function UpgradeSkeleton() {
  return (
    <MoveOldMoneyFrame dismissible={false} onClose={noop}>
      <div aria-busy="true" aria-label="Checking your account" className="animate-pulse">
        <div className="aspect-[598/149] w-full bg-[#232323]" />
        <div className="flex flex-col items-center px-[26px] pt-6 pb-[26px]">
          <div className="h-[18px] w-[140px] rounded bg-white/10" />
          <div className="mt-5 h-[30px] w-[78%] rounded bg-white/12" />
          <div className="mt-2 h-[30px] w-[52%] rounded bg-white/12" />
          <div className="mt-4 h-[15px] w-[86%] rounded bg-white/8" />
          <div className="mt-2 h-[15px] w-[70%] rounded bg-white/8" />
          <div className="mt-6 h-[42px] w-[62%] rounded-full bg-white/6" />
          <div className="mt-8 h-px w-full bg-white/10" />
          <div className="mt-6 h-[52px] w-full rounded-full bg-white/10" />
          <div className="mt-6 h-[14px] w-[44%] rounded bg-white/8" />
        </div>
      </div>
    </MoveOldMoneyFrame>
  );
}

export default MigrationGateHost;
