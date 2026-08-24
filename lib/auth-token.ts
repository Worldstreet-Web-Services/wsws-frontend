"use client";

import { resolveAuthTokens as resolvePrivyAuthTokens, type AuthTokens } from "@/lib/privy-token";

// The one place the transport gets its bearer token during the Privy to Decane
// migration window. A live Privy session wins: the gateway services behind our
// proxies (earn, trade, gas-sponsor) still verify Privy tokens upstream, so as
// long as the user holds a Privy session its token must be the one on the wire.
// The Decane token is used only when there is no Privy session, which is every
// session created after the auth cutover. Once the migration window closes and
// Privy is removed, this module collapses back into a single source.
//
// Decane's getAccessToken() is synchronous and lives on the kit's React
// context, so the provider tree registers it here at mount through
// registerDecaneTokenSource (see components/providers/decane-token-bridge.tsx).
// Decane has no identity-token equivalent; idToken is null for Decane sessions
// and routes resolve the user from the verified claims instead.

export type { AuthTokens };

type DecaneTokenSource = () => string | null;

let decaneTokenSource: DecaneTokenSource | null = null;

export function registerDecaneTokenSource(source: DecaneTokenSource | null): void {
  decaneTokenSource = source;
}

interface AuthTokenResolverDeps {
  resolvePrivyTokens: () => Promise<AuthTokens>;
  getDecaneToken: () => string | null;
}

// Builds the resolver over injected sources. The real one is exported below;
// tests build their own with fakes.
export function createAuthTokenResolver({
  resolvePrivyTokens,
  getDecaneToken,
}: AuthTokenResolverDeps): () => Promise<AuthTokens> {
  return async function resolveTokens(): Promise<AuthTokens> {
    let privy: AuthTokens = { accessToken: null, idToken: null };
    try {
      privy = await resolvePrivyTokens();
    } catch {
      // Privy's module-level getters can throw when no PrivyProvider is
      // mounted (everywhere but the legacy surfaces). That is not an error,
      // just the post-cutover normal; the Decane token below carries auth.
    }
    if (privy.accessToken) return privy;
    const decaneToken = getDecaneToken();
    if (decaneToken) return { accessToken: decaneToken, idToken: null };
    return { accessToken: null, idToken: null };
  };
}

// The app-wide resolver used by apiFetch.
export const resolveAuthTokens = createAuthTokenResolver({
  resolvePrivyTokens: resolvePrivyAuthTokens,
  getDecaneToken: () => (decaneTokenSource ? decaneTokenSource() : null),
});
