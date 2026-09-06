"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { useKashStatus } from "@/features/portfolio/hooks/use-kash";
import {
  addKashToMetaMask,
  MetaMaskDeclinedError,
  MetaMaskUnavailableError,
} from "@/features/portfolio/lib/metamask";

// The MetaMask mark, exported from the design.
const METAMASK_MARK = "/market/kash-icon-metamask.svg";

// A shortcut, placed in the Kash card's corner, to get KASH showing up as a
// balance inside MetaMask itself, not just in-app. wallet_watchAsset talks to
// the extension directly and needs no Privy session, so this only depends on
// the token existing on-chain: hidden in mock mode, where there is no real
// contract to add.
export function AddToMetaMaskButton() {
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
      className="ws-pressable grid h-[52.96px] w-[44px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-[1.06px] border-white/10 bg-[rgba(15,15,15,0.01)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {/* The MetaMask mark at the design's size. Fixed aspect ratio, so the
          box is 28.42 x 27.54 rather than square. */}
      <span className="block h-[27.54px] w-[28.42px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={METAMASK_MARK} alt="" className="size-full" />
      </span>
    </button>
  );
}
