import { NextResponse, type NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import { resolveGasPolicyId } from "@/lib/server/gas-policy";

// Server-side proxy for Alchemy's bundler/Gas Manager. Keeps the Alchemy key
// and the gas-sponsorship policy id off the client: the client only ever posts
// JSON-RPC bodies here, and this route stamps them with the real endpoint and
// policy header. Used for the EIP-7702 sponsored transaction flow (see
// lib/trade/sponsor.ts) so transactions never need the wallet to hold gas.
//
// A new chain is a line in this map AND its own Gas Manager policy. An Alchemy
// sponsorship policy is scoped to one network, so this map used to be paired
// with a single shared policy id on the belief that "one Gas Manager policy
// covers every chain listed here" — which is why sponsored Polygon sends were
// rejected outright. See lib/server/gas-policy.
const ALCHEMY_HOST: Record<string, string> = {
  base: "base-mainnet",
  polygon: "polygon-mainnet",
};

// Every JSON-RPC method this flow's viem bundler/public client can call. Kept
// tight so this route can't be used as a general-purpose paid RPC proxy: each
// call spends our Alchemy compute-unit budget, and eth_sendUserOperation spends
// our sponsorship budget too.
const ALLOWED_METHODS = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getTransactionCount",
  "eth_getCode",
  "eth_call",
  "eth_getTransactionReceipt",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_estimateUserOperationGas",
  "eth_sendUserOperation",
  "eth_getUserOperationReceipt",
  "eth_getUserOperationByHash",
  "eth_supportedEntryPoints",
]);

export async function POST(req: NextRequest) {
  const claims = await verifyRequest(req);
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defaults to Base so an older client that posts without a chain keeps
  // working through a deploy.
  const chain = req.nextUrl.searchParams.get("chain") ?? "base";
  const host = ALCHEMY_HOST[chain];
  if (!host) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const calls = Array.isArray(body) ? body : [body];
  for (const call of calls) {
    if (!call || typeof call.method !== "string" || !ALLOWED_METHODS.has(call.method)) {
      return NextResponse.json({ error: "Method not allowed" }, { status: 403 });
    }
  }

  // Only the sponsored send spends the policy; plain reads must not be gated on
  // one, or a chain without sponsorship loses its node reads too.
  const needsPolicy = calls.some((call) => call?.method === "eth_sendUserOperation");
  const policyId = resolveGasPolicyId(host);
  if (needsPolicy && !policyId) {
    return NextResponse.json(
      { error: `Gas sponsorship is not configured for ${host}` },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`https://${host}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(policyId ? { "x-alchemy-policy-id": policyId } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Base bundler proxy failed:", error);
    return NextResponse.json({ error: "Bundler request failed" }, { status: 502 });
  }
}
