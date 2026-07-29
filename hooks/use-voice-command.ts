"use client";

import { useCallback, useState } from "react";
import { getAccessToken, usePrivy } from "@privy-io/react-auth";
import { toast } from "@/lib/toast";
import { copyText } from "@/lib/clipboard";
import { getWalletAddress } from "@/lib/user";
import { useAppNavigate } from "@/hooks/use-app-navigate";
import { useVoiceRecord } from "@/hooks/use-voice-record";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useMoney } from "@/components/ui/currency-select";
import { useBalanceVisibility } from "@/components/ui/balance-visibility";
import { SECTION_LABEL } from "@/lib/sections";
import type { ChainType, Intent } from "@/lib/voice/intent";

interface UseVoiceCommand {
  recording: boolean;
  busy: boolean;
  supported: boolean;
  // One tap runs the whole flow: listen, auto-stop on pause, understand, act.
  run: () => Promise<void>;
}

const CHAIN_LABEL: Record<ChainType, string> = {
  ethereum: "Ethereum",
  solana: "Solana",
};

// Shortens an address for a toast so it stays readable while still confirming
// which wallet was returned. The full value is copied to the clipboard.
function shortenAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function capitalize(text: string): string {
  return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}

// Ties the whole spoken-command flow together in a single call: capture one
// utterance (the mic auto-stops when the speaker pauses) -> POST the audio to
// /api/voice -> dispatch the returned intent. Uses one toast that starts as a
// spinner and resolves in place to success or error, so a command reads as a
// single "listening -> done" notification, matching how the app reports every
// other async action.
export function useVoiceCommand(): UseVoiceCommand {
  const { user } = usePrivy();
  const navigate = useAppNavigate();
  const { recording, supported, capture } = useVoiceRecord();
  const { totalUsd, refetch } = usePortfolio();
  const money = useMoney();
  const { hidden } = useBalanceVisibility();
  const [busy, setBusy] = useState(false);

  const dispatch = useCallback(
    (intent: Intent, toastId: string | number) => {
      switch (intent.action) {
        case "navigate":
          toast.success(`Opening ${SECTION_LABEL[intent.target]}`, { id: toastId });
          navigate(intent.target);
          return;

        case "getBalance":
          // Respect the app-wide hide-balances toggle: don't read a hidden
          // number out loud in a toast.
          if (hidden) {
            toast.info("Balances are hidden. Unhide them to check.", { id: toastId });
          } else {
            toast.success(`Your balance is ${money.format(totalUsd)}`, { id: toastId });
          }
          return;

        case "getWalletAddress": {
          const address = getWalletAddress(user, intent.chain);
          if (!address) {
            toast.error(`No ${CHAIN_LABEL[intent.chain]} wallet found.`, { id: toastId });
            return;
          }
          // Copy so the user can paste it straight away; show a shortened form.
          void copyText(address);
          toast.success(`${CHAIN_LABEL[intent.chain]}: ${shortenAddress(address)} (copied)`, {
            id: toastId,
          });
          return;
        }

        case "refresh":
          toast.success("Refreshing balances", { id: toastId });
          void refetch();
          return;

        case "unsupported":
          // Understood, but this action isn't voice-enabled yet. Say so plainly
          // rather than pretending we didn't understand.
          toast.info(`${capitalize(intent.what)} by voice is coming soon.`, { id: toastId });
          return;

        case "unknown": {
          const heard = intent.transcript ? `Heard "${intent.transcript}"` : "Didn't catch that";
          toast.error(`${heard}. Try "what's my balance" or "go to markets".`, { id: toastId });
          return;
        }
      }
    },
    [navigate, hidden, money, totalUsd, user, refetch]
  );

  const run = useCallback(async () => {
    if (busy || recording) return;

    const toastId = toast.loading("Listening…");
    let audio: Blob | null = null;
    try {
      const result = await capture();
      audio = result.blob;
      console.log("[voice] capture done:", result.reason, "bytes:", result.blob?.size ?? 0);
    } catch (err) {
      console.error("[voice] capture failed:", err);
      toast.error("Microphone unavailable.", { id: toastId });
      return;
    }

    if (!audio) {
      console.warn("[voice] no audio captured (empty) — nothing sent");
      toast.error("Didn't hear anything. Try again.", { id: toastId });
      return;
    }

    setBusy(true);
    toast.loading("Working…", { id: toastId });
    try {
      // The voice route only needs the access token (verifyRequest reads it);
      // we deliberately do NOT fetch Privy's identity token here, since that
      // extra users/me call is unnecessary for this route and is the endpoint
      // Privy rate-limits under heavy dev reloads.
      const accessToken = await getAccessToken();
      if (!accessToken) {
        toast.error("Please sign in again.", { id: toastId });
        return;
      }
      const form = new FormData();
      form.append("audio", audio, "command.webm");
      console.log("[voice] POST /api/voice …");
      const res = await fetch("/api/voice", {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log("[voice] response:", res.status);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[voice] non-OK response:", res.status, body);
        toast.error("Couldn't understand that. Try again.", { id: toastId });
        return;
      }
      const { intent } = (await res.json()) as { intent: Intent };
      console.log("[voice] intent:", intent);
      dispatch(intent, toastId);
    } catch (err) {
      console.error("[voice] request threw:", err);
      toast.error("Voice is unavailable right now.", { id: toastId });
    } finally {
      setBusy(false);
    }
  }, [busy, recording, capture, dispatch]);

  return { recording, busy, supported, run };
}
