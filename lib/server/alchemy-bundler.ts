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
// The BSO policy header goes on BOTH the estimate and the send. Alchemy's BSO
// docs only mention the send, but the live bundler rejects a zero-fee
// eth_estimateUserOperationGas that arrives without the policy context —
// captured verbatim: "Invalid fields set on User Operation ... User
// operation must include a paymaster for sponsorship." Every sponsored
// action estimates before sending, so a header-less estimate kills the
// whole flow before the send is ever attempted.
const BSO_POLICY_METHODS = new Set([SPONSORED_SEND_METHOD, "eth_estimateUserOperationGas"]);
const MAX_BATCH_CALLS = 100;

interface RpcCall {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: unknown[];
}

function splitList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

interface BundlerPair {
  key: string;
  bsoPolicy?: string;
  polygonPolicy?: string;
}

/**
 * Ordered (key, policy) pairs the request rotates through until one is
 * accepted. A key or policy variable may hold a single value OR a
 * comma-separated list, so a pool is given either as one entry per variable or
 * several inside one variable. Keys and policies are paired BY INDEX because an
 * Alchemy Gas Manager policy is scoped to the account that owns the key — key
 * #N only works with policy #N — so the lists MUST be kept in the same account
 * order. `ALCHEMY_GAS_MANAGER_API_KEY` still wins over `ALCHEMY_API_KEY` when
 * present, so a dedicated bundler key stays possible.
 */
function alchemyBundlerPairs(): BundlerPair[] {
  const keys = splitList(process.env.ALCHEMY_GAS_MANAGER_API_KEY || process.env.ALCHEMY_API_KEY);
  const bsoPolicies = splitList(process.env.ALCHEMY_GAS_POLICY_ID);
  const polygonPolicies = splitList(process.env.ALCHEMY_POLYGON_GAS_POLICY_ID);
  return keys.map((key, index) => ({
    key,
    bsoPolicy: bsoPolicies[index],
    polygonPolicy: polygonPolicies[index],
  }));
}

/**
 * Whether a response means this key/policy was rejected BEFORE the user
 * operation was submitted, so advancing to the next pair cannot double-submit.
 * Auth/quota rejections qualify — an invalid or exhausted key never reaches
 * execution. A 2xx, or a genuine JSON-RPC bundler error (a replacement being
 * underpriced, insufficient funds), does NOT: that pair worked and its answer
 * must reach the caller rather than being retried against another key.
 */
function rejectedBeforeSubmit(status: number, body: string): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  // All PRE-submission (nothing ran, so advancing to the next pair is safe):
  //  - the key itself is rejected (auth / bad / comma-joined key);
  //  - the paired policy is the WRONG TYPE for this flow ("does not support
  //    bundler sponsorship" — e.g. a paymaster/Gas-Manager policy where a BSO
  //    one is required), or its zero-fee context reads as "invalid" / "must
  //    include a paymaster";
  //  - the paired policy is a valid BSO policy but its spend cap is exhausted
  //    ("put your team over ... budget").
  // Advancing past each finds the pair whose account owns a funded BSO policy,
  // instead of stopping on the first, mistyped, or over-budget one.
  return /must be authenticated|not a valid request object|invalid api key|unauthorized|invalid fields set on user operation|must include a paymaster|does not support bundler sponsorship|put your team over|over your monthly budget|exceeds your monthly/i.test(
    body
  );
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

  const pairs = alchemyBundlerPairs();
  if (pairs.length === 0) {
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

  const needsPaymasterPolicy =
    target.sponsorshipMode === "paymaster" &&
    calls.some((call) => Boolean(call && PAYMASTER_METHODS.has(call.method)));
  const needsBsoPolicy =
    target.sponsorshipMode === "bso" &&
    calls.some((call) => Boolean(call && BSO_POLICY_METHODS.has(call.method)));

  // Only pairs that carry the policy THIS request needs can serve it; pairing
  // is by index, so a pair whose matching policy slot is blank is skipped
  // rather than sent policy-less (which the bundler would reject anyway).
  const pool = pairs.filter((pair) =>
    needsPaymasterPolicy
      ? Boolean(pair.polygonPolicy)
      : needsBsoPolicy
        ? Boolean(pair.bsoPolicy)
        : true
  );
  if (needsPaymasterPolicy && pool.length === 0) {
    return NextResponse.json(
      { error: "Polygon gas sponsorship policy is missing" },
      { status: 424 }
    );
  }
  if (needsBsoPolicy && pool.length === 0) {
    return NextResponse.json({ error: "Alchemy gas policy is missing" }, { status: 503 });
  }

  // A JSON-RPC error from the bundler (schema rejection, paused policy,
  // exhausted budget) otherwise passes through invisibly and surfaces only as a
  // truncated toast — log the full detail server-side so the dev terminal shows
  // exactly what Alchemy objected to.
  const logRpcErrors = (text: string): void => {
    try {
      const data = JSON.parse(text);
      for (const item of Array.isArray(data) ? data : [data]) {
        const rpcError = (item as { error?: { code?: number; message?: string } })?.error;
        if (rpcError) {
          console.error(
            `Alchemy bundler RPC error on ${network} (${calls.map((c) => c?.method).join(",")}):`,
            JSON.stringify(rpcError)
          );
        }
      }
    } catch {
      // Non-JSON body — nothing to introspect.
    }
  };

  // Walk the pool until a pair is ACCEPTED. Advancing only ever happens on a
  // pre-submission rejection (see rejectedBeforeSubmit), so a sponsored send is
  // never retried after it could already have reached execution. Each pair uses
  // its OWN policy (key #N with policy #N) — the account-scoping the previous
  // single-key design worried about is respected, just across the whole list.
  let last: NextResponse | null = null;
  for (const pair of pool) {
    const attachPaymasterPolicy = (call: RpcCall | null): RpcCall | null =>
      call && needsPaymasterPolicy && pair.polygonPolicy
        ? withPaymasterPolicy(call, pair.polygonPolicy)
        : call;
    const upstreamBody = Array.isArray(body)
      ? calls.map(attachPaymasterPolicy)
      : attachPaymasterPolicy(calls[0]);

    try {
      const response = await fetch(`https://${target.alchemyHost}/v2/${pair.key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(needsBsoPolicy && pair.bsoPolicy ? { "x-alchemy-policy-id": pair.bsoPolicy } : {}),
        },
        body: JSON.stringify(upstreamBody),
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      const text = await response.text();
      logRpcErrors(text);
      const forwarded = new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...(response.headers.get("retry-after")
            ? { "Retry-After": response.headers.get("retry-after") as string }
            : {}),
        },
      });
      if (!rejectedBeforeSubmit(response.status, text)) return forwarded;
      // This key was rejected before the op ran — remember it, try the next.
      last = forwarded;
    } catch (error) {
      // Network fault or timeout: nothing was submitted, so the next pair is
      // safe to try. Keep the shaped error in case every pair fails.
      console.error(`Alchemy bundler proxy failed for ${network}:`, error);
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      last = NextResponse.json(
        {
          error: timedOut ? "Alchemy bundler timed out" : "Alchemy bundler is unavailable",
          provider: "alchemy",
          retryable: true,
        },
        { status: timedOut ? 504 : 502, headers: { "Retry-After": "5" } }
      );
    }
  }

  return (
    last ??
    NextResponse.json(
      { error: "Alchemy bundler is unavailable", provider: "alchemy", retryable: true },
      { status: 502, headers: { "Retry-After": "5" } }
    )
  );
}
