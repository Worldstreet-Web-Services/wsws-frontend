import { NextResponse, type NextRequest } from "next/server";

// Server-side proxy for the gas-sponsor service on the platform gateway, the
// same arrangement as the other service proxies in this app. The service
// verifies the caller's Privy access token itself, so this proxy only forwards
// the Authorization header rather than attaching an identity of its own.
//
// Only the routes the app actually uses are exposed: capabilities (which
// Solana sponsor wallet to build against) and the sponsorship submit.
// Server-only local override first, then the public env so a deployment can
// configure either.
const BASE = process.env.GAS_SPONSOR_API_URL ?? process.env.NEXT_PUBLIC_GAS_SPONSOR_API_URL;

const ALLOWED_GET = new Set(["capabilities", "health"]);
const ALLOWED_POST = new Set(["solana/sponsor"]);

function notConfigured() {
  return NextResponse.json(
    {
      success: false,
      error: { code: "NOT_CONFIGURED", message: "Gas sponsorship isn't configured yet." },
    },
    { status: 503 }
  );
}

function notFound() {
  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message: "Unknown gas-sponsor route." } },
    { status: 404 }
  );
}

async function upstream(req: NextRequest, joined: string, init: RequestInit) {
  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  if (init.body) headers.set("content-type", "application/json");
  const res = await fetch(`${BASE}/${joined}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(45000),
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!BASE) return notConfigured();
  const joined = (await ctx.params).path.join("/");
  if (!ALLOWED_GET.has(joined)) return notFound();
  return upstream(req, joined, { method: "GET" });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!BASE) return notConfigured();
  const joined = (await ctx.params).path.join("/");
  if (!ALLOWED_POST.has(joined)) return notFound();
  return upstream(req, joined, { method: "POST", body: await req.text() });
}
