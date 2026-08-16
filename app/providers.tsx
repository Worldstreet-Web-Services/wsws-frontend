"use client";

import { useState } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { DecaneKit } from "decane-connect-kit";
import { createSolanaRpcSubscriptions } from "@solana/kit";
import { createAppSolanaRpc } from "@/lib/solana-rpc";
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
import { BalanceVisibilityProvider } from "@/components/ui/balance-visibility";
import { MiniTimerHost } from "@/features/casino";

// Well-formed placeholder lets the app build before env vars are set.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cl0123456789abcdefghijklm";

// Placeholders for the same reason. Decane only talks to its backend when a
// sign-in is attempted, so mounting the kit with these is inert.
const DECANE_APP_ID = process.env.NEXT_PUBLIC_DECANE_APP_ID || "wsws-placeholder";
const DECANE_API_KEY = process.env.NEXT_PUBLIC_DECANE_API_KEY || "dck_test_placeholder";

// The chains the app holds value on, in Decane's social chain-id format. Keep
// in sync with EVM_NETWORKS in lib/server/alchemy.ts.
const DECANE_CHAINS = ["evm:8453", "evm:1", "evm:42161", "evm:10", "evm:137", "solana:mainnet"];

type SolanaRpcs = NonNullable<NonNullable<PrivyClientConfig["solana"]>["rpcs"]>;
type SolanaRpcEntry = NonNullable<SolanaRpcs[keyof SolanaRpcs]>;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  // Without this Privy has nowhere to broadcast a Solana transaction and every
  // Solana signature fails with "No RPC configuration found for chain
  // solana:mainnet". Reads and sends go through our proxy; the subscription
  // endpoint is only consulted when waiting for confirmation, which we skip
  // (optimisticBroadcast) and do ourselves against the same proxy.
  const [solanaRpcs] = useState<SolanaRpcs>(() => ({
    "solana:mainnet": {
      // Privy declares this against the test-cluster RPC API, which includes
      // requestAirdrop — a method mainnet does not have. The client is right;
      // only the declaration is too narrow.
      rpc: createAppSolanaRpc() as SolanaRpcEntry["rpc"],
      rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.mainnet-beta.solana.com"),
      blockExplorerUrl: "https://explorer.solana.com",
    },
  }));
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
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "twitter", "email", "passkey"],
        embeddedWallets: {
          // Sign and send under the hood — no confirmation modal. The app
          // abstracts web3 away, so transactions (RWA buys, vault wagers,
          // swaps, deposits) go through without a Privy approval prompt. Can be
          // overridden per call with uiOptions.showWalletUIs when a specific
          // action ever needs an explicit confirmation.
          showWalletUIs: false,
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        solana: { rpcs: solanaRpcs },
        appearance: {
          walletChainType: "ethereum-and-solana",
          // Login modal only — tx signing stays headless (showWalletUIs: false).
          theme: "#0c0c0e",
          accentColor: "#d4d4d8",
          // Root-relative, not `${window.location.origin}/…`. That branch made
          // the logo undefined on the server and a string on the client, so
          // Privy's hidden preload <img> existed only in the client render and
          // every page load failed hydration. The browser resolves this against
          // the current origin anyway, which is all the branch was computing.
          logo: "/ark-logo.svg",
        },
      }}
    >
      <DecaneKit
        config={{
          appId: DECANE_APP_ID,
          mode: "social",
          theme: "dark",
          social: {
            apiKey: DECANE_API_KEY,
            authMethods: ["google", "email"],
            chains: DECANE_CHAINS,
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
              {/* Syncs Mixpanel's identity to Privy auth state; needs to sit
                inside PrivyProvider to read it. Renders nothing. */}
              <AnalyticsIdentity />
              <AnalyticsSegments />
              {/* Hands the Decane access-token getter to lib/auth-token so
                apiFetch can attach it. Renders nothing. */}
              <DecaneTokenBridge />
              {/* Owns the Last Man Standing pop-out timer. Mounted here, above the
                pages, so the floating window survives navigating anywhere in
                the app; it only subscribes to game data while open. */}
              <MiniTimerHost />
            </BalanceVisibilityProvider>
          </NetworkStatusProvider>
          <Toaster />
        </PersistQueryClientProvider>
      </DecaneKit>
    </PrivyProvider>
  );
}
