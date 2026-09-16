import { NextResponse, type NextRequest } from "next/server";
import { runMicrofrontendsMiddleware } from "@vercel/microfrontends/next/middleware";

// The route guard behind the launch gate (see lib/launch-gate.ts). While the
// site is closed, by the clock or by ALLOW_ACCESS=false, every request except
// the pages the closed site serves is turned away, so typing /dashboard (or
// any other path) by hand goes nowhere. The clock is read on every request, so
// the site opens itself at NEXT_PUBLIC_LAUNCH_AT without a redeploy. The
// client-side gate swaps the film for the countdown and gates the landing
// CTAs; this one backstops direct navigation, which no client check can.
//
// The two closed states are turned away differently, because they mean
// different things to a crawler:
//
//   Pre-launch redirects to the landing page. There is nothing at those URLs
//   yet, and 302-to-marketing is the honest answer.
//
//   Maintenance rewrites in place and answers 503. The URLs are real and will
//   work again within the hour, so the address stays in the bar (a bookmarked
//   /portfolio comes back on refresh rather than dumping the user home) and
//   crawlers are told to come back rather than that the page has moved.

// The closed site's own endpoints. The landing page is what it serves while
// shut, so the routes that page calls have to survive the guard.
const OPEN_PATHS = new Set(["/", "/api/waitlist"]);

// Under maintenance the legal documents are the pages that stay genuinely
// open: they do not depend on the app being up, and they should keep
// answering 200 so they stay reachable and indexed. Everything else, the
// landing page included, is closed.
const MAINTENANCE_OPEN_PATHS = new Set(["/privacy", "/terms"]);

// How long a crawler should wait before trying again, in seconds. Deliberately
// short: it is a hint, and an hour is long enough to be polite without telling
// Google to stay away for the rest of the day.
const RETRY_AFTER_SECONDS = "3600";

function underMaintenance(): boolean {
  return process.env.ALLOW_ACCESS === "false";
}

function beforeLaunch(): boolean {
  const raw = process.env.NEXT_PUBLIC_LAUNCH_AT;
  if (!raw) return false;
  const launchAt = Date.parse(raw);
  return Number.isFinite(launchAt) && Date.now() < launchAt;
}

// A closed page still renders, so without this the maintenance page would be
// served with a 200 and indexed as the site's own content, the landing page
// included. The rewrite target is the landing route, which under maintenance
// renders the maintenance page; rewriting "/" to itself is a no-op that still
// carries the status.
function closedResponse(request: NextRequest): NextResponse {
  const response = NextResponse.rewrite(new URL("/", request.url), { status: 503 });
  response.headers.set("Retry-After", RETRY_AFTER_SECONDS);
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

// Answered by @vercel/microfrontends: which paths belong to which application
// of the group (microfrontends.json). The client reads it to tell a link into
// another application from a link inside this one. It is routing metadata, not
// a page, so it is served whether or not the site is open.
const MICROFRONTENDS_CLIENT_CONFIG = "/.well-known/vercel/microfrontends/client-config";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === MICROFRONTENDS_CLIENT_CONFIG) {
    // No flags: every route in microfrontends.json is unconditional. The
    // package answers this path whenever it is asked for it, so an undefined
    // result here means the package changed, and failing loudly beats a
    // silent 404 on the endpoint.
    const response = await runMicrofrontendsMiddleware({ request, flagValues: {} });
    if (!response) throw new Error(`@vercel/microfrontends did not answer ${pathname}`);
    return response;
  }

  if (underMaintenance()) {
    if (MAINTENANCE_OPEN_PATHS.has(pathname)) return NextResponse.next();
    return closedResponse(request);
  }

  if (!beforeLaunch()) return NextResponse.next();
  if (OPEN_PATHS.has(pathname)) return NextResponse.next();
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    // Static assets and any dotted file (icons, images, fonts) stay reachable:
    // the landing page is built from them.
    //
    // /square and everything under it belongs to the Square, a separate Vercel
    // application in the same microfrontends group, and so does its asset
    // prefix (vc-ap- plus the package's hash of "market-square-frontend"). On
    // Vercel those requests never reach this app; locally and before the group
    // exists they must not be gated by it either. /squares and the like are
    // still this app's, so the exclusion stops at a slash or the end of the path.
    // proxy.test.ts checks this against microfrontends.json.
    "/((?!_next/static|_next/image|square(?:/|$)|vc-ap-ce7102/|.*\\..*).*)",
    // Dotted, so the pattern above skips it.
    "/.well-known/vercel/microfrontends/client-config",
  ],
};
