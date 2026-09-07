// Next's server-side registration hook. It runs once per server start, before
// any request is handled, which is where Sentry must boot so an error in the
// very first request is still captured.
//
// The two runtimes are imported lazily and separately: the edge bundle cannot
// contain Node built-ins, so importing both eagerly would break the edge build.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports errors thrown while rendering a server component or handling a
// request. Without this, a server-side failure surfaces to the user as the
// error boundary and to us as nothing at all.
export const onRequestError = Sentry.captureRequestError;
