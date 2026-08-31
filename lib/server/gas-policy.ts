import "server-only";

// Which Alchemy Gas Manager policy sponsors a userOperation, per network.
//
// An Alchemy Bundler Sponsored Operations policy is scoped to a SINGLE network,
// so there is one policy id per sponsored chain — not one for the app. Both
// bundler proxies used to send a single `ALCHEMY_GAS_POLICY_ID` on every chain,
// on the stated belief that "one Gas Manager policy covers every chain listed
// here". It does not.
//
// Sending Base's policy id on Polygon means no policy applies to the request.
// The zero `maxFeePerGas` / `maxPriorityFeePerGas` / `preVerificationGas` that
// are Alchemy's sponsorship signal (see lib/trade/sponsor.ts) are then not a
// signal at all, just invalid numbers, and the bundler rejects the whole
// operation as "Invalid fields set on User Operation". That is what a user hit
// selling pUSD: the sell was built correctly, quoted correctly, and was refused
// before it ever reached the chain.
//
// A network listed here has its own policy and never falls back to the shared
// id — falling back is precisely the bug, and it fails opaquely at the bundler
// rather than at the point the configuration is wrong.
const POLICY_ENV_BY_NETWORK: Record<string, string> = {
  "polygon-mainnet": "ALCHEMY_POLYGON_GAS_POLICY_ID",
};

// Every other sponsored chain still reads the original shared id, so this
// change is additive: nothing that worked before resolves differently.
const SHARED_POLICY_ENV = "ALCHEMY_GAS_POLICY_ID";

// The policy id for a network, or undefined when that network has no
// sponsorship configured. Undefined must be REFUSED with that said plainly, not
// forwarded without the header: the embedded wallets hold no gas token, so an
// unsponsored send cannot succeed either, and the user is owed the real reason.
export function resolveGasPolicyId(
  network: string,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const dedicated = POLICY_ENV_BY_NETWORK[network];
  if (dedicated) return env[dedicated]?.trim() || undefined;
  return env[SHARED_POLICY_ENV]?.trim() || undefined;
}
