import type { Metadata } from "next";
import { MigrateFlow } from "@/features/migrate";

export const metadata: Metadata = { title: "Move your assets" };

// The wallet migration page. No AuthGuard: the flow itself walks the user
// through both sign-ins, the old Privy account (which signs the transfers)
// and the new Decane wallet (the destination).
export default function MigratePage() {
  return <MigrateFlow />;
}
