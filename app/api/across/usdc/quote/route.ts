import { NextResponse, type NextRequest } from "next/server";

import { rwasAcrossQuoteRequestSchema } from "@/lib/api/schemas/rwas-across";
import {
  AcrossBridgeError,
  requestEthereumUsdcToBaseQuote,
} from "@/lib/server/across";
import { verifyRequest } from "@/lib/server/auth";

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
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to move USDC." } },
      requestId
    );
  }

  const parsed = rwasAcrossQuoteRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return response(
      400,
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "The USDC amount or wallet is invalid." },
      },
      requestId
    );
  }

  try {
    const quote = await requestEthereumUsdcToBaseQuote(parsed.data);
    return response(200, { success: true, data: quote }, requestId);
  } catch (error) {
    if (error instanceof AcrossBridgeError) {
      return response(
        error.status,
        { success: false, error: { code: error.code, message: error.message } },
        requestId
      );
    }
    console.error("Across USDC return quote failed.", { requestId, error });
    return response(
      502,
      {
        success: false,
        error: { code: "BRIDGE_QUOTE_UNAVAILABLE", message: "A USDC return route is unavailable." },
      },
      requestId
    );
  }
}
