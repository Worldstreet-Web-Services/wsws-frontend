import { NextResponse, type NextRequest } from "next/server";

import { rwasAcrossStatusRequestSchema } from "@/lib/api/schemas/rwas-across";
import { AcrossBridgeError, requestRwasAcrossStatus } from "@/lib/server/across";
import { verifyRequest } from "@/lib/server/auth";

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
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to track this bridge." } },
      requestId
    );
  }

  const parsed = rwasAcrossStatusRequestSchema.safeParse({
    depositTxnRef: req.nextUrl.searchParams.get("depositTxnRef"),
  });
  if (!parsed.success) {
    return response(
      400,
      { success: false, error: { code: "VALIDATION_ERROR", message: "The bridge transaction hash is invalid." } },
      requestId
    );
  }

  try {
    const status = await requestRwasAcrossStatus(parsed.data.depositTxnRef);
    return response(200, { success: true, data: status }, requestId);
  } catch (error) {
    if (error instanceof AcrossBridgeError) {
      return response(
        error.status,
        { success: false, error: { code: error.code, message: error.message } },
        requestId
      );
    }
    console.error("Across status failed.", { requestId, error });
    return response(
      502,
      { success: false, error: { code: "BRIDGE_STATUS_UNAVAILABLE", message: "Bridge status is unavailable." } },
      requestId
    );
  }
}
