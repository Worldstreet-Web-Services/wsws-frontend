import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import {
  getSponsoredEvmChainByNetwork,
  type SponsoredEvmChainConfig,
} from "@/lib/trade/sponsored-evm";

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

// Alchemy reports exhausted sponsorship capacity either as a 429 account cap
// or as a 200 JSON-RPC paymaster refusal. Neither condition clears on retry.
const SPONSORSHIP_CAPACITY_EXHAUSTED =
  /monthly capacity limit exceeded|over your gas sponsorship limit/i;

// JSON-RPC "resource unavailable". viem retries 429s, LimitExceeded (-32005)
// and Internal (-32603); it surfaces this one at once, which is what an
// exhausted month deserves: four rapid retries cannot change the answer.
const RESOURCE_UNAVAILABLE = -32002;

const SPONSORSHIP_EXHAUSTED_MESSAGE =
  "Gas sponsorship capacity is exhausted on the sponsoring account; sponsored transactions are paused until the policy limit or gas credits are restored.";

// One JSON-RPC error per call the client sent, under the ids it sent, so a
// batch gets a batch back.
// A JSON-RPC error inside a 2xx is how the bundler reports a rejected user
// operation, a paymaster refusal or a simulation revert. Relayed silently,
// the only record of why a sponsored send failed was a toast in one user's
// browser. Logged here with the method it answered, the code and the message;
// no addresses, no calldata.
function logRpcErrors(network: string, calls: Array<RpcCall | null>, text: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return;
  }
  const methodById = new Map<string, string>();
  for (const call of calls) if (call) methodById.set(String(call.id ?? ""), call.method);
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  for (const entry of entries) {
    const error = (entry as { id?: unknown; error?: { code?: unknown; message?: unknown } })?.error;
    if (!error) continue;
    const id = String((entry as { id?: unknown }).id ?? "");
    const method = methodById.get(id) ?? calls[0]?.method ?? "unknown";
    console.warn(
      `Alchemy bundler ${network}: ${method} answered an error`,
      typeof error.code === "number" ? error.code : null,
      typeof error.message === "string" ? error.message.slice(0, 300) : ""
    );
  }
}

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

// The Gas Manager policy is scoped to the Alchemy account owning the RPC app.
// Polygon has a dedicated app because its prediction-market traffic and policy
// must not share capacity with Base. The Polygon setting accepts either the
// complete RPC URL or just its Alchemy API key for compatibility with existing
// deployment configuration.
//
// There used to be an ALCHEMY_GAS_MANAGER_API_KEY read ahead of this one, for
// a policy-owning key on a separate account from the portfolio reads. It was
// preferred silently, so when the account behind it ran out of monthly
// capacity, rotating ALCHEMY_API_KEY fixed nothing and every sponsored call
// kept 429ing. Restore that indirection only alongside a way to tell which key
// is in play, and never leave it set to a key that is not the policy's.
function firstConfiguredValue(raw: string | undefined): string | null {
  return (
    raw
      ?.split(",")
      .map((value) => value.trim())
      .find(Boolean) || null
  );
}

function alchemyBundlerUrlFor(target: SponsoredEvmChainConfig): string | null {
  const configured = firstConfiguredValue(
    target.network === "polygon-mainnet"
      ? process.env.ALCHEMY_POLYGON_RPC_URL
      : process.env.ALCHEMY_API_KEY
  );
  if (!configured) return null;

  if (/^https:\/\//i.test(configured)) return configured.replace(/\/$/, "");
  return `https://${target.alchemyHost}/v2/${configured}`;
}

// The policy a paymaster-mode network sponsors under. Polygon keeps the
// variable it launched with; every other paymaster network, Base since
// ADR-2026-09-06-base-sponsorship-via-paymaster, uses the shared one. Base
// moved here because the team's policy is a paymaster-type policy, which the
// bundler header path answers with "does not support bundler sponsorship".
function paymasterPolicyIdFor(target: SponsoredEvmChainConfig): string | undefined {
  const raw =
    target.network === "polygon-mainnet"
      ? process.env.ALCHEMY_POLYGON_GAS_POLICY_ID
      : process.env.ALCHEMY_GAS_POLICY_ID;
  return firstConfiguredValue(raw) || undefined;
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

  const bundlerUrl = alchemyBundlerUrlFor(target);
  if (!bundlerUrl) {
    const variable =
      target.network === "polygon-mainnet" ? "ALCHEMY_POLYGON_RPC_URL" : "ALCHEMY_API_KEY";
    return NextResponse.json({ error: `${variable} is missing` }, { status: 503 });
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

  const bsoPolicyId = firstConfiguredValue(process.env.ALCHEMY_GAS_POLICY_ID);
  const paymasterPolicyId = paymasterPolicyIdFor(target);
  const needsPaymasterPolicy =
    target.sponsorshipMode === "paymaster" &&
    calls.some((call) => Boolean(call && PAYMASTER_METHODS.has(call.method)));
  const needsBsoPolicy =
    target.sponsorshipMode === "bso" &&
    calls.some((call) => call?.method === SPONSORED_SEND_METHOD);

  if (needsPaymasterPolicy && !paymasterPolicyId) {
    return NextResponse.json(
      { error: `Gas sponsorship policy for ${network} is missing` },
      { status: 424 }
    );
  }
  if (needsBsoPolicy && !bsoPolicyId) {
    return NextResponse.json({ error: "Alchemy gas policy is missing" }, { status: 503 });
  }

  const attachPaymasterPolicy = (call: RpcCall | null): RpcCall | null =>
    call && needsPaymasterPolicy && paymasterPolicyId
      ? withPaymasterPolicy(call, paymasterPolicyId)
      : call;
  const upstreamBody = Array.isArray(body)
    ? calls.map(attachPaymasterPolicy)
    : attachPaymasterPolicy(calls[0]);

  try {
    // A Gas Manager policy is scoped to the Alchemy account owning this key.
    // Never rotate this request through ALCHEMY_API_KEY_FALLBACK.
    const response = await fetch(bundlerUrl, {
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
    if (SPONSORSHIP_CAPACITY_EXHAUSTED.test(text)) {
      // The one condition here that is an operations alarm, not weather: no
      // sponsored transaction will succeed until the Alchemy account behind
      // this network's key-policy pair has capacity again. Logged so it is
      // seen, and answered in a form the client shows instead of retrying.
      console.error(
        `Alchemy sponsorship for ${network}: monthly capacity exhausted on the policy's account`,
        text.slice(0, 300)
      );
      return NextResponse.json(exhaustedBody(calls, Array.isArray(body)), {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    logRpcErrors(network, calls, text);
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
