"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { formatEther } from "viem";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LockIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModalShell } from "@/components/ui/modal-shell";
import { useMoney } from "@/components/ui/currency-select";
import { VaultFundSheet } from "@/components/dashboard/vault/vault-fund-sheet";
import { useVaultGame } from "@/hooks/use-vault-game";
import { useVaultActions } from "@/hooks/use-vault-actions";
import { usePortfolio } from "@/hooks/use-portfolio";
import { fetchPendingWinnings } from "@/lib/vault-api";
import { getWalletAddress } from "@/lib/user";
import { truncateAddress } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";

const EXPLORER_TX_URL = "https://basescan.org/tx/";
const EXPLORER_ADDRESS_URL = "https://basescan.org/address/";
const PENDING_POLL_MS = 15_000;

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Ticks a server-reported "seconds remaining" down locally between updates,
// resetting whenever a fresh value arrives from the socket or REST poll.
function useCountdown(serverSeconds: number, active: boolean): number {
  const [lastServerSeconds, setLastServerSeconds] = useState(serverSeconds);
  const [seconds, setSeconds] = useState(serverSeconds);

  if (serverSeconds !== lastServerSeconds) {
    setLastServerSeconds(serverSeconds);
    setSeconds(serverSeconds);
  }

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);

  return seconds;
}

export function VaultSection() {
  const { user } = usePrivy();
  const money = useMoney();
  const { tokens, refetch: refetchPortfolio } = usePortfolio();
  const { status, statusLoading, activities, winners, winnersLoading, connected } = useVaultGame();
  const { wager, wagering, claim, claiming } = useVaultActions();
  const [fundOpen, setFundOpen] = useState(false);

  const address = getWalletAddress(user, "ethereum");
  const pending = useQuery({
    queryKey: ["vault-pending-winnings", address],
    queryFn: () => fetchPendingWinnings(address as string),
    enabled: Boolean(address),
    staleTime: PENDING_POLL_MS,
    refetchInterval: PENDING_POLL_MS,
  });

  // The balance the player spends from is their own money on the platform. We
  // present everything as plain dollars — the underlying asset (ETH on Base)
  // is never shown, so it feels like moving cash between accounts.
  const ethHolding = tokens.find(
    (t) => t.network === "base-mainnet" && t.symbol.toUpperCase() === "ETH"
  );
  const balanceEth = ethHolding?.balance ?? 0;
  const balanceUsd = ethHolding?.valueUsd ?? 0;
  const entryFeeEth = status ? Number(status.entryFee.amount) : 0;
  const entryFeeUsd = status?.entryFee.usdValue ?? 0;
  const canPlay = entryFeeEth > 0 && balanceEth >= entryFeeEth;

  // Dollar value of an on-chain (wei) amount, derived from the entry fee's
  // token/USD pair the backend already gives us — so the activity feed and
  // winners read in money, not crypto.
  const unitUsd = status && entryFeeEth > 0 ? entryFeeUsd / entryFeeEth : 0;
  const weiToMoney = (wei: string): string => {
    try {
      return money.format(Number(formatEther(BigInt(wei))) * unitUsd);
    } catch {
      return "—";
    }
  };

  // Only trust timeRemaining while a round is live; between rounds the backend
  // reports a sentinel, so the timer rests at the round length instead.
  const gameActive = status?.gameActive ?? false;
  const countdown = useCountdown(status?.timeRemaining ?? 0, gameActive);
  const timerPct =
    gameActive && status ? Math.min(100, (countdown / Math.max(1, status.timerDuration)) * 100) : 0;
  const urgent = gameActive && countdown <= 10;

  const hasPending = (pending.data?.usdValue ?? 0) > 0;

  const onPlay = async () => {
    if (!canPlay) {
      setFundOpen(true);
      return;
    }
    try {
      await wager();
      toast.success("You're in — last one standing takes the pot.");
      void refetchPortfolio();
    } catch (e) {
      toast.error(friendlyError(e, "That didn't go through."));
    }
  };

  const onClaim = async () => {
    try {
      await claim();
      toast.success("Winnings added to your balance.");
      void refetchPortfolio();
      void pending.refetch();
    } catch (e) {
      toast.error(friendlyError(e, "The claim didn't go through."));
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[1520px] p-4 sm:p-6 lg:p-8">
      {/* Ambient accent glow behind the game, for depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[420px] max-w-[900px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(167,139,250,0.16),transparent_70%)]"
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Vault · Winner takes all</Eyebrow>
          <h2 className="ws-serif mt-2.5 text-[clamp(28px,4vw,36px)] tracking-[-0.02em]">
            Last Standing
          </h2>
          <p className="mt-1.5 max-w-[54ch] text-[13.5px] font-normal text-white/55">
            Play to become the last one standing. When the timer runs out, the last player to play
            takes the whole pot.
          </p>
        </div>
        <span className="ws-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-white/70">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-up animate-pulse" : "bg-white/25"}`}
          />
          {connected ? "Live" : "Offline"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 min-[980px]:grid-cols-[1fr_360px] min-[980px]:items-start">
        {/* Game panel */}
        <div className="ws-glass relative overflow-hidden rounded-[22px] p-5 sm:p-7">
          <div
            aria-hidden
            className="bg-accent/25 pointer-events-none absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-[90px]"
          />
          <div className="relative">
            <div className="text-[11px] font-medium tracking-[0.16em] text-white/45 uppercase">
              Prize pool
            </div>
            {statusLoading || !status ? (
              <div className="mt-2 h-[56px] w-52 animate-pulse rounded-xl bg-white/8" />
            ) : (
              <div className="ws-serif tnum mt-1.5 text-[clamp(44px,7vw,62px)] leading-none tracking-[-0.02em]">
                {money.format(status.vaultBalance.usdValue)}
              </div>
            )}
            <div className="mt-1.5 text-[13px] font-normal text-white/45">
              The whole pot goes to the last player standing.
            </div>

            {/* Countdown — the centerpiece. */}
            <div className="ws-inset mt-6 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-[0.14em] text-white/45 uppercase">
                  Time remaining
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                    gameActive ? (urgent ? "text-down" : "text-accent") : "text-white/40"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      gameActive
                        ? urgent
                          ? "bg-down animate-pulse"
                          : "bg-accent animate-pulse"
                        : "bg-white/30"
                    }`}
                  />
                  {gameActive
                    ? urgent
                      ? "Ending"
                      : "Live round"
                    : status?.isGameStarted
                      ? "Round ended"
                      : "Idle"}
                </span>
              </div>
              <div
                className={`ws-serif tnum mt-2 text-center text-[clamp(44px,9vw,60px)] leading-none tracking-[-0.01em] ${
                  gameActive ? (urgent ? "text-down animate-pulse" : "text-white") : "text-white/30"
                }`}
              >
                {gameActive
                  ? formatCountdown(countdown)
                  : formatCountdown(status?.timerDuration ?? 0)}
              </div>
              <div className="mt-3.5">
                <ProgressBar
                  pct={gameActive ? timerPct : 0}
                  color={urgent ? "#F6A5A5" : "#A78BFA"}
                />
              </div>
              <div className="mt-2.5 text-center text-[12px] font-normal text-white/45">
                {gameActive
                  ? "Be the last to play when the clock hits zero to take the pot."
                  : status?.isGameStarted
                    ? "Round ended — the next play starts the clock."
                    : "Be the first to play and start the clock."}
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="ws-inset px-4 py-3">
                <div className="text-[11px] font-normal tracking-[0.04em] text-white/45 uppercase">
                  Last player
                </div>
                <div className="tnum mt-1 text-[13.5px] font-medium text-white/85">
                  {status?.lastPlayer ? truncateAddress(status.lastPlayer) : "None yet"}
                </div>
              </div>
              <div className="ws-inset px-4 py-3">
                <div className="text-[11px] font-normal tracking-[0.04em] text-white/45 uppercase">
                  Cost to play
                </div>
                <div className="tnum mt-1 text-[13.5px] font-medium text-white/85">
                  {status ? money.format(entryFeeUsd) : "—"}
                </div>
              </div>
            </div>

            {/* Play CTA — the primary action. */}
            <button
              onClick={() => void onPlay()}
              disabled={wagering || !status || !address}
              className={`mt-4 w-full cursor-pointer rounded-[14px] p-4 font-sans text-[16px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                canPlay
                  ? "bg-[linear-gradient(180deg,#b9a3ff,#8b6ef0)] text-white shadow-[0_14px_38px_-12px_rgba(167,139,250,0.8)]"
                  : "text-ink bg-white"
              }`}
            >
              {wagering
                ? "Placing your play…"
                : !status
                  ? "Loading…"
                  : canPlay
                    ? `Play · ${money.format(entryFeeUsd)}`
                    : "Add money to play"}
            </button>

            {/* Balance */}
            <div className="ws-inset mt-3 flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[11px] font-normal tracking-[0.04em] text-white/45 uppercase">
                  Your balance
                </div>
                <div className="tnum mt-0.5 text-[15px] font-semibold text-white/90">
                  {money.format(balanceUsd)}
                </div>
              </div>
              <button
                onClick={() => setFundOpen(true)}
                className="border-accent/40 bg-accent/12 text-accent hover:bg-accent/18 shrink-0 cursor-pointer rounded-xl border px-4 py-2 font-sans text-[13px] font-semibold whitespace-nowrap"
              >
                Add money
              </button>
            </div>

            {/* Winnings to claim */}
            {hasPending ? (
              <div className="border-up/30 bg-up/8 mt-3 rounded-[14px] border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-white">You won a round 🎉</div>
                    <div className="tnum text-[12.5px] font-normal text-white/60">
                      {money.format(pending.data?.usdValue ?? 0)} ready to claim
                    </div>
                  </div>
                  <button
                    onClick={() => void onClaim()}
                    disabled={claiming}
                    className="text-up-ink bg-up shrink-0 cursor-pointer rounded-xl px-4 py-2 font-sans text-[13px] font-semibold whitespace-nowrap hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {claiming ? "Claiming…" : "Claim"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Side rail */}
        <div className="flex flex-col gap-4">
          <div className="ws-glass rounded-[22px] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-white/70">Recent activity</span>
              <span className="text-[11px] font-normal text-white/35">Live feed</span>
            </div>
            {activities.length === 0 ? (
              <div className="grid place-items-center py-10 text-center text-[13px] font-normal text-white/40">
                No plays yet
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-1">
                {activities.map((a) => (
                  <a
                    key={a.id}
                    href={`${EXPLORER_TX_URL}${a.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 hover:bg-white/5"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[13px] font-normal text-white/75">
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${
                          a.action === "won" ? "bg-up/15 text-up" : "bg-accent/15 text-accent"
                        }`}
                      >
                        {a.action === "won" ? "★" : "↑"}
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="tnum">{truncateAddress(a.address)}</span>{" "}
                        {a.action === "won" ? "won" : "played"}
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-[12.5px] font-medium text-white/60">
                      {weiToMoney(a.amountWei)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="ws-glass rounded-[22px] p-5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-white/70">
              <LockIcon size={14} />
              Hall of Winners
            </div>
            {winnersLoading ? (
              <div className="mt-3 flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[42px] animate-pulse rounded-[10px] bg-white/6" />
                ))}
              </div>
            ) : winners.length === 0 ? (
              <div className="grid place-items-center py-10 text-center text-[13px] font-normal text-white/40">
                No rounds settled yet
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-1">
                {winners.map((w, i) => (
                  <a
                    key={w.id}
                    href={`${EXPLORER_ADDRESS_URL}${w.winnerAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-2 hover:bg-white/5"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[13px] font-normal text-white/75">
                      <span className="w-4 shrink-0 text-center text-[12px] text-white/35">
                        {i + 1}
                      </span>
                      <span className="tnum truncate">{truncateAddress(w.winnerAddress)}</span>
                    </span>
                    <span className="tnum text-accent shrink-0 text-[12.5px] font-medium">
                      {weiToMoney(w.winnerPrizeWei)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalShell open={fundOpen} onClose={() => setFundOpen(false)} contentKey="vault-fund">
        <VaultFundSheet onClose={() => setFundOpen(false)} />
      </ModalShell>
    </div>
  );
}
