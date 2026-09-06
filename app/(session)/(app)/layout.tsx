import { AppShell } from "@/components/layout/app-shell";

// The signed-in product routes: dashboard, spot, perps, memecoins, real
// assets, prediction and activity. The group exists so these share one
// mounted shell (see components/layout/app-shell.tsx) while the landing page,
// auth, welcome and privacy stay outside it, and it adds nothing to the URL.
//
// Casino and earn are not in the group yet. Casino switches its chrome by
// route (the chess site shell, the bare board, or this shell) from inside the
// feature, and earn wraps its ten routes the same way; both keep mounting the
// shell per page until they are brought in on their own.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
