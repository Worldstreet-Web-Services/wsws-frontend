// Sentry for the edge runtime: middleware (proxy.ts) and any route that opts
// into the edge. Loaded by instrumentation.ts.
import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions } from "@/lib/monitoring/sentry-options";

Sentry.init(baseSentryOptions);
