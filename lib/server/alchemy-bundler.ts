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
// The policy header goes on BOTH the estimate and the send. Alchemy's BSO docs
// mention only the send, but the live bundler rejects a zero-fee
// eth_estimateUserOperationGas that arrives without the policy context, quoted
// verbatim: "Invalid fields set on User Operation ... User operation must
// include a paymaster for sponsorship." Every sponsored action estimates before
// sending, so a header-less estimate kills the flow before the send is tried.
const SPONSORED_METHODS = new Set(["eth_sendUserOperation", "eth_estimateUserOperationGas"]);
const PAYMASTER_METHODS = new Set(["pm_getPaymasterStubData", "pm_getPaymasterData"]);
const MAX_BATCH_CALLS = 100;

interface RpcCall {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: unknown[];
}

interface AlchemySponsorCredential {
  apiKey: string;
  policyId?: string;
}

function strictCommaList(value: string | undefined): string[] | null {
  if (!value?.trim()) return [];
  const values = value.split(",").map((item) => item.trim());
  return values.every(Boolean) ? values : null;
}

function sponsorCredentials(
  policyIds: string | undefined,
  policyRequired: boolean
): AlchemySponsorCredential[] | null {
  const policies = strictCommaList(policyIds);
  if (policyRequired && !policies?.length) return null;

  const keyLists = [process.env.ALCHEMY_GAS_MANAGER_API_KEY, process.env.ALCHEMY_API_KEY]
    .map(strictCommaList)
    .filter((keys): keys is string[] => Boolean(keys?.length));
  const keys = policyRequired
    ? keyLists.find((candidate) => candidate.length === policies?.length)
    : keyLists[0];
  if (!keys) return null;

  return keys.map((apiKey, index) => ({ apiKey, policyId: policies?.[index] }));
}

function retryableStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

function retryableRpcFailure(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    const errors = (Array.isArray(parsed) ? parsed : [parsed])
      .map((item) => (item as { error?: { message?: unknown } })?.error)
      .filter(Boolean);
    return (
      errors.length > 0 &&
      errors.every((error) =>
        /unauthori|forbidden|invalid api key|policy.+not found|rate.?limit|too many requests|quota|credit|capacity|temporar|unavailable/i.test(
          String(error?.message ?? JSON.stringify(error))
        )
      )
    );
  } catch {
    return false;
  }
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
    calls.some((call) => Boolean(call && SPONSORED_METHODS.has(call.method)));
  const policyRequired = needsPaymasterPolicy || needsBsoPolicy;
  const policyIds = target.sponsorshipMode === "paymaster" ? polygonPolicyId : bsoPolicyId;

  if (needsPaymasterPolicy && !policyIds) {
    return NextResponse.json(
      { error: "Polygon gas sponsorship policy is missing" },
      { status: 424 }
    );
  }
  if (needsBsoPolicy && !policyIds) {
    return NextResponse.json({ error: "Alchemy gas policy is missing" }, { status: 503 });
  }

  const credentials = sponsorCredentials(policyIds, policyRequired);
  if (!credentials) {
    return NextResponse.json(
      {
        error: policyRequired
          ? "Alchemy API keys and gas policy IDs must be non-empty comma-separated lists of equal length"
          : "Alchemy API key is missing",
      },
      { status: 503 }
    );
  }

  const includesSubmission = calls.some((call) => call?.method === "eth_sendUserOperation");
  let lastResponse: Response | null = null;
  let lastBody = "";
  let lastError: unknown;

  for (const [index, credential] of credentials.entries()) {
    const attachPaymasterPolicy = (call: RpcCall | null): RpcCall | null =>
      call && needsPaymasterPolicy && credential.policyId
        ? withPaymasterPolicy(call, credential.policyId)
        : call;
    const upstreamBody = Array.isArray(body)
      ? calls.map(attachPaymasterPolicy)
      : attachPaymasterPolicy(calls[0]);

    try {
      const response = await fetch(`https://${target.alchemyHost}/v2/${credential.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(needsBsoPolicy && credential.policyId
            ? { "x-alchemy-policy-id": credential.policyId }
            : {}),
        },
        body: JSON.stringify(upstreamBody),
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      const responseBody = await response.text();
      lastResponse = response;
      lastBody = responseBody;

      const hasNext = index + 1 < credentials.length;
      const shouldRetry =
        hasNext &&
        (retryableRpcFailure(responseBody) ||
          (retryableStatus(response.status) &&
            (!includesSubmission || [401, 403, 429].includes(response.status))));
      if (shouldRetry) continue;

      try {
        const parsed = JSON.parse(responseBody);
        for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
          const rpcError = (item as { error?: unknown })?.error;
          if (rpcError) {
            console.error(
              `Alchemy bundler RPC error on ${network} (${calls.map((c) => c?.method).join(",")}):`,
              JSON.stringify(rpcError)
            );
          }
        }
      } catch {
        // A non-JSON body is the transport's problem, not ours to report here.
      }

      return new NextResponse(responseBody, {
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
      lastError = error;
      // A transport failure during submission is ambiguous: the user operation
      // may already be accepted, so never submit it again through another key.
      if (includesSubmission) break;
    }
  }

  if (lastResponse) {
    return new NextResponse(lastBody, {
      status: lastResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(lastResponse.headers.get("retry-after")
          ? { "Retry-After": lastResponse.headers.get("retry-after") as string }
          : {}),
      },
    });
  }

  console.error(`Alchemy bundler proxy failed for ${network}:`, lastError);
  const timedOut = lastError instanceof Error && lastError.name === "TimeoutError";
  return NextResponse.json(
    {
      error: timedOut ? "Alchemy bundler timed out" : "Alchemy bundler is unavailable",
      provider: "alchemy",
      retryable: true,
    },
    { status: timedOut ? 504 : 502, headers: { "Retry-After": "5" } }
  );
}
