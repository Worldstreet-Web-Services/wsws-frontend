import { NextResponse, type NextRequest } from "next/server";

import { rwasCctpStatusRequestSchema } from "@/lib/api/schemas/rwas-cctp";
import { verifyRequest } from "@/lib/server/auth";
import { CctpError, requestRwasCctpStatus } from "@/lib/server/cctp";

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
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Sign in to track this transfer." },
      },
      requestId
    );
  }

  const parsed = rwasCctpStatusRequestSchema.safeParse({
    sourceTransactionHash: req.nextUrl.searchParams.get("sourceTransactionHash"),
    depositor: req.nextUrl.searchParams.get("depositor"),
    amount: req.nextUrl.searchParams.get("amount"),
  });
  if (!parsed.success) {
    return response(
      400,
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The CCTP transfer reference is invalid.",
        },
      },
      requestId
    );
  }

  try {
    return response(
      200,
      { success: true, data: await requestRwasCctpStatus(parsed.data) },
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
    console.error("CCTP status failed.", { requestId, error });
    return response(
      502,
      {
        success: false,
        error: {
          code: "CCTP_UNAVAILABLE",
          message: "The Circle attestation is unavailable.",
        },
      },
      requestId
    );
  }
}
