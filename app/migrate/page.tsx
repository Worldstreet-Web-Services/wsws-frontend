import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { MigrateFlow } from "@/features/migrate";

export const metadata: Metadata = { title: "Move your assets" };

// The wallet migration page. AuthGuard requires the old (Privy) session, which
// signs the transfers; the flow itself adds the Decane sign-in for the
// destination wallets.
export default function MigratePage() {
  return (
    <AuthGuard>
      <MigrateFlow />
    </AuthGuard>
  );
}
