"use client";

import { createContext, useContext } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getWalletAddress } from "@/lib/user";
import type { ServerSession } from "@/lib/session";

const ServerSessionContext = createContext<ServerSession | null>(null);

// Holds what the server verified about the session, for the moment before
// Privy's browser SDK has caught up. Provided by the (app) layout, which reads
// the cookie; null anywhere the server had no session to vouch for.
export function ServerSessionProvider({
  session,
  children,
}: {
  session: ServerSession | null;
  children: React.ReactNode;
}) {
  return <ServerSessionContext.Provider value={session}>{children}</ServerSessionContext.Provider>;
}

export function useServerSession(): ServerSession | null {
  return useContext(ServerSessionContext);
}

// The session's embedded wallet on a chain. Privy is the authority once it is
// ready: it reflects a sign-out or a new sign-in the moment they happen. Until
// then the server's answer stands in, which is the same wallet, read from the
// same account, a moment earlier. Null when neither knows of one.
export function useSessionWallet(chain: "ethereum" | "solana"): string | null {
  const { user } = usePrivy();
  const server = useServerSession();
  return getWalletAddress(user, chain) ?? server?.wallets[chain] ?? null;
}
