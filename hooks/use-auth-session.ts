"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSocialAuth } from "decane-connect-kit";
import type { Profile } from "@/lib/user";

// The app's one auth seam. Everything that used to read Privy's usePrivy()
// for { ready, authenticated, user } reads this instead, backed by the Decane
// session. Wallet addresses come straight off the session; there is no user
// object to resolve.

export interface AuthSession {
  ready: boolean;
  authenticated: boolean;
  evmAddress: string | null;
  solanaAddress: string | null;
  profile: Profile;
  logout: () => Promise<void>;
}

// The kit persists a signed-in identity under this localStorage prefix (the
// full key ends in a slice of the API key). It hydrates that identity
// asynchronously, after SDK init, and exposes no "ready" flag, so this is the
// only way to tell "still hydrating a known user" from "signed out". Coupled
// to the kit's storage layout on purpose; revisit on kit upgrades.
const DECANE_IDENTITY_KEY_PREFIX = "decane:social:";

function hasPersistedIdentity(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DECANE_IDENTITY_KEY_PREFIX) && localStorage.getItem(key)) return true;
    }
  } catch {
    // Storage blocked: treat as no identity, the sign-in page still works.
  }
  return false;
}

// If SDK init hangs (network, bad key), stop holding the loading screen and
// let the guard route to sign-in; a stuck spinner helps nobody.
const HYDRATION_GRACE_MS = 8_000;

const emptySubscribe = () => () => {};

export function useAuthSession(): AuthSession {
  const social = useSocialAuth();
  // Server renders have no localStorage, so both sides render "not ready"
  // first and the client flips after hydration; useSyncExternalStore is the
  // mismatch-safe way to express that.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [graceOver, setGraceOver] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setGraceOver(true), HYDRATION_GRACE_MS);
    return () => clearTimeout(timer);
  }, []);

  const evmAddress = social.addresses?.evm ?? null;
  const solanaAddress = social.addresses?.solana ?? null;
  const authenticated = social.addresses !== null && Boolean(evmAddress);

  return {
    ready: mounted && (authenticated || graceOver || !hasPersistedIdentity()),
    authenticated,
    evmAddress,
    solanaAddress,
    // Decane exposes no email or display name, only addresses, so the profile
    // is address-derived. Screens that showed the Privy email now show the
    // wallet identity.
    profile: {
      name: "World Street user",
      email: "",
      avatarSeed: evmAddress ?? "worldstreet",
    },
    logout: social.disconnect,
  };
}
