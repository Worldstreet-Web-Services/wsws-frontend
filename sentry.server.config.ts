// Sentry for the Node runtime: route handlers under app/api, server
// components, and anything else rendered on a server. Loaded by
// instrumentation.ts, which Next calls once per server start.
import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions } from "@/lib/monitoring/sentry-options";

Sentry.init(baseSentryOptions);
