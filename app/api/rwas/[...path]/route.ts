import { NextResponse, type NextRequest } from "next/server";

import { rwasSchemaFor } from "@/lib/api/schemas/rwas";
import {
  invalidRwasQuery,
  isAllowedRwasPath,
  requestRwas,
  rwasCacheControl,
} from "@/lib/server/rwas";
import { checkUpstream } from "@/lib/server/validate-upstream";

const NO_STORE = "no-store, max-age=0, must-revalidate";

function errorResponse(status: number, code: string, message: string, requestId: string) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    {
      status,
      headers: {
        "cache-control": NO_STORE,
        "x-request-id": requestId,
      },
    }
  );
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!isAllowedRwasPath(joined)) {
    return errorResponse(404, "NOT_FOUND", "Market asset endpoint not found.", requestId);
  }

  const invalidQuery = invalidRwasQuery(joined, req.nextUrl.searchParams);
  if (invalidQuery) return errorResponse(400, "VALIDATION_ERROR", invalidQuery, requestId);

  try {
    const upstream = await requestRwas(joined, req.nextUrl.searchParams, requestId);
    const text = await upstream.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      console.error(`RWAS ${joined} returned invalid JSON.`, { requestId });
      return errorResponse(
        502,
        "UPSTREAM_CONTRACT",
        "Market data returned an invalid response.",
        requestId
      );
    }

    const envelope = payload as { success?: unknown; data?: unknown; error?: unknown } | null;
    if (!envelope || typeof envelope !== "object" || envelope.success !== upstream.ok) {
      console.error(`RWAS ${joined} returned an invalid envelope.`, { requestId });
      return errorResponse(
        502,
        "UPSTREAM_CONTRACT",
        "Market data returned an invalid response.",
        requestId
      );
    }

    const contract = checkUpstream(rwasSchemaFor(joined), payload, {
      service: "rwas",
      path: joined,
    });
    if (!contract.ok) {
      console.error(contract.problem, { requestId });
      return errorResponse(
        502,
        "UPSTREAM_CONTRACT",
        "Market data returned an invalid response.",
        requestId
      );
    }

    const responseRequestId = upstream.headers.get("x-request-id") ?? requestId;
    const retryAfter = upstream.headers.get("retry-after");
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "cache-control": upstream.ok ? rwasCacheControl(joined) : NO_STORE,
        "content-type": "application/json; charset=utf-8",
        "x-request-id": responseRequestId,
        ...(retryAfter ? { "retry-after": retryAfter } : {}),
      },
    });
  } catch (error) {
    console.error("RWAS proxy failed.", { path: joined, requestId, error });
    return isTimeout(error)
      ? errorResponse(504, "UPSTREAM_TIMEOUT", "Market data timed out.", requestId)
      : errorResponse(502, "UPSTREAM_ERROR", "Market data is temporarily unreachable.", requestId);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!/^market-assets\/[^/]+\/quote$/u.test(joined)) {
    return errorResponse(404, "NOT_FOUND", "Market quote endpoint not found.", requestId);
  }
  if (req.nextUrl.searchParams.size > 0) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Quote requests do not accept query parameters.",
      requestId
    );
  }

  const body = await req.text();
  if (!body || new TextEncoder().encode(body).length > 1_024) {
    return errorResponse(400, "VALIDATION_ERROR", "A valid quote request is required.", requestId);
  }

  try {
    const upstream = await requestRwas(joined, new URLSearchParams(), requestId, {
      method: "POST",
      body,
    });
    const text = await upstream.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      console.error(`RWAS ${joined} returned invalid JSON.`, { requestId });
      return errorResponse(
        502,
        "UPSTREAM_CONTRACT",
        "Market quote returned an invalid response.",
        requestId
      );
    }

    const envelope = payload as { success?: unknown; data?: unknown; error?: unknown } | null;
    if (!envelope || typeof envelope !== "object" || envelope.success !== upstream.ok) {
      console.error(`RWAS ${joined} returned an invalid envelope.`, { requestId });
      return errorResponse(
        502,
        "UPSTREAM_CONTRACT",
        "Market quote returned an invalid response.",
        requestId
      );
    }

    const contract = checkUpstream(rwasSchemaFor(joined), payload, {
      service: "rwas",
      path: joined,
    });
    if (!contract.ok) {
      console.error(contract.problem, { requestId });
      return errorResponse(
        502,
        "UPSTREAM_CONTRACT",
        "Market quote returned an invalid response.",
        requestId
      );
    }

    const responseRequestId = upstream.headers.get("x-request-id") ?? requestId;
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "cache-control": NO_STORE,
        "content-type": "application/json; charset=utf-8",
        "x-request-id": responseRequestId,
      },
    });
  } catch (error) {
    console.error("RWAS quote proxy failed.", { path: joined, requestId, error });
    return isTimeout(error)
      ? errorResponse(504, "UPSTREAM_TIMEOUT", "Market quote timed out.", requestId)
      : errorResponse(502, "UPSTREAM_ERROR", "Market quote is temporarily unavailable.", requestId);
  }
}
