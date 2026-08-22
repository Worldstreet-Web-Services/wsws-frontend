import { NextResponse, type NextRequest } from "next/server";

import { rwasOneInchQuoteRequestSchema } from "@/lib/api/schemas/rwas-oneinch";
import { verifyRequest } from "@/lib/server/auth";
import { requestRwasOneInchQuote, RwasOneInchQuoteError } from "@/lib/server/rwas-oneinch";

const NO_STORE = "no-store, max-age=0, must-revalidate";

function response(status: number, body: unknown, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": NO_STORE, "x-request-id": requestId },
  });
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  if (!(await verifyRequest(req))) {
    return response(
      401,
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to check a route." } },
      requestId
    );
  }

  const text = await req.text();
  if (!text || new TextEncoder().encode(text).length > 1_024) {
    return response(
      400,
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "A valid quote request is required." },
      },
      requestId
    );
  }
  const parsed = rwasOneInchQuoteRequestSchema.safeParse(
    (() => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })()
  );
  if (!parsed.success) {
    return response(
      400,
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "The quote request is invalid." },
      },
      requestId
    );
  }

  try {
    const quote = await requestRwasOneInchQuote(parsed.data, requestId);
    return response(200, { success: true, data: quote }, requestId);
  } catch (error) {
    if (error instanceof RwasOneInchQuoteError) {
      return response(
        error.status,
        { success: false, error: { code: error.code, message: error.message } },
        requestId
      );
    }
    console.error("RWA 1inch coverage quote failed.", { requestId, error });
    return response(
      502,
      {
        success: false,
        error: {
          code: "ONEINCH_UNAVAILABLE",
          message: "1inch quote coverage is temporarily unavailable.",
        },
      },
      requestId
    );
  }
}
