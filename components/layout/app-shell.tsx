"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AppChromeProvider, useAppChrome } from "@/components/layout/app-chrome";
import { DashboardShell } from "@/components/layout/dashboard-shell";

function Shell({ children }: { children: React.ReactNode }) {
  const { nav, activeSection } = useAppChrome();
  return (
    <DashboardShell nav={nav} activeSection={activeSection}>
      {children}
    </DashboardShell>
  );
}

/**
 * The chrome around every signed-in product route: the auth guard and the
 * app shell, mounted once by the (app) layout.
 *
 * Until this existed each page mounted the shell itself, so moving from the
 * dashboard to the perps desk tore down and rebuilt the sidebar, the topbar,
 * the tab bar, the funds modal and the broadcast dock, then re-ran every
 * effect in them: the catalog prefetch, the referral claim, the known-user
 * mark. The shell's own comment said it made the pages "feel like one app";
 * mounted per page it could not. Under a layout it survives navigation, and
 * only the route's own content changes.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppChromeProvider>
        <Shell>{children}</Shell>
      </AppChromeProvider>
    </AuthGuard>
  );
}
