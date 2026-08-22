"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { buildNav } from "@/components/layout/nav-items";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PerpsSection } from "@/features/trade";
import { loadInterest } from "@/lib/preferences";

// Perpetuals as its own page, like Earn and Prediction — reached from the
// sidebar rather than a /dashboard scroll anchor. Hyperliquid-backed; see
// apps/perp's README for the backend side. PerpsSection is the exact same
// component the (now-removed) /dashboard scroll anchor used to mount, so the
// header (title + simple/pro switch) and body are identical either way.
export default function PerpsPage() {
  const tSections = useTranslations("sections");
  const nav = useMemo(() => buildNav(loadInterest(), tSections), [tSections]);

  return (
    <AuthGuard>
      <DashboardShell nav={nav} activeSection="perps">
        <PerpsSection />
      </DashboardShell>
    </AuthGuard>
  );
}
