"use client";

import { lazy, Suspense } from "react";

const AuthenticatedProviders = lazy(() => import("./authenticated-providers"));

export default function Providers({ children }: { children: React.ReactNode }) {
  // Privy wraps public pages but never forces login. RWA discovery stays
  // public; pressing Buy or Sell is what opens authentication.
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AuthenticatedProviders>{children}</AuthenticatedProviders>
    </Suspense>
  );
}
