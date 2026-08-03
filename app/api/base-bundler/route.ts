import type { NextRequest } from "next/server";
import { forwardAlchemyBundlerRequest } from "@/lib/server/alchemy-bundler";

// Compatibility alias for the old Base-only endpoint. New callers should use
// /api/alchemy-bundler/<network>, but keeping this route avoids breaking any
// existing Base clients while the generic path rolls out.
export async function POST(req: NextRequest) {
  return forwardAlchemyBundlerRequest(req, "base-mainnet");
}
