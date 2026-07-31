"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateChallenge } from "@/hooks/use-casino-chess";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";
import { useCashierConfig, usePlayerBalance } from "@/hooks/use-chess-cashier";
import { CashierSheet } from "@/components/dashboard/casino/chess/cashier-sheet";
import { formatUsdc, potBreakdown, requireUsdc } from "@/lib/casino/cashier-money";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import {
  TIME_CONTROL_PRESETS,
  type ChessColorChoice,
  type ChessTimeControl,
} from "@/lib/casino/api/types";

const COLOURS: { id: ChessColorChoice; label: string }[] = [
  { id: "white", label: "White" },
  { id: "black", label: "Black" },
  { id: "random", label: "Random" },
];

const DECIMAL = /^\d*\.?\d*$/;

export function CreateSection() {
  const router = useRouter();
  const wallet = useCasinoWallet();
  const create = useCreateChallenge();

  const [mode, setMode] = useState<"invite" | "auto">("invite");
  const [timeControl, setTimeControl] = useState<ChessTimeControl>("5+3");
  const [color, setColor] = useState<ChessColorChoice>("random");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [stake, setStake] = useState("");
  const [cashierOpen, setCashierOpen] = useState(false);

  const { config, enabled: cashierOn } = useCashierConfig();
  const { availableMicro } = usePlayerBalance();

  // A stake is optional. Anything unreadable, or more than the balance covers,
  // blocks the create rather than being sent for the service to refuse.
  let stakeMicro: bigint | null = null;
  let stakeError: string | null = null;
  if (cashierOn && stake.trim()) {
    try {
      stakeMicro = requireUsdc(stake);
      if (stakeMicro > (availableMicro ?? 0n)) stakeError = "More than your chess balance.";
    } catch (e) {
      stakeError = (e as Error).message;
    }
  }

  const pot =
    stakeMicro && !stakeError ? potBreakdown(stakeMicro, config?.platformFeeBps ?? 0) : null;

  const onCreate = async () => {
    if (!wallet.connected) {
      toast.error("Connect your wallet to create a game.");
      return;
    }
    if (create.isPending) return;
    if (stakeError) return;
    const id = toast.loading("Creating your game…");
    try {
      const { challenge, ticket } = await create.mutateAsync({
        timeControl,
        mode,
        color,
        ...(stakeMicro ? { stakeMicro } : {}),
      });
      if (mode === "auto" && ticket) {
        toast.success("Game created. Finding you an opponent.", { id });
        router.push(`/casino/chess/matchmaking?ticket=${ticket.id}`);
        return;
      }
      toast.success("Game created. Share your invite link.", { id });
      setInviteUrl(
        challenge.inviteCode
          ? `${window.location.origin}/casino/chess/invite?code=${challenge.inviteCode}`
          : null
      );
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't create that game."), { id });
    }
  };

  const chipClass = (active: boolean) =>
    `cursor-pointer rounded-lg border border-white/10 px-3.5 py-2 font-sans text-[13px] transition-colors ${
      active ? "bg-accent text-ink border-accent font-semibold" : "text-white hover:bg-white/6"
    }`;

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pt-10 pb-20 sm:px-6">
      <div className="ws-display mb-6 text-[26px]">Create a game</div>

      <div className="ws-inset mb-5 flex gap-2 rounded-full p-1">
        {(["invite", "auto"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setInviteUrl(null);
            }}
            className={`flex-1 cursor-pointer rounded-full py-2.5 font-sans text-[13px] font-semibold transition-colors ${
              mode === m ? "text-ink bg-white" : "text-white/50"
            }`}
          >
            {m === "invite" ? "Invite by link" : "Match me automatically"}
          </button>
        ))}
      </div>

      <div className="ws-glass mb-4.5 rounded-2xl p-5.5">
        <div className="mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
          Time control
        </div>
        <div className="flex flex-wrap gap-2">
          {TIME_CONTROL_PRESETS.map((tc) => (
            <button
              key={tc}
              onClick={() => setTimeControl(tc)}
              className={chipClass(timeControl === tc)}
            >
              {tc}
            </button>
          ))}
        </div>
        <div className="mt-5 mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
          Your colour
        </div>
        <div className="flex flex-wrap gap-2">
          {COLOURS.map((choice) => (
            <button
              key={choice.id}
              onClick={() => setColor(choice.id)}
              aria-pressed={color === choice.id}
              className={chipClass(color === choice.id)}
            >
              {choice.label}
            </button>
          ))}
        </div>

        <div className="mt-4 text-[11.5px] font-normal text-white/50">
          {color === "random"
            ? "You take a random colour. The clock starts when your opponent joins."
            : `You play ${color}. The clock starts when your opponent joins.`}
        </div>
      </div>

      {cashierOn ? (
        <div className="ws-glass mb-4.5 rounded-2xl p-5.5">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
              Stake (optional)
            </span>
            <button
              onClick={() => setCashierOpen(true)}
              className="cursor-pointer font-sans text-[11.5px] font-medium text-white/45 transition-colors hover:text-white"
            >
              Balance: {formatUsdc(availableMicro ?? 0n)} USDC
            </button>
          </div>
          <input
            value={stake}
            onChange={(e) => {
              if (e.target.value === "" || DECIMAL.test(e.target.value)) setStake(e.target.value);
            }}
            inputMode="decimal"
            placeholder="Leave empty to play for nothing"
            aria-label="Stake in USDC"
            aria-invalid={!!stakeError}
            className="ws-inset focus:border-accent/50 tnum w-full rounded-[10px] px-3.5 py-2.5 font-sans text-[15px] text-white outline-none placeholder:text-[13px] placeholder:text-white/25"
          />

          {stakeError ? (
            <div role="alert" className="text-down mt-2 text-[12px] font-normal">
              {stakeError}{" "}
              <button
                onClick={() => setCashierOpen(true)}
                className="cursor-pointer underline underline-offset-2"
              >
                Add money
              </button>
            </div>
          ) : pot ? (
            <div className="tnum mt-2.5 text-[11.5px] font-normal text-white/55">
              Your opponent matches it. Pot {formatUsdc(pot.potMicro)}, fee{" "}
              {formatUsdc(pot.feeMicro)}, winner takes {formatUsdc(pot.payoutMicro)} USDC.
            </div>
          ) : (
            <div className="mt-2.5 text-[11.5px] font-normal text-white/50">
              Both sides put up the same amount. It is locked until the game ends, and returned in
              full on a draw or an abort.
            </div>
          )}
        </div>
      ) : null}

      {inviteUrl ? (
        <div className="border-accent/35 rounded-[14px] border bg-white/4 px-5 py-4.5">
          <div className="mb-2 text-[12px] font-normal text-white/50">
            Your game is open. Share this link and the first person to open it takes the other side.
          </div>
          <div className="flex gap-2">
            <div className="text-accent ws-inset min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-[12px]">
              {inviteUrl}
            </div>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(inviteUrl);
                toast.success("Link copied.");
              }}
              className="bg-accent text-ink cursor-pointer rounded-lg px-4 font-sans text-[12px] font-bold"
            >
              Copy
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => void onCreate()}
          disabled={create.isPending || !!stakeError}
          className="text-ink w-full cursor-pointer rounded-full bg-white p-3.5 font-sans text-[14px] font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {create.isPending
            ? "Creating game…"
            : mode === "invite"
              ? "Create game & get invite link"
              : "Create game & find opponent"}
        </button>
      )}

      <CashierSheet open={cashierOpen} onClose={() => setCashierOpen(false)} />
    </div>
  );
}
