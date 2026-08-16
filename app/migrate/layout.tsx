import { LegacyPrivyProvider } from "@/components/providers/legacy-privy-provider";

// /migrate signs the sweep with the old Privy wallets, so it keeps the legacy
// provider that the rest of the app no longer mounts.
export default function MigrateLayout({ children }: { children: React.ReactNode }) {
  return <LegacyPrivyProvider>{children}</LegacyPrivyProvider>;
}
