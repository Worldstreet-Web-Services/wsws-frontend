import { NextResponse, type NextRequest } from "next/server";

import { verifyRequest } from "@/lib/server/auth";
import { requestRwasOneInchOrderStatus, RwasOneInchQuoteError } from "@/lib/server/rwas-oneinch";

const NO_STORE = "no-store, max-age=0, must-revalidate";

function response(status: number, body: unknown, requestId: string) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": NO_STORE, "x-request-id": requestId },
  });
}

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  if (!(await verifyRequest(req))) {
    return response(
      401,
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to trade." } },
      requestId
    );
  }

  const orderHash = req.nextUrl.searchParams.get("orderHash") ?? "";
  try {
    const status = await requestRwasOneInchOrderStatus(orderHash, requestId);
    return response(200, { success: true, data: status }, requestId);
  } catch (error) {
    if (error instanceof RwasOneInchQuoteError) {
      return response(
        error.status,
        { success: false, error: { code: error.code, message: error.message } },
        requestId
      );
    }
    console.error("RWA 1inch order status failed.", { requestId, error });
    return response(
      502,
      {
        success: false,
        error: { code: "ONEINCH_UNAVAILABLE", message: "The 1inch order status is unavailable." },
      },
      requestId
    );
  }
}
