"use client";

import { useCallback, useRef } from "react";
import { useCreateWallet, useHeadlessDelegatedActions, type User } from "@privy-io/react-auth";
import { useCreateWallet as useCreateSolanaWallet } from "@privy-io/react-auth/solana";
import { getWalletAddress, hasEmbeddedWallet, isWalletDelegated } from "@/lib/user";

// Whitelabel logins skip Privy's automatic wallet creation, so we provision
// the embedded wallets ourselves right after authentication and headlessly
// delegate them to allow server-side backend operations on behalf of each user.
export function useEnsureWallets() {
  const { createWallet: createEthereumWallet } = useCreateWallet();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();
  const { delegateWallet } = useHeadlessDelegatedActions();
  const running = useRef(false);

  return useCallback(
    async (user: User) => {
      if (running.current) return;
      running.current = true;
      try {
        let ethAddress = getWalletAddress(user, "ethereum");
        if (!hasEmbeddedWallet(user, "ethereum")) {
          const wallet = await createEthereumWallet();
          ethAddress = wallet?.address ?? null;
        }

        let solAddress = getWalletAddress(user, "solana");
        if (!hasEmbeddedWallet(user, "solana")) {
          const result = await createSolanaWallet();
          solAddress = result?.wallet?.address ?? null;
        }

        // Headlessly delegate wallets to the backend if not yet delegated
        if (ethAddress && !isWalletDelegated(user, "ethereum")) {
          try {
            await delegateWallet({ address: ethAddress, chainType: "ethereum" });
          } catch (delegateError) {
            console.error("Privy Ethereum wallet delegation failed:", delegateError);
          }
        }

        if (solAddress && !isWalletDelegated(user, "solana")) {
          try {
            await delegateWallet({ address: solAddress, chainType: "solana" });
          } catch (delegateError) {
            console.error("Privy Solana wallet delegation failed:", delegateError);
          }
        }
      } catch (error) {
        // A failed wallet creation or delegation should not strand the user
        // on the auth page. Privy retries provisioning on the next session.
        console.error("Embedded wallet provisioning failed:", error);
      } finally {
        running.current = false;
      }
    },
    [createEthereumWallet, createSolanaWallet, delegateWallet]
  );
}
