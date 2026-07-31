"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCreateSwiss, useSwissList } from "@/hooks/use-chess-swiss";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";
import { useCashierConfig, usePlayerBalance } from "@/hooks/use-chess-cashier";
import {
  CasinoEmpty,
  CasinoError,
  CasinoLoading,
} from "@/components/dashboard/casino/casino-state";
import { formatUsdc, requireUsdc } from "@/lib/casino/cashier-money";
import { checkForbiddenPairings } from "@/lib/casino/swiss-pairings";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import { TIME_CONTROL_PRESETS, type ChessTimeControl } from "@/lib/casino/api/types";

const ROUND_OPTIONS = [3, 5, 7, 9];

const DECIMAL = /^\d*\.?\d*$/;

const STATE_LABEL: Record<string, string> = {
  created: "Not started",
  started: "In progress",
  finished: "Finished",
};

export function SwissListSection() {
  const router = useRouter();
  const wallet = useCasinoWallet();
  const { tournaments, isLoading, error, refetch } = useSwissList();
  const create = useCreateSwiss();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(5);
  const [timeControl, setTimeControl] = useState<ChessTimeControl>("5+3");
  const [password, setPassword] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [forbidden, setForbidden] = useState("");

  // Nobody has entered yet at creation time, so only the shape is checked.
  const forbiddenError = checkForbiddenPairings(forbidden);

  const { enabled: cashierOn } = useCashierConfig();
  const { availableMicro } = usePlayerBalance();

  // An entry fee is optional. The organizer pays it too when they join, so it
  // is checked against their balance before the tournament is opened.
  let entryFeeMicro: bigint | null = null;
  let entryFeeError: string | null = null;
  if (cashierOn && entryFee.trim()) {
    try {
      entryFeeMicro = requireUsdc(entryFee);
      if (entryFeeMicro > (availableMicro ?? 0n)) entryFeeError = "More than your chess balance.";
    } catch (e) {
      entryFeeError = (e as Error).message;
    }
  }

  // The service requires 2 to 60 characters for a tournament name.
  const nameValid = name.trim().length >= 2 && name.trim().length <= 60;

  const onCreate = async () => {
    if (!wallet.connected) {
      toast.error("Connect your wallet to run a tournament.");
      return;
    }
    if (!nameValid) return;
    const id = toast.loading("Creating the tournament…");
    try {
      const swiss = await create.mutateAsync({
        name: name.trim(),
        totalRounds: rounds,
        timeControl,
        // Sent only when set; an empty string would make the tournament
        // joinable by anyone who guesses "".
        ...(password.trim() ? { password: password.trim() } : {}),
        ...(entryFeeMicro ? { entryFeeMicro } : {}),
        ...(forbidden.trim() ? { forbiddenPairings: forbidden } : {}),
      });
      toast.success("Tournament created. Share it so players can join.", { id });
      router.push(`/casino/chess/tournament?id=${swiss.id}`);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't create that tournament."), { id });
    }
  };

  const chip = (active: boolean) =>
    `cursor-pointer rounded-lg border border-white/10 px-3.5 py-2 font-sans text-[13px] transition-colors ${
      active ? "bg-accent text-ink border-accent font-semibold" : "text-white hover:bg-white/6"
    }`;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pt-8 pb-20 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="ws-display text-[26px]">Tournaments</div>
          <div className="text-[12.5px] font-normal text-white/55">
            Swiss pairing: everyone plays every round, matched against someone on a similar score.
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-ink cursor-pointer rounded-full bg-white px-5 py-2.5 font-sans text-[13px] font-bold"
        >
          {open ? "Cancel" : "Create tournament"}
        </button>
      </div>

      {open ? (
        <div className="ws-glass mb-8 rounded-2xl p-5.5">
          <div className="mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
            Name
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday night swiss"
            maxLength={60}
            aria-label="Tournament name"
            className="ws-inset focus:border-accent/50 mb-4.5 w-full rounded-[10px] px-3.5 py-2.5 font-sans text-[15px] text-white outline-none"
          />

          <div className="mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
            Rounds
          </div>
          <div className="mb-4.5 flex flex-wrap gap-2">
            {ROUND_OPTIONS.map((r) => (
              <button key={r} onClick={() => setRounds(r)} className={chip(rounds === r)}>
                {r}
              </button>
            ))}
          </div>

          <div className="mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
            Time control
          </div>
          <div className="mb-4.5 flex flex-wrap gap-2">
            {TIME_CONTROL_PRESETS.map((tc) => (
              <button
                key={tc}
                onClick={() => setTimeControl(tc)}
                className={chip(timeControl === tc)}
              >
                {tc}
              </button>
            ))}
          </div>

          <div className="mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
            Entry code (optional)
          </div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave empty to let anyone join"
            aria-label="Entry code"
            className="ws-inset focus:border-accent/50 mb-4.5 w-full rounded-[10px] px-3.5 py-2.5 font-sans text-[15px] text-white outline-none"
          />

          {cashierOn ? (
            <>
              <div className="mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
                Entry fee (optional)
              </div>
              <input
                value={entryFee}
                onChange={(e) => {
                  if (e.target.value === "" || DECIMAL.test(e.target.value))
                    setEntryFee(e.target.value);
                }}
                inputMode="decimal"
                placeholder="Leave empty to play for nothing"
                aria-label="Entry fee in USDC"
                aria-invalid={!!entryFeeError}
                className="ws-inset focus:border-accent/50 tnum mb-2 w-full rounded-[10px] px-3.5 py-2.5 font-sans text-[15px] text-white outline-none placeholder:text-[13px] placeholder:text-white/25"
              />
              {entryFeeError ? (
                <div role="alert" className="text-down mb-4.5 text-[12px] font-normal">
                  {entryFeeError}
                </div>
              ) : (
                <div className="mb-4.5 text-[11.5px] font-normal text-white/50">
                  Every entrant pays it in, including you. The winner takes the pot; anyone who
                  withdraws before round one gets theirs back.
                </div>
              )}
            </>
          ) : null}

          <div className="mb-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
            Never pair (optional)
          </div>
          <textarea
            value={forbidden}
            onChange={(e) => setForbidden(e.target.value)}
            rows={3}
            placeholder={"Two names per line, e.g.\nalice bob"}
            aria-label="Pairs to avoid"
            aria-invalid={!!forbiddenError}
            className="ws-inset focus:border-accent/50 mb-2 w-full resize-y rounded-[10px] px-3.5 py-2.5 font-sans text-[13px] text-white outline-none placeholder:text-white/25"
          />
          {forbiddenError ? (
            <div role="alert" className="text-down mb-4.5 text-[12px] font-normal">
              {forbiddenError}
            </div>
          ) : (
            <div className="mb-4.5 text-[11.5px] font-normal text-white/50">
              Pairs the draw should keep apart, such as two people on the same team.
            </div>
          )}

          <button
            onClick={() => void onCreate()}
            disabled={!nameValid || !!entryFeeError || !!forbiddenError || create.isPending}
            className="text-ink w-full cursor-pointer rounded-full bg-white p-3.5 font-sans text-[14px] font-bold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {create.isPending ? "Creating…" : nameValid ? "Create tournament" : "Name it first"}
          </button>
          <div className="mt-2.5 text-[11.5px] font-normal text-white/50">
            You run it: players join, then you start each round when the last one has finished.
          </div>
        </div>
      ) : null}

      {error ? (
        <CasinoError error={error} subject="tournaments" onRetry={refetch} />
      ) : isLoading ? (
        <CasinoLoading label="Loading tournaments" rows={4} />
      ) : tournaments.length === 0 ? (
        <CasinoEmpty>No tournaments yet. Create one and players can enter it.</CasinoEmpty>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-white/8">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] bg-white/4 px-4.5 py-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
              <div>Tournament</div>
              <div>Status</div>
              <div>Round</div>
              <div>Players</div>
              <div>Time control</div>
            </div>
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/casino/chess/tournament?id=${t.id}`}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center border-t border-white/6 px-4.5 py-3 text-[13px] transition-colors hover:bg-white/4"
              >
                <div className="min-w-0">
                  <div className="truncate">{t.name}</div>
                  <div className="truncate text-[11.5px] font-normal text-white/45">
                    by {t.organizer}
                  </div>
                </div>
                <div className="font-normal text-white/60">{STATE_LABEL[t.state] ?? t.state}</div>
                <div className="tnum font-normal text-white/60">
                  {t.round} / {t.totalRounds}
                </div>
                <div className="tnum font-normal text-white/60">{t.playerCount}</div>
                <div className="tnum font-normal text-white/60">
                  {t.timeControl}
                  {t.entryFeeMicro ? (
                    <span className="text-accent ml-2 font-semibold">
                      {formatUsdc(t.entryFeeMicro)} USDC
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
