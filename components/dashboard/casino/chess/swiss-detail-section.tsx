"use client";

import { useState } from "react";
import Link from "next/link";
import { useSwissTournament } from "@/hooks/use-chess-swiss";
import { useCasinoWallet } from "@/hooks/use-casino-wallet";
import { useCashierConfig } from "@/hooks/use-chess-cashier";
import {
  CasinoEmpty,
  CasinoError,
  CasinoLoading,
} from "@/components/dashboard/casino/casino-state";
import { formatUsdc, swissPotBreakdown } from "@/lib/casino/cashier-money";
import { checkPairings, needsManualPairings } from "@/lib/casino/swiss-pairings";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { SwissPairing } from "@/lib/casino/api/types";

const STATE_LABEL: Record<string, string> = {
  created: "Not started",
  started: "In progress",
  finished: "Finished",
};

// How a board reads once it has a result, from the point of view of the table.
function pairingOutcome(pairing: SwissPairing): string {
  switch (pairing.state) {
    case "bye":
      return "Bye";
    case "ongoing":
      return "Playing";
    case "draw":
      return "Draw";
    case "white":
      return pairing.isForfeit ? "White won by forfeit" : "White won";
    case "black":
      return pairing.isForfeit ? "Black won by forfeit" : "Black won";
  }
}

export function SwissDetailSection({ swissId }: { swissId: string | null }) {
  const wallet = useCasinoWallet();
  const {
    tournament,
    identity,
    isOrganizer,
    isEntrant,
    canStartRound,
    isLoading,
    error,
    join,
    joining,
    withdraw,
    withdrawing,
    startNextRound,
    startingRound,
  } = useSwissTournament(swissId);

  // A protected tournament does not advertise itself as protected, so the code
  // field only appears once the service has refused a join for wanting one.
  const [codeNeeded, setCodeNeeded] = useState(false);
  const [code, setCode] = useState("");
  // Set once the player has seen what a paid entry costs. The next press enters.
  const [feeConfirmed, setFeeConfirmed] = useState(false);
  // The service asked the organizer to pair the round by hand.
  const [pairingsNeeded, setPairingsNeeded] = useState(false);
  const [pairings, setPairings] = useState("");

  const { config } = useCashierConfig();

  const frame = (children: React.ReactNode) => (
    <div className="mx-auto w-full max-w-[1100px] px-4 pt-8 pb-20 sm:px-6">{children}</div>
  );

  if (!swissId) return frame(<CasinoEmpty>No tournament selected.</CasinoEmpty>);
  if (error) return frame(<CasinoError error={error} subject="this tournament" />);
  if (isLoading || !tournament) return frame(<CasinoLoading label="Loading tournament" rows={5} />);

  // The pot grows with every entrant, so it is derived from the current count
  // rather than stored.
  const pot = tournament.entryFeeMicro
    ? swissPotBreakdown(
        tournament.entryFeeMicro,
        tournament.playerCount,
        config?.platformFeeBps ?? 0
      )
    : null;

  // A tournament is joined from its own page, so sharing it is sharing this
  // URL. Copied rather than shown, since it is long and nobody types it.
  const onShare = () => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success(
      tournament.entryFeeMicro
        ? "Link copied. Anyone who opens it can pay the entry fee and join."
        : "Link copied. Anyone who opens it can join."
    );
  };

  const onJoin = async () => {
    if (!wallet.connected) {
      toast.error("Connect your wallet to enter.");
      return;
    }
    // A paid entry locks the fee, so it is confirmed rather than taken on one
    // click.
    if (tournament.entryFeeMicro && !feeConfirmed) {
      setFeeConfirmed(true);
      return;
    }
    const id = toast.loading("Entering…");
    try {
      await join(code.trim() || undefined);
      setCodeNeeded(false);
      setCode("");
      toast.success("You're in. Wait for the organizer to start the round.", { id });
    } catch (e) {
      // FORBIDDEN here means the entry code was wrong or missing, which is a
      // thing the player can fix rather than a failure.
      if ((e as { code?: string } | null)?.code === "FORBIDDEN") {
        setCodeNeeded(true);
        toast.error(
          code.trim() ? "That entry code is wrong." : "This tournament needs an entry code.",
          {
            id,
          }
        );
        return;
      }
      toast.error(friendlyError(e, "Couldn't enter that tournament."), { id });
    }
  };

  // Mid-tournament, leaving concedes whatever you are playing; before it starts
  // there is nothing to concede. On a paid tournament the same line divides a
  // refund from a forfeited fee, which is why the button says which it will be.
  const onWithdraw = async () => {
    const started = tournament.state !== "created";
    const id = toast.loading("Withdrawing…");
    try {
      await withdraw(started);
      toast.success(
        started
          ? tournament.entryFeeMicro
            ? "Withdrawn. Your open game is conceded and your entry fee stays in the pot."
            : "Withdrawn. Your open game is conceded."
          : tournament.entryFeeMicro
            ? "Withdrawn. Your entry fee has been returned."
            : "Withdrawn.",
        { id }
      );
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't withdraw."), { id });
    }
  };

  const entrants = tournament.standings.filter((s) => !s.absent).map((s) => s.name);

  const onNextRound = async (manual?: string) => {
    const id = toast.loading("Pairing the next round…");
    try {
      await startNextRound(manual);
      setPairingsNeeded(false);
      setPairings("");
      toast.success("Round paired. Boards are live.", { id });
    } catch (e) {
      // The service pairs each round itself, but falls back to asking the
      // organizer when it has no pairing engine available. That is a request
      // for input, not a failure.
      if (!manual && needsManualPairings(e)) {
        setPairingsNeeded(true);
        toast.error("This tournament needs you to pair the round yourself.", { id });
        return;
      }
      toast.error(friendlyError(e, "Couldn't start the next round."), { id });
    }
  };

  const onManualRound = async () => {
    const check = checkPairings(pairings, entrants);
    if (check.error) {
      toast.error(check.error);
      return;
    }
    if (check.unassigned.length) {
      toast.warning(`${check.unassigned.join(", ")} will sit this round out.`);
    }
    await onNextRound(pairings);
  };

  const finished = tournament.state === "finished";

  return frame(
    <>
      <Link
        href="/casino/chess/tournaments"
        className="mb-4 inline-block text-[12.5px] font-normal text-white/50 hover:text-white"
      >
        ← All tournaments
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="ws-display truncate text-[26px]">{tournament.name}</div>
          <div className="text-[12.5px] font-normal text-white/55">
            {STATE_LABEL[tournament.state] ?? tournament.state} · round {tournament.round} of{" "}
            {tournament.totalRounds} · {tournament.playerCount} players · {tournament.timeControl}
          </div>
          <div className="mt-1 text-[11.5px] font-normal text-white/40">
            Run by {tournament.organizer}
            {identity ? ` · you play as ${identity}` : ""}
          </div>

          {tournament.entryFeeMicro ? (
            <div className="tnum mt-2.5 text-[12.5px] font-normal text-white/60">
              <span className="text-accent font-semibold">
                {formatUsdc(tournament.entryFeeMicro)} USDC
              </span>{" "}
              to enter · pot {formatUsdc(pot?.potMicro ?? 0n)} · winner takes{" "}
              {formatUsdc(pot?.payoutMicro ?? 0n)} USDC
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onShare}
            className="ws-inset cursor-pointer rounded-full px-4 py-2.5 font-sans text-[13px] font-semibold text-white/75 transition-colors hover:border-white/30 hover:text-white"
          >
            Share
          </button>

          {isOrganizer ? (
            <button
              onClick={() => void onNextRound()}
              disabled={!canStartRound || startingRound || pairingsNeeded}
              title={
                canStartRound
                  ? undefined
                  : tournament.ongoingCount > 0
                    ? "Wait for this round's games to finish"
                    : tournament.playerCount < 2
                      ? "At least two players have to enter"
                      : "No rounds left to play"
              }
              className="text-ink cursor-pointer rounded-full bg-white px-5 py-2.5 font-sans text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-45"
            >
              {startingRound
                ? "Pairing…"
                : tournament.round === 0
                  ? "Start round 1"
                  : `Start round ${tournament.round + 1}`}
            </button>
          ) : null}

          {!finished ? (
            isEntrant ? (
              <button
                onClick={() => void onWithdraw()}
                disabled={withdrawing}
                title={
                  tournament.entryFeeMicro
                    ? tournament.state === "created"
                      ? "Your entry fee is returned in full."
                      : "Your entry fee stays in the pot."
                    : undefined
                }
                className="border-down/40 text-down cursor-pointer rounded-full border px-5 py-2.5 font-sans text-[13px] font-bold disabled:opacity-50"
              >
                {withdrawing
                  ? "Withdrawing…"
                  : tournament.entryFeeMicro
                    ? tournament.state === "created"
                      ? "Withdraw & refund"
                      : "Withdraw & forfeit fee"
                    : "Withdraw"}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {codeNeeded ? (
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Entry code"
                    aria-label="Entry code"
                    autoFocus
                    className="ws-inset focus:border-accent/50 w-[160px] rounded-full px-4 py-2.5 font-sans text-[13px] text-white outline-none"
                  />
                ) : null}
                <button
                  onClick={() => void onJoin()}
                  disabled={joining || (codeNeeded && !code.trim())}
                  className="bg-up text-up-ink cursor-pointer rounded-full px-5 py-2.5 font-sans text-[13px] font-bold disabled:opacity-50"
                >
                  {joining
                    ? "Entering…"
                    : codeNeeded
                      ? "Enter with code"
                      : tournament.entryFeeMicro && feeConfirmed
                        ? `Pay ${formatUsdc(tournament.entryFeeMicro)} USDC & enter`
                        : tournament.entryFeeMicro
                          ? `Enter for ${formatUsdc(tournament.entryFeeMicro)} USDC`
                          : "Enter tournament"}
                </button>
              </div>
            )
          ) : null}
        </div>
      </div>

      {pairingsNeeded && isOrganizer ? (
        <div className="ws-glass mb-6 rounded-2xl p-5.5">
          <div className="ws-display mb-1 text-[16px]">Pair this round yourself</div>
          <div className="mb-3 text-[12px] font-normal text-white/55">
            One pairing per line as &quot;white black&quot;, or &quot;player 1&quot; to give someone
            a bye. Anyone you leave out sits the round out.
          </div>
          <textarea
            value={pairings}
            onChange={(e) => setPairings(e.target.value)}
            rows={Math.max(3, Math.ceil(entrants.length / 2))}
            placeholder={entrants.slice(0, 2).join(" ") || "alice bob"}
            aria-label="Round pairings"
            className="ws-inset focus:border-accent/50 mb-2 w-full resize-y rounded-[10px] px-3.5 py-2.5 font-sans text-[13px] text-white outline-none placeholder:text-white/25"
          />
          <div className="mb-3 text-[11.5px] font-normal text-white/45">
            Playing: {entrants.join(", ") || "nobody yet"}
          </div>
          <button
            onClick={() => void onManualRound()}
            disabled={startingRound || !pairings.trim()}
            className="text-ink cursor-pointer rounded-full bg-white px-5 py-2.5 font-sans text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {startingRound ? "Pairing…" : "Start the round"}
          </button>
        </div>
      ) : null}

      {finished && tournament.winner ? (
        <div className="border-accent/35 mb-6 rounded-[14px] border bg-white/4 px-5 py-4">
          <div className="text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
            Winner
          </div>
          <div className="ws-display text-grey-100 text-[22px]">{tournament.winner}</div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-[320px] flex-1">
          <div className="ws-display mb-3 text-[18px]">Standings</div>
          {tournament.standings.length === 0 ? (
            <CasinoEmpty>Nobody has entered yet.</CasinoEmpty>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-white/8">
              <div className="min-w-[420px]">
                <div className="grid grid-cols-[40px_2fr_60px_60px_1fr] bg-white/4 px-4 py-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
                  <div>#</div>
                  <div>Player</div>
                  <div>Pts</div>
                  <div>TB</div>
                  <div>W/D/L</div>
                </div>
                {tournament.standings.map((s) => (
                  <div
                    key={s.name}
                    className={`grid grid-cols-[40px_2fr_60px_60px_1fr] items-center border-t border-white/6 px-4 py-2.5 text-[13px] ${
                      s.name === identity ? "bg-white/6" : ""
                    }`}
                  >
                    <div className="tnum font-normal text-white/50">{s.rank}</div>
                    <div className="truncate">
                      {s.name}
                      {s.absent ? (
                        <span className="ml-1.5 text-[11px] font-normal text-white/40">
                          withdrawn
                        </span>
                      ) : null}
                    </div>
                    <div className="tnum text-grey-100">{s.points}</div>
                    <div className="tnum font-normal text-white/50">{s.tieBreak}</div>
                    <div className="tnum font-normal text-white/50">
                      {s.wins}/{s.draws}/{s.losses}
                      {s.byes > 0 ? ` (+${s.byes} bye)` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-[320px] flex-1">
          <div className="ws-display mb-3 text-[18px]">Rounds</div>
          {tournament.rounds.length === 0 ? (
            <CasinoEmpty>No rounds paired yet.</CasinoEmpty>
          ) : (
            <div className="flex flex-col gap-4">
              {tournament.rounds.map((round) => (
                <div key={round.round} className="rounded-[14px] border border-white/8">
                  <div className="bg-white/4 px-4 py-2.5 text-[11px] font-normal tracking-[0.05em] text-white/50 uppercase">
                    Round {round.round}
                  </div>
                  {round.pairings.map((p) => {
                    const body = (
                      <>
                        <div className="min-w-0 truncate">
                          {p.white ?? "—"}
                          <span className="px-1.5 font-normal text-white/40">vs</span>
                          {p.black ?? "—"}
                        </div>
                        <div className="text-right text-[12px] font-normal whitespace-nowrap text-white/55">
                          {pairingOutcome(p)}
                        </div>
                      </>
                    );
                    const className =
                      "grid grid-cols-[1fr_auto] items-center gap-3 border-t border-white/6 px-4 py-2.5 text-[13px]";
                    // A bye has no board to open.
                    return p.matchId ? (
                      <Link
                        key={p.board}
                        href={`/casino/chess/${p.state === "ongoing" ? "play" : "watch"}?match=${p.matchId}`}
                        className={`${className} transition-colors hover:bg-white/4`}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div key={p.board} className={className}>
                        {body}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
