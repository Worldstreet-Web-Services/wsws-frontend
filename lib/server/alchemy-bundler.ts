import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import { getSponsoredEvmChainByNetwork } from "@/lib/trade/sponsored-evm";

const USER_OPERATION_METHODS = new Set([
  "eth_estimateUserOperationGas",
  "eth_sendUserOperation",
  "eth_getUserOperationReceipt",
  "eth_getUserOperationByHash",
  "eth_supportedEntryPoints",
  "pm_getPaymasterStubData",
  "pm_getPaymasterData",
]);
const SPONSORED_SEND_METHOD = "eth_sendUserOperation";
const PAYMASTER_METHODS = new Set(["pm_getPaymasterStubData", "pm_getPaymasterData"]);
const MAX_BATCH_CALLS = 100;

// What Alchemy answers, with a 429, once the account owning the key has used
// its monthly capacity. Unlike a throughput limit this does not clear on a
// retry; it clears on the next billing cycle or a plan change.
const MONTHLY_CAPACITY_EXHAUSTED = /monthly capacity limit exceeded/i;

// JSON-RPC "resource unavailable". viem retries 429s, LimitExceeded (-32005)
// and Internal (-32603); it surfaces this one at once, which is what an
// exhausted month deserves: four rapid retries cannot change the answer.
const RESOURCE_UNAVAILABLE = -32002;

const SPONSORSHIP_EXHAUSTED_MESSAGE =
  "Gas sponsorship is out of monthly capacity on the sponsoring account; sponsored transactions are paused until it is restored.";

// One JSON-RPC error per call the client sent, under the ids it sent, so a
// batch gets a batch back.
function exhaustedBody(calls: Array<RpcCall | null>, batch: boolean): unknown {
  const entries = calls.map((call) => ({
    jsonrpc: "2.0",
    id: call?.id ?? null,
    error: { code: RESOURCE_UNAVAILABLE, message: SPONSORSHIP_EXHAUSTED_MESSAGE },
  }));
  return batch ? entries : entries[0];
}

interface RpcCall {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: unknown[];
}

// The Gas Manager policy is scoped to the Alchemy account owning this key, so
// sponsorship reads ALCHEMY_API_KEY and nothing else.
//
// There used to be an ALCHEMY_GAS_MANAGER_API_KEY read ahead of this one, for
// a policy-owning key on a separate account from the portfolio reads. It was
// preferred silently, so when the account behind it ran out of monthly
// capacity, rotating ALCHEMY_API_KEY fixed nothing and every sponsored call
// kept 429ing. Restore that indirection only alongside a way to tell which key
// is in play, and never leave it set to a key that is not the policy's.
function primaryAlchemyKey(): string | null {
  return process.env.ALCHEMY_API_KEY?.trim() || null;
}

function withPaymasterPolicy(call: RpcCall, policyId: string): RpcCall {
  if (!PAYMASTER_METHODS.has(call.method)) return call;

  const params = Array.isArray(call.params) ? [...call.params] : [];
  const currentContext = params[3];
  params[3] = {
    ...(currentContext && typeof currentContext === "object" && !Array.isArray(currentContext)
      ? currentContext
      : {}),
    policyId,
  };
  return { ...call, params };
}

export async function forwardAlchemyBundlerRequest(req: NextRequest, network: string) {
  const claims = await verifyRequest(req);
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = getSponsoredEvmChainByNetwork(network);
  if (!target?.gasPolicy) {
    return NextResponse.json({ error: "Unsupported sponsored network" }, { status: 404 });
  }

  const apiKey = primaryAlchemyKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Alchemy API key is missing" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const calls = (Array.isArray(body) ? body : [body]) as Array<RpcCall | null>;
  if (
    calls.length === 0 ||
    calls.length > MAX_BATCH_CALLS ||
    calls.some(
      (call) => !call || typeof call.method !== "string" || !USER_OPERATION_METHODS.has(call.method)
    )
  ) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 403 });
  }

  const bsoPolicyId = process.env.ALCHEMY_GAS_POLICY_ID?.trim();
  const polygonPolicyId = process.env.ALCHEMY_POLYGON_GAS_POLICY_ID?.trim();
  const needsPaymasterPolicy =
    target.sponsorshipMode === "paymaster" &&
    calls.some((call) => Boolean(call && PAYMASTER_METHODS.has(call.method)));
  const needsBsoPolicy =
    target.sponsorshipMode === "bso" &&
    calls.some((call) => call?.method === SPONSORED_SEND_METHOD);

  if (needsPaymasterPolicy && !polygonPolicyId) {
    return NextResponse.json(
      { error: "Polygon gas sponsorship policy is missing" },
      { status: 424 }
    );
  }
  if (needsBsoPolicy && !bsoPolicyId) {
    return NextResponse.json({ error: "Alchemy gas policy is missing" }, { status: 503 });
  }

  const attachPaymasterPolicy = (call: RpcCall | null): RpcCall | null =>
    call && needsPaymasterPolicy && polygonPolicyId
      ? withPaymasterPolicy(call, polygonPolicyId)
      : call;
  const upstreamBody = Array.isArray(body)
    ? calls.map(attachPaymasterPolicy)
    : attachPaymasterPolicy(calls[0]);

  try {
    // A Gas Manager policy is scoped to the Alchemy account owning this key.
    // Never rotate this request through ALCHEMY_API_KEY_FALLBACK.
    const response = await fetch(`https://${target.alchemyHost}/v2/${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(needsBsoPolicy && bsoPolicyId ? { "x-alchemy-policy-id": bsoPolicyId } : {}),
      },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const text = await response.text();
    if (response.status === 429 && MONTHLY_CAPACITY_EXHAUSTED.test(text)) {
      // The one condition here that is an operations alarm, not weather: no
      // sponsored transaction will succeed until the Alchemy account behind
      // ALCHEMY_API_KEY has capacity again. Logged so it is seen, and answered
      // in a form the client shows honestly instead of retrying.
      console.error(
        `Alchemy sponsorship for ${network}: monthly capacity exhausted on the policy's account`,
        text.slice(0, 300)
      );
      return NextResponse.json(exhaustedBody(calls, Array.isArray(body)), {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(response.headers.get("retry-after")
          ? { "Retry-After": response.headers.get("retry-after") as string }
          : {}),
      },
    });
  } catch (error) {
    console.error(`Alchemy bundler proxy failed for ${network}:`, error);
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut ? "Alchemy bundler timed out" : "Alchemy bundler is unavailable",
        provider: "alchemy",
        retryable: true,
      },
      { status: timedOut ? 504 : 502, headers: { "Retry-After": "5" } }
    );
  }
}
