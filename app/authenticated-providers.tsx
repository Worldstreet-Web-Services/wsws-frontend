"use client";

import { useState, type ReactNode } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { createSolanaRpcSubscriptions } from "@solana/kit";
import { AnalyticsIdentity } from "@/components/providers/analytics-identity";
import { AnalyticsSegments } from "@/components/providers/analytics-segments";
import { MiniTimerHost } from "@/features/casino";
import { RwaSettlementTracker } from "@/features/rwa/components/rwa-settlement-tracker";
import { RwasPurchaseTracker } from "@/features/rwas/components/rwas-purchase-tracker";
import { createAppSolanaRpc } from "@/lib/solana-rpc";
import { DataProviders } from "./data-providers";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

type SolanaRpcs = NonNullable<NonNullable<PrivyClientConfig["solana"]>["rpcs"]>;
type SolanaRpcEntry = NonNullable<SolanaRpcs[keyof SolanaRpcs]>;

function ConfiguredPrivyProviders({ appId, children }: { appId: string; children: ReactNode }) {
  // Privy needs both RPC clients to broadcast Solana transactions. Application
  // reads and sends use our proxy; confirmation is handled separately.
  const [solanaRpcs] = useState<SolanaRpcs>(() => ({
    "solana:mainnet": {
      // Privy's declaration includes test-cluster methods that mainnet omits,
      // so the runtime-compatible client needs this narrow type adaptation.
      rpc: createAppSolanaRpc() as SolanaRpcEntry["rpc"],
      rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.mainnet-beta.solana.com"),
      blockExplorerUrl: "https://explorer.solana.com",
    },
  }));

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google", "twitter", "email", "passkey"],
        embeddedWallets: {
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
          theme: "#0c0c0e",
          accentColor: "#d4d4d8",
          logo: "/ark-logo.svg",
        },
      }}
    >
      <DataProviders
        addons={
          <>
            <AnalyticsIdentity />
            <AnalyticsSegments />
            <MiniTimerHost />
            <RwaSettlementTracker />
            <RwasPurchaseTracker />
          </>
        }
      >
        {children}
      </DataProviders>
    </PrivyProvider>
  );
}

export default function AuthenticatedProviders({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return (
      <DataProviders>
        <main className="grid min-h-screen place-items-center bg-black px-6 text-center text-white">
          <div>
            <h1 className="text-lg font-semibold">Authentication is not configured</h1>
            <p className="mt-2 text-sm text-white/60">
              Set NEXT_PUBLIC_PRIVY_APP_ID before starting the application.
            </p>
          </div>
        </main>
      </DataProviders>
    );
  }

  return <ConfiguredPrivyProviders appId={PRIVY_APP_ID}>{children}</ConfiguredPrivyProviders>;
}
