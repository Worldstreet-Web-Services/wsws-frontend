"use client";

import { useState, type ReactNode } from "react";
import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { NetworkStatusProvider } from "@/components/providers/network-status";
import { BalanceVisibilityProvider } from "@/components/ui/balance-visibility";
import { Toaster } from "@/components/ui/toaster";
import { createQueryClient } from "@/lib/query-client";
import {
  RQ_PERSIST_BUSTER,
  RQ_PERSIST_KEY,
  RQ_PERSIST_MAX_AGE,
  isPersistedKey,
} from "@/lib/query-persist";

export function DataProviders({ children, addons }: { children: ReactNode; addons?: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  // Storage is undefined on the server, making persistence a no-op there and
  // preserving the same provider tree during hydration.
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: RQ_PERSIST_KEY,
      throttleTime: 1000,
    })
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: RQ_PERSIST_MAX_AGE,
        buster: RQ_PERSIST_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) && isPersistedKey(query.queryKey),
        },
      }}
    >
      <NetworkStatusProvider>
        <BalanceVisibilityProvider>
          {children}
          {addons}
        </BalanceVisibilityProvider>
      </NetworkStatusProvider>
      <Toaster />
    </PersistQueryClientProvider>
  );
}
