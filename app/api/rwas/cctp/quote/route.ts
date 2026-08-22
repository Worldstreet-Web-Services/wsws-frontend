import { NextResponse, type NextRequest } from "next/server";

import { rwasCctpQuoteRequestSchema } from "@/lib/api/schemas/rwas-cctp";
import { verifyRequest } from "@/lib/server/auth";
import { CctpError, requestRwasCctpQuote } from "@/lib/server/cctp";

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
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to trade." } },
      requestId
    );
  }

  const text = await req.text();
  if (!text || new TextEncoder().encode(text).length > 512) {
    return response(
      400,
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid transfer quote request is required.",
        },
      },
      requestId
    );
  }
  const parsed = rwasCctpQuoteRequestSchema.safeParse(
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
        error: {
          code: "VALIDATION_ERROR",
          message: "The transfer amount or wallet is invalid.",
        },
      },
      requestId
    );
  }

  try {
    return response(
      200,
      { success: true, data: await requestRwasCctpQuote(parsed.data) },
      requestId
    );
  } catch (error) {
    if (error instanceof CctpError) {
      return response(
        error.status,
        { success: false, error: { code: error.code, message: error.message } },
        requestId
      );
    }
    console.error("CCTP quote failed.", { requestId, error });
    return response(
      502,
      {
        success: false,
        error: {
          code: "CCTP_UNAVAILABLE",
          message: "A Circle transfer quote is unavailable.",
        },
      },
      requestId
    );
  }
}
