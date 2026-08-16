"use client";

import { Avatar } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { truncateAddress } from "@/lib/format";
import { useAuthSession } from "@/hooks/use-auth-session";

// The profile hands out the user's own embedded wallets: one EVM address and
// one Solana address. They come off the auth session, so there is nothing to
// fetch and nothing to mint.

interface AddressRowProps {
  label: string;
  address: string;
}

function AddressRow({ label, address }: AddressRowProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
      <Avatar seed={address} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-[13px] font-medium text-white">{label}</span>
        <span className="tnum block truncate text-xs font-normal text-white/50">
          {truncateAddress(address)}
        </span>
      </span>
      <CopyButton value={address} />
    </div>
  );
}

export function WalletList() {
  const { evmAddress, solanaAddress } = useAuthSession();
  // A family whose wallet is not provisioned yet is dropped rather than shown
  // empty, which is what the "being set up" case below covers.
  const wallets = [
    { label: "EVM", address: evmAddress },
    { label: "Solana", address: solanaAddress },
  ].filter((w): w is { label: string; address: string } => Boolean(w.address));

  return (
    <div className="mt-[18px]">
      <div className="text-[11.5px] font-normal tracking-[0.04em] text-white/40 uppercase">
        Your wallet addresses
      </div>
      {wallets.length === 0 ? (
        <div className="mt-2 text-[13px] font-normal text-white/50">
          Your wallets are being set up.
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {wallets.map((w) => (
            <AddressRow key={w.label} label={w.label} address={w.address} />
          ))}
        </div>
      )}
    </div>
  );
}
