import { NextResponse, type NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import { getSponsoredEvmChainByNetwork } from "@/lib/trade/sponsored-evm";
import { forwardEvmRpcRead } from "@/lib/server/evm-rpc";

<<<<<<< HEAD
// EVM JSON-RPC reads for the browser, routed through the server-only ZeroDev
// project so no provider credential is exposed to the client.
=======
// EVM JSON-RPC reads for the browser.
>>>>>>> 9768daf (fix(trade): HIP-3 margin auto-transfer, resilient reads, crypto-only rollout gate)
//
// Without this, viem's `http()` with no URL falls back to shared public RPCs.
// This route gives every supported chain one consistent provider for:
// prediction pool state and market structs, perp allowances, Polymarket
// collateral, and the eth_getCode/nonce reads in the sponsored 7702 send path.
//
// Upstream split: standard reads go to ZeroDev when ZERODEV_PROJECT_ID is
// set, with Alchemy as a live FALLBACK when ZeroDev errors or times out —
// writes (the sponsored bundler path) stay on Alchemy, so read bursts can
// never eat the compute budget the userOp send needs (observed live: a
// dashboard-load burst 429'd the very top-up the user had just clicked).
// A JSON-RPC error inside a 200 is a real answer (e.g. a revert) and never
// triggers the fallback; only transport failures and non-OK statuses do.
//
// Reads only. Signing and broadcast go through Privy and the bundler, never
// here, so nothing that reaches this endpoint can move funds.
//
// Auth-gated like the Solana and Polygon proxies.
// Privy's same-origin fetch carries the privy-token cookie, so the client needs
// no header plumbing.

<<<<<<< HEAD
=======
const UPSTREAM_TIMEOUT_MS = 15_000;

// Ordered upstreams: ZeroDev first when configured, Alchemy after it — as a
// runtime fallback when both exist, or the sole upstream when only one does.
function upstreamUrls(chain: { alchemyHost: string; chainId: number }): string[] {
  const urls: string[] = [];
  const zerodevProject = process.env.ZERODEV_PROJECT_ID;
  if (zerodevProject) {
    urls.push(`https://rpc.zerodev.app/api/v3/${zerodevProject}/chain/${chain.chainId}`);
  }
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (alchemyKey) urls.push(`https://${chain.alchemyHost}/v2/${alchemyKey}`);
  return urls;
}

>>>>>>> 9768daf (fix(trade): HIP-3 margin auto-transfer, resilient reads, crypto-only rollout gate)
// What the read paths actually call: state reads, the receipt poll
// (waitForTransactionReceipt), and gas estimation. Deliberately no
// eth_sendRawTransaction — an open write relay is exactly what this must not be.
const ALLOWED_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
]);

// viem batches reads, and a receipt poll can stack several. Generous enough not
// to reject a legitimate batch, bounded so this cannot be used to relay
// unbounded work.
const MAX_BATCH_CALLS = 100;

interface RpcCall {
  method?: unknown;
}

function methodsAllowed(body: unknown): boolean {
  const calls: RpcCall[] = Array.isArray(body) ? body : [body as RpcCall];
  if (calls.length === 0 || calls.length > MAX_BATCH_CALLS) return false;
  return calls.every((c) => typeof c?.method === "string" && ALLOWED_METHODS.has(c.method));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ network: string }> }) {
  const claims = await verifyRequest(req);
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The network comes from the URL, so it is resolved against the registry
  // rather than interpolated into a host. An unknown value never reaches fetch.
  const { network } = await ctx.params;
  const chain = getSponsoredEvmChainByNetwork(network);
  if (!chain) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

<<<<<<< HEAD
=======
  const upstreams = upstreamUrls(chain);
  if (upstreams.length === 0) {
    return NextResponse.json({ error: "EVM RPC is not configured" }, { status: 503 });
  }

>>>>>>> 9768daf (fix(trade): HIP-3 margin auto-transfer, resilient reads, crypto-only rollout gate)
  const body = await req.json().catch(() => null);
  if (!body || !methodsAllowed(body)) {
    // A bare 404 so the endpoint does not describe itself to anyone probing it.
    // The reason is logged instead: a rejected batch is otherwise
    // indistinguishable from a missing route at the call site.
    console.warn("EVM RPC proxy rejected a request:", {
      network,
      calls: Array.isArray(body) ? body.length : body ? 1 : 0,
      methods: Array.isArray(body)
        ? [...new Set(body.map((c: RpcCall) => String(c?.method)))]
        : [String((body as RpcCall | null)?.method)],
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

<<<<<<< HEAD
  try {
    const result = await forwardEvmRpcRead(chain, body);
    return NextResponse.json(result.payload, {
      status: result.status,
      headers: {
        "Cache-Control": "no-store",
        ...(result.retryAfter ? { "Retry-After": result.retryAfter } : {}),
      },
    });
  } catch (error) {
    console.error("EVM RPC proxy failed:", network, error);
    return NextResponse.json({ error: "ZeroDev EVM RPC unreachable" }, { status: 502 });
=======
  const payload = JSON.stringify(body);
  let lastError: unknown = null;
  for (const [index, upstream] of upstreams.entries()) {
    try {
      const res = await fetch(upstream, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: "no-store",
      });
      // A non-OK status is a provider problem (throttle, outage, bad
      // project) — try the next upstream. A JSON-RPC error inside a 200 is
      // a real answer (e.g. a revert) and passes through untouched.
      if (!res.ok && index < upstreams.length - 1) {
        console.warn("EVM RPC upstream unhealthy, failing over:", network, res.status);
        continue;
      }
      return new NextResponse(await res.text(), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      lastError = error;
      if (index < upstreams.length - 1) {
        console.warn("EVM RPC upstream failed, failing over:", network, error);
      }
    }
>>>>>>> 9768daf (fix(trade): HIP-3 margin auto-transfer, resilient reads, crypto-only rollout gate)
  }
  console.error("EVM RPC proxy failed on every upstream:", network, lastError);
  return NextResponse.json({ error: "EVM RPC unreachable" }, { status: 502 });
}
