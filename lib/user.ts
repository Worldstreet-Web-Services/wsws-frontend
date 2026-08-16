import type { User } from "@privy-io/react-auth";

// What is left of the Privy user helpers after the Decane migration. Profile
// is provider-neutral and lives on via useAuthSession; the wallet accessors
// only serve the legacy routes that still read the OLD Privy wallets
// (/migrate and /prediction/reclaim). Delete them with the migration window.

export interface Profile {
  name: string;
  email: string;
  avatarSeed: string;
}

export interface EmbeddedWallet {
  address: string;
  chainType: "ethereum" | "solana";
}

export function getEmbeddedWallets(user: User | null): EmbeddedWallet[] {
  if (!user) return [];
  return user.linkedAccounts
    .filter(
      (a): a is Extract<typeof a, { type: "wallet" }> =>
        a.type === "wallet" && a.walletClientType === "privy"
    )
    .filter((a) => a.chainType === "ethereum" || a.chainType === "solana")
    .map((a) => ({ address: a.address, chainType: a.chainType as "ethereum" | "solana" }));
}

export function getWalletAddress(
  user: User | null,
  chainType: "ethereum" | "solana"
): string | null {
  return getEmbeddedWallets(user).find((w) => w.chainType === chainType)?.address ?? null;
}
