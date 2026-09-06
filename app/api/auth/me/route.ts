import { NextResponse, type NextRequest } from "next/server";
import { getRequestIdentity, verifyRequest } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const claims = await verifyRequest(req);
  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getRequestIdentity(req, claims);

  return NextResponse.json({
    userId: claims.userId,
    sessionId: claims.sessionId,
    user: identity
      ? {
          id: identity.userId,
          wallets: [
            { address: identity.evmAddress, chainType: "ethereum" },
            { address: identity.solanaAddress, chainType: "solana" },
          ].filter((w) => w.address !== null),
        }
      : null,
  });
}
