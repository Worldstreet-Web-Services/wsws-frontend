import { NextResponse } from "next/server";
import { buildDashboardFeed } from "@/lib/server/dashboard-feed";

// The dashboard's public data, composed once for every user. Nothing in it
// depends on who is asking, so it is served anonymously and cached at the
// edge: one browser in a thousand actually reaches this function per window,
// and none of them reach the upstreams behind it.
//
// `public, s-maxage` is only safe because the body is the same for everyone.
// Anything per user belongs on its own route with `private`.
export async function GET() {
  const feed = await buildDashboardFeed();
  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
    },
  });
}
