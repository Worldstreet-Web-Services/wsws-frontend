import { NextResponse, type NextRequest } from "next/server";
import { getRequestUser, verifyRequest } from "@/lib/server/auth";
import {
  isCashierPath,
  namesAnActor,
  parseBody,
  requiresProvenWallet,
  withIdentity,
} from "@/lib/casino/chess-identity";

// Server-side proxy for the chess service on the platform gateway. Same
// arrangement as the other service proxies in this app: routing through our
// origin keeps every external API proxied and lets us attach the caller's
// identity server-side.
//
// Reads are public: the lobby, a board, its moves and its PGN are all
// spectator-visible. Writes act on a game, so they need a verified session.
const BASE = process.env.NEXT_PUBLIC_CHESS_API_URL;

// Just long enough to collapse the concurrent polls of two players watching the
// same board, and short enough that neither sees a stale position. The match
// poll runs at 2s, so anything longer would serve a cached board more often
// than a fresh one.
const CACHE_TTL_MS = 1000;
const cache = new Map<string, { expires: number; body: string; status: number }>();

function notConfigured() {
  return NextResponse.json(
    {
      success: false,
      error: { code: "NOT_CONFIGURED", message: "Chess isn't configured yet." },
    },
    { status: 503 }
  );
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: { code: "UNAUTHORIZED", message: "Sign in to play." } },
    { status: 401 }
  );
}

// The wallet the session provably owns, when we can establish it.
//
// This needs a Privy identity token, which is an optional feature: when it is
// off, or simply not warm yet, there is no identity token on the request and
// this returns null. That is not an error, so it must not block play. The
// caller's own claim is used instead, which is no weaker than the other service
// proxies in this app and is what the upstream service reads today anyway.
async function sessionWallet(req: NextRequest): Promise<string | null> {
  const user = await getRequestUser(req);
  if (!user) return null;
  const wallet = user.linked_accounts.find(
    (a) => a.type === "wallet" && "chain_type" in a && a.chain_type === "ethereum"
  );
  return wallet && "address" in wallet ? wallet.address : null;
}

function unverifiedWallet() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "We couldn't verify your wallet. Sign in again before moving money.",
      },
    },
    { status: 401 }
  );
}

async function forward(
  req: NextRequest,
  joined: string,
  method: "GET" | "POST",
  body?: string,
  { cacheable = true }: { cacheable?: boolean } = {}
) {
  const url = `${BASE}/${joined}${req.nextUrl.search}`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (method === "POST") headers["content-type"] = "application/json";

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (method === "GET" && cacheable) {
      cache.set(url, { expires: Date.now() + CACHE_TTL_MS, body: text, status: res.status });
    }
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Chess proxy failed:", joined, error);
    return NextResponse.json(
      { success: false, error: { code: "UPSTREAM_ERROR", message: "Chess is unreachable." } },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!BASE) return notConfigured();
  const joined = path.join("/");

  // A balance is nobody else's business, so cashier reads need a session and are
  // never served from the shared cache. Boards and lobbies stay public.
  if (isCashierPath(joined)) {
    if (!(await verifyRequest(req))) return unauthorized();
    return forward(req, joined, "GET", undefined, { cacheable: false });
  }

  const url = `${BASE}/${joined}${req.nextUrl.search}`;
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) {
    return new NextResponse(hit.body, {
      status: hit.status,
      headers: { "content-type": "application/json" },
    });
  }

  return forward(req, joined, "GET");
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!BASE) return notConfigured();

  const claims = await verifyRequest(req);
  if (!claims) return unauthorized();

  const joined = path.join("/");
  const raw = await req.text();
  const body = parseBody(raw);
  const wallet = await sessionWallet(req);

  // Anything that moves money is held to the stricter rule: the wallet has to
  // be one the session provably owns. A claimed one is good enough to lose a
  // game with, not to spend a balance with.
  const needsProof = requiresProvenWallet(joined, body);
  if (needsProof && !wallet) return unverifiedWallet();

  // A write has to say who is acting. Only when neither the session nor the
  // request can supply that is there nothing to send upstream. Swiss names its
  // actor with a token rather than an address, which namesAnActor accounts for.
  if (!wallet && !namesAnActor(body)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NO_WALLET",
          message: "Your account has no wallet to play with yet.",
        },
      },
      { status: 400 }
    );
  }

  return forward(
    req,
    joined,
    "POST",
    // Swiss name tokens are only rewritten when money is involved. On a free
    // tournament a player picks their own token, and rewriting it would rename
    // entrants out of tournaments they already joined.
    withIdentity(raw, wallet, { rewriteSwissNames: needsProof })
  );
}
