"use client";

import { useSocialAuth } from "decane-connect-kit";

// The Decane side of the migration: sign in (which mints the new embedded
// wallets on first sign-in) and expose the addresses assets are swept to.
// Only addresses are needed here; the sweep signs with the old Privy wallets,
// so the Decane session never has to be unlocked for signing.
export function useDecaneDestinations() {
  const auth = useSocialAuth();
  const evmAddress = auth.addresses?.evm ?? null;
  const solanaAddress = auth.addresses?.solana ?? null;
  return {
    // Both families must exist before anything is sent; a partial destination
    // set would strand one chain's assets at a wallet that never existed.
    ready: Boolean(evmAddress && solanaAddress),
    evmAddress,
    solanaAddress,
    creatingWallet: auth.isCreatingWallet,
    googleLoading: auth.googleLoading,
    emailLoading: auth.emailLoading,
    error: auth.error,
    clearError: auth.clearError,
    signInWithGoogle: auth.signInWithGoogle,
    sendEmailCode: auth.sendEmailCode,
    confirmEmailCode: auth.confirmEmailCode,
  };
}
