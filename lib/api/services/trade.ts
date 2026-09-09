"use client";

import { createServiceClient } from "@/lib/api/service";

export const tradeClient = createServiceClient(
  "/api/trade",
  "Trade service unavailable right now."
);
