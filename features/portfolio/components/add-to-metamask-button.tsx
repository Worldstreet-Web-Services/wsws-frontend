"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MetaMaskIcon } from "@/components/ui/metamask-icon";
import { toast } from "@/lib/toast";
import { useKashStatus } from "@/features/portfolio/hooks/use-kash";
import {
  addKashToMetaMask,
  MetaMaskDeclinedError,
  MetaMaskUnavailableError,
} from "@/features/portfolio/lib/metamask";

// A shortcut, placed in the Kash card's corner, to get KASH showing up as a
// balance inside MetaMask itself, not just in-app. wallet_watchAsset talks to
// the extension directly and needs no Privy session, so this only depends on
// the token existing on-chain: hidden in mock mode, where there is no real
// contract to add.
//
// The desktop card keeps the design's bordered chip; the mobile Kash+ card sits
// the mark bare on the yellow gradient (bare), scaled to iconSize.
export function AddToMetaMaskButton({
  bare = false,
  iconSize = 22,
}: {
  bare?: boolean;
  iconSize?: number;
} = {}) {
  const t = useTranslations("kash");
  const { data: status } = useKashStatus();
  const [busy, setBusy] = useState(false);

  const tokenAddress = status?.chainMode === "ethers" ? status.chain?.tokenAddress : undefined;
  if (!tokenAddress) return null;

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addKashToMetaMask(tokenAddress);
      toast.success(t("addToMetaMaskSuccess"));
    } catch (error) {
      if (error instanceof MetaMaskDeclinedError) {
        // Closed or rejected the prompt, not worth a toast.
      } else if (error instanceof MetaMaskUnavailableError) {
        toast.error(t("addToMetaMaskUnavailable"));
      } else {
        toast.error(t("addToMetaMaskFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label={t("addToMetaMask")}
      title={t("addToMetaMask")}
      className={
        bare
          ? "ws-pressable grid shrink-0 cursor-pointer place-items-center transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          : "grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full border border-white/12 bg-white/6 transition-colors hover:border-white/22 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <MetaMaskIcon size={bare ? iconSize : 16} />
    </button>
  );
}
