"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { getEmbeddedWallets } from "@/lib/user";
import { useFreshLegacySession } from "@/features/migrate/hooks/use-fresh-legacy-session";

// How long the wallet object may take to arrive after sign-in before the
// wallet window is judged blocked. Normally it lands within a second or two of
// the iframe initialising; a blocked iframe never lands at all.
const WALLET_WINDOW_GRACE_MS = 8_000;

/**
 * Whether this browser is refusing to load Privy's wallet window.
 *
 * The tell: the user is signed in to the legacy account, the account has an
 * embedded wallet (its ADDRESS is on the user record the moment sign-in lands),
 * but the wallet OBJECT — which only exists once the iframe has initialised —
 * still has not arrived after the grace. Without this the no-signer screen
 * had only two explanations, "sign in" and "wrong account", and a blocked
 * browser was wrongly told it was on the wrong account.
 *
 * Detects the block BEFORE a sweep is attempted, so the user is told what is
 * wrong instead of finding out from a failed transfer.
 */
export function useWalletWindowBlocked(): boolean {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const fresh = useFreshLegacySession();

  const hasEmbedded = getEmbeddedWallets(user).length > 0;
  const arrived = wallets.some((w) => w.walletClientType === "privy");
  const pending = fresh && ready && authenticated && hasEmbedded && !arrived;

  // Overdue flips in a timer, never synchronously; and it is cleared the
  // moment the wallet arrives (adjusting state during render is the
  // documented pattern for that).
  const [overdue, setOverdue] = useState(false);
  if (!pending && overdue) setOverdue(false);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setOverdue(true), WALLET_WINDOW_GRACE_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  return pending && overdue;
}
