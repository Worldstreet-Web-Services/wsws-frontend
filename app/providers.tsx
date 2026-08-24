"use client";

import { useState } from "react";
import { DecaneKit } from "decane-connect-kit";
import { defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { createQueryClient } from "@/lib/query-client";
import {
  RQ_PERSIST_KEY,
  RQ_PERSIST_MAX_AGE,
  RQ_PERSIST_BUSTER,
  isPersistedKey,
} from "@/lib/query-persist";
import { Toaster } from "@/components/ui/toaster";
import { NetworkStatusProvider } from "@/components/providers/network-status";
import { AnalyticsIdentity } from "@/components/providers/analytics-identity";
import { AnalyticsSegments } from "@/components/providers/analytics-segments";
import { DecaneTokenBridge } from "@/components/providers/decane-token-bridge";
import { DecaneRecoveryHost } from "@/components/providers/decane-recovery-host";
import {
  collectRotatedRecoveryPassword,
  deliverRecoveryFile,
  offerRecoveryShare,
} from "@/lib/decane-recovery";
import { BalanceVisibilityProvider } from "@/components/ui/balance-visibility";
import { MiniTimerHost } from "@/features/casino";

// Well-formed placeholders let the app build before env vars are set. Decane
// only talks to its backend when a sign-in is attempted, so mounting the kit
// with these is inert.
const DECANE_APP_ID = process.env.NEXT_PUBLIC_DECANE_APP_ID || "wsws-placeholder";
const DECANE_API_KEY = process.env.NEXT_PUBLIC_DECANE_API_KEY || "dck_test_placeholder";

// The chains the app holds value on, in Decane's social chain-id format. Keep
// in sync with EVM_NETWORKS in lib/server/alchemy.ts.
const DECANE_CHAINS = ["evm:8453", "evm:1", "evm:42161", "evm:10", "evm:137", "solana:mainnet"];

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  // Storage is undefined on the server, which makes the persister a no-op there,
  // so the same provider tree renders on both sides without a hydration mismatch.
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      key: RQ_PERSIST_KEY,
      throttleTime: 1000,
    })
  );
  return (
    <DecaneKit
      config={{
        appId: DECANE_APP_ID,
        mode: "social",
        theme: "dark",
        social: {
          apiKey: DECANE_API_KEY,
          authMethods: ["google", "email"],
          chains: DECANE_CHAINS,
          // Wallet recovery rotates the share set and must hand the user a
          // fresh recovery file; these bridge into the dialogs rendered by
          // DecaneRecoveryHost below. Without onRecoveryRotated the kit
          // refuses to run recovery at all.
          onRecoveryShareOffer: offerRecoveryShare,
          onRecoveryRotated: collectRotatedRecoveryPassword,
          onRecoveryFileReady: deliverRecoveryFile,
        },
      }}
    >
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
            {/* Syncs Mixpanel's identity to the auth session; needs to sit
                inside DecaneKit to read it. Renders nothing. */}
            <AnalyticsIdentity />
            <AnalyticsSegments />
            {/* Hands the Decane access-token getter to lib/auth-token so
                apiFetch can attach it. Renders nothing. */}
            <DecaneTokenBridge />
            {/* The wallet-recovery dialogs Decane's callbacks block on. */}
            <DecaneRecoveryHost />
            {/* Owns the Last Man Standing pop-out timer. Mounted here, above the
                pages, so the floating window survives navigating anywhere in
                the app; it only subscribes to game data while open. */}
            <MiniTimerHost />
          </BalanceVisibilityProvider>
        </NetworkStatusProvider>
        <Toaster />
      </PersistQueryClientProvider>
    </DecaneKit>
  );
}
