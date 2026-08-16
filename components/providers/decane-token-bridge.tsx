"use client";

import { useEffect } from "react";
import { useSocialWallet } from "decane-connect-kit";
import { registerDecaneTokenSource } from "@/lib/auth-token";

// Hands the Decane session's access-token getter to the transport layer, so
// apiFetch (a plain module, no React context) can attach the token. Renders
// nothing; must sit inside DecaneKit to read the session.
export function DecaneTokenBridge() {
  const { getAccessToken } = useSocialWallet();
  useEffect(() => {
    registerDecaneTokenSource(getAccessToken);
    return () => registerDecaneTokenSource(null);
  }, [getAccessToken]);
  return null;
}
