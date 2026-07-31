"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAcceptChallenge, useChessMatch, useRematchOffer } from "@/hooks/use-casino-chess";
import { useCasinoNavGuard } from "@/components/dashboard/casino/casino-nav-guard";
import { ChessBoard } from "@/components/dashboard/casino/chess/chess-board";
import {
  CasinoEmpty,
  CasinoError,
  CasinoLoading,
} from "@/components/dashboard/casino/casino-state";
import {
  fromUci,
  legalMovesForPiece,
  parseFen,
  toUci,
  type Square,
} from "@/lib/casino/chess/engine";
import { parseTimeControl } from "@/lib/casino/api/chess-wire";
import { AUTO_RESIGN_FRACTION, useChessIdle } from "@/hooks/use-chess-idle";
import { useChessPgn } from "@/hooks/use-chess-pgn";
import { useRefreshBalance } from "@/hooks/use-chess-cashier";
import { StakeBadge } from "@/components/dashboard/casino/chess/stake-badge";
import { formatUsdc, potBreakdown } from "@/lib/casino/cashier-money";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/lib/toast";
import type { ChessColor, ChessMatch } from "@/lib/casino/api/types";

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const DRAW_LABEL: Record<string, string> = {
  stalemate: "stalemate",
  agreement: "agreement",
  repetition: "threefold repetition",
  insufficient: "insufficient material",
  fifty_move: "fifty-move rule",
};

const WIN_LABEL: Record<string, string> = {
  checkmate: "Checkmate",
  resignation: "Resignation",
  timeout: "Flag fall",
  forfeit: "Forfeit",
};

function isOver(match: ChessMatch): boolean {
  return match.state === "settled" || match.state === "cancelled";
}

// What happened to the money. Read from the wager's own state rather than
// inferred from the result, so it says what the service actually did.
function settlementLine(match: ChessMatch, you: ChessColor | null): string {
  const wager = match.wager;
  if (!wager) return "";
  const stake = `${formatUsdc(wager.stakeMicro)} USDC`;

  if (wager.state === "refunded" || match.state === "cancelled") {
    return `Your ${stake} stake was returned.`;
  }
  if (match.result?.kind === "draw") {
    return `Drawn, so both stakes were returned. You get your ${stake} back.`;
  }
  if (wager.state !== "settled") {
    // The game is over but the service has not settled yet. Saying nothing
    // beats claiming a payout that has not happened.
    return `${stake} a side is still being settled.`;
  }

  const { potMicro, feeMicro, payoutMicro } = potBreakdown(wager.stakeMicro, wager.feeBps);
  // The draw case returned above, so a result here always names a winner.
  if (you !== null && match.result) {
    return match.result.winner === you
      ? `You won the ${formatUsdc(potMicro)} USDC pot. After a ${formatUsdc(feeMicro)} fee, ${formatUsdc(payoutMicro)} USDC is yours.`
      : `You lost your ${stake} stake.`;
  }
  return `The winner takes ${formatUsdc(payoutMicro)} USDC.`;
}

function resultLine(match: ChessMatch, you: ChessColor | null): string {
  const r = match.result;
  if (!r) return match.state === "cancelled" ? "Game aborted" : "";
  if (r.kind === "draw") return `Draw · ${DRAW_LABEL[r.reason] ?? r.reason}`;
  const how = WIN_LABEL[r.kind] ?? "Result";
  if (you === null) return `${how} · ${r.winner === "w" ? "White" : "Black"} won`;
  return `${how} · You ${r.winner === you ? "won" : "lost"}`;
}

const actionButton =
  "cursor-pointer rounded-full border border-white/15 px-3.5 py-1.5 font-sans text-[11.5px] font-semibold whitespace-nowrap text-white/70 transition-colors hover:border-white/35 hover:text-white disabled:opacity-50";

export function PlaySection({ matchId }: { matchId: string | null }) {
  const router = useRouter();
  const {
    match,
    clocks,
    you,
    isLoading,
    error,
    submitMove,
    moving,
    resign,
    resigning,
    offerDraw,
    offeringDraw,
    respondToDraw,
    respondingToDraw,
    abort,
    aborting,
    rematch,
    requestingRematch,
    claimingTimeout,
    claimDraw,
    claimingDraw,
  } = useChessMatch(matchId);
  const pgn = useChessPgn(matchId);
  const refreshBalance = useRefreshBalance();
  const [selected, setSelected] = useState<Square | null>(null);
  const [leavePrompt, setLeavePrompt] = useState(false);
  const navGuard = useCasinoNavGuard();
  // A rematch the opponent has already opened, which this player joins rather
  // than opening a second one of their own.
  const rematchOffered = useRematchOffer(match, you);
  const acceptRematch = useAcceptChallenge();

  // The board is whatever the server says. A malformed FEN yields null rather
  // than a silently half-rendered position.
  const position = useMemo(() => {
    if (!match) return null;
    try {
      return parseFen(match.fen);
    } catch {
      return null;
    }
  }, [match]);

  const yourTurn = !!match && match.state === "in_progress" && you !== null && match.turn === you;

  // The squares the last move ran between, so the board can show what just
  // happened. SAN cannot be turned back into squares without replaying the
  // game, which is why the match carries the coordinate form as well. Parsing
  // four characters is cheaper than memoizing it.
  const lastMove = match?.lastMoveUci ? fromUci(match.lastMoveUci) : null;

  // Highlights are computed locally only so the board feels responsive. The
  // server revalidates every move, so a wrong hint can never become a wrong
  // result.
  const legalTargets = useMemo(() => {
    if (!position || !selected || !yourTurn) return [];
    return legalMovesForPiece(position.board, selected.r, selected.c);
  }, [position, selected, yourTurn]);

  // Sitting on a move leaves the opponent watching a clock alone, so a player
  // who has stopped playing is nudged, then resigned for. Thresholds are
  // fractions of the starting clock, which the label carries.
  const initialSeconds = useMemo(() => {
    if (!match) return 0;
    try {
      return parseTimeControl(match.timeControl).initialSeconds;
    } catch {
      return 0;
    }
  }, [match]);

  const onIdleResign = useCallback(async () => {
    const id = toast.loading("You stopped playing, so the game was resigned…");
    try {
      await resign();
      toast.success("Resigned after no move was made.", { id });
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't resign."), { id });
    }
  }, [resign]);

  const idle = useChessIdle({
    active: !!match && match.state === "in_progress" && you !== null && match.turn === you,
    initialSeconds,
    since: match?.clockUpdatedAt ?? "",
    turnKey: match?.ply ?? 0,
    onAutoResign: () => void onIdleResign(),
  });

  // A staked game settles when it ends, so the chess balance the lobby shows is
  // stale from that moment. Refreshed once per finished game.
  const settledId = match && match.wager && isOver(match) ? match.id : null;
  useEffect(() => {
    if (settledId) refreshBalance();
  }, [settledId, refreshBalance]);

  // Walking out of a game in progress abandons an opponent to a running clock,
  // and the only way to end it is to resign. So Back is intercepted and the
  // choice made explicit rather than taken silently either way.
  const inPlay = !!match && match.state === "in_progress" && you !== null;
  const leavingRef = useRef(false);

  // The chrome's back link asks this before navigating, so leaving by that
  // route gets the same question as leaving by the browser's Back.
  useEffect(() => {
    if (!inPlay) return;
    navGuard.setGuard(() => {
      setLeavePrompt(true);
      return true;
    });
    return () => navGuard.setGuard(null);
  }, [inPlay, navGuard]);

  useEffect(() => {
    if (!inPlay) return;
    // A sentinel entry, so the first Back lands here instead of leaving.
    const hold = () => window.history.pushState({ chessLeaveGuard: true }, "");
    hold();

    const onPopState = () => {
      if (leavingRef.current) return;
      // Re-arm: the entry just consumed is replaced, so Back keeps landing here
      // until the player has actually decided.
      hold();
      setLeavePrompt(true);
    };
    // Closing or reloading the tab gets the browser's own prompt. The wording
    // is the browser's to choose; we can only ask for it.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leavingRef.current) return;
      event.preventDefault();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [inPlay]);

  if (!matchId) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 pt-10 pb-20">
        <CasinoEmpty>No game selected. Pick one from the lobby to start playing.</CasinoEmpty>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 pt-10 pb-20">
        <CasinoError error={error} subject="this game" />
      </div>
    );
  }
  if (isLoading || !match || !position) {
    return (
      <div className="mx-auto w-full max-w-[560px] px-4 pt-10 pb-20">
        <CasinoLoading label="Loading the game" rows={5} />
      </div>
    );
  }

  const board = position.board;
  const over = isOver(match);
  const waiting = match.state === "awaiting_opponent";
  // A game can be abandoned right up until the first move, which includes one
  // an opponent has already joined but nobody has moved in yet.
  const abortable = !over && match.ply === 0;
  // An offer from the other side is the one this player can answer.
  const offerToAnswer = you !== null && match.drawOffered !== null && match.drawOffered !== you;
  const offerPending = you !== null && match.drawOffered === you;

  const onSquareClick = async (r: number, c: number) => {
    if (!yourTurn || moving) return;
    if (selected && legalTargets.some((t) => t.r === r && t.c === c)) {
      const uci = toUci(board, selected, { r, c });
      setSelected(null);
      try {
        await submitMove(uci);
      } catch (e) {
        toast.error(friendlyError(e, "That move didn't go through."));
      }
      return;
    }
    const piece = board[r][c];
    setSelected(piece && piece.color === you ? { r, c } : null);
  };

  const onOfferDraw = async () => {
    try {
      await offerDraw();
      toast.success("Draw offered.");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't offer a draw."));
    }
  };

  // Repetition and the fifty-move rule are claimed, not automatic, and the
  // client does not track repetition, so the service decides whether the claim
  // stands. Its refusal is the message worth showing.
  const onClaimDraw = async () => {
    try {
      await claimDraw();
      toast.success("Draw claimed.");
    } catch (e) {
      toast.error(friendlyError(e, "No draw can be claimed in this position."));
    }
  };

  const onDownloadPgn = async () => {
    try {
      await pgn.download();
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't download that game."));
    }
  };

  const onAnswerDraw = async (accept: boolean) => {
    try {
      await respondToDraw(accept);
      toast.success(accept ? "Draw agreed." : "Draw declined.");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't answer that draw offer."));
    }
  };

  const onResign = async () => {
    const id = toast.loading("Resigning…");
    try {
      await resign();
      toast.success("Game resigned.", { id });
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't resign."), { id });
    }
  };

  // Leaving for real: resign first, and only stand the guard down once the
  // server has actually accepted it, so a failed resign never strands the
  // player outside a game that is still running.
  const onResignAndLeave = async () => {
    const id = toast.loading("Resigning…");
    try {
      await resign();
      leavingRef.current = true;
      setLeavePrompt(false);
      toast.success("Game resigned.", { id });
      router.push("/casino/chess");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't resign."), { id });
    }
  };

  const onAbort = async () => {
    const id = toast.loading("Aborting…");
    try {
      await abort();
      toast.success("Game aborted.", { id });
      router.push("/casino/chess");
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't abort that game."), { id });
    }
  };

  // Opening a rematch seats only this player, so it lands on a board that waits
  // for the opponent to accept.
  const onRematch = async () => {
    const id = toast.loading("Opening a rematch…");
    try {
      const next = await rematch();
      toast.success("Rematch opened, colours swapped. Waiting for your opponent.", { id });
      router.push(`/casino/chess/play?match=${next.id}`);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't start a rematch."), { id });
    }
  };

  const onAcceptRematch = async () => {
    if (!rematchOffered) return;
    const id = toast.loading("Joining the rematch…");
    try {
      const next = await acceptRematch.mutateAsync(rematchOffered);
      toast.success("Rematch on. Good luck.", { id });
      router.push(`/casino/chess/play?match=${next.id}`);
    } catch (e) {
      toast.error(friendlyError(e, "Couldn't join that rematch."), { id });
    }
  };

  const opponent = you === "w" ? match.black : match.white;
  const self = you === "w" ? match.white : match.black;
  const opponentColor: ChessColor = you === "w" ? "b" : "w";
  const selfColor: ChessColor = you ?? "w";

  const moveList =
    match.moves.length === 0
      ? "No moves yet"
      : match.moves
          .reduce<string[]>((acc, san, i) => {
            if (i % 2 === 0) acc.push(`${i / 2 + 1}. ${san}`);
            else acc[acc.length - 1] += ` ${san}`;
            return acc;
          }, [])
          .join("  ");

  const turnLabel = over
    ? resultLine(match, you)
    : claimingTimeout
      ? "Clock ran out, ending the game…"
      : waiting
        ? "Waiting for an opponent"
        : yourTurn
          ? moving
            ? "Sending your move…"
            : "Your move"
          : you === null
            ? "Spectating"
            : offerToAnswer
              ? "Draw offered to you"
              : offerPending
                ? "Draw offer sent"
                : "Opponent thinking…";

  return (
    <div className="relative mx-auto w-full max-w-[560px] px-4 pt-7 pb-20 sm:px-6">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 text-[13.5px]">
          <span className="h-[26px] w-[26px] shrink-0 rounded-full border border-white/10 bg-white/8" />
          <span className="truncate">{opponent ? opponent.username : "Waiting for opponent"}</span>
        </div>
        <div className="tnum shrink-0 rounded-lg border border-transparent bg-white/4 px-3.5 py-1.5 text-[20px]">
          {formatClock(clocks?.[opponentColor] ?? 0)}
        </div>
      </div>

      <ChessBoard
        board={board}
        selected={selected}
        legalTargets={legalTargets}
        lastMove={lastMove}
        orientation={you ?? "w"}
        onSquareClick={you !== null && !over ? (r, c) => void onSquareClick(r, c) : undefined}
      />

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 text-[13.5px]">
          <span className="border-accent h-[26px] w-[26px] shrink-0 rounded-full border bg-white/8" />
          <span className="truncate">{self ? self.username : "You"}</span>
        </div>
        <div
          className={`tnum shrink-0 rounded-lg border px-3.5 py-1.5 text-[20px] ${
            yourTurn ? "border-accent/50 bg-white/6" : "border-transparent bg-white/4"
          }`}
        >
          {formatClock(clocks?.[selfColor] ?? 0)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="ws-inset min-w-0 flex-1 truncate rounded-[10px] px-3 py-2 text-left text-[12px] font-normal text-white/70 [direction:rtl]">
          <span className="tnum [direction:ltr] [unicode-bidi:bidi-override]">{moveList}</span>
        </div>
        <div className="text-[12px] whitespace-nowrap text-white/50">{turnLabel}</div>
        <StakeBadge wager={match.wager} />

        {you !== null && !over ? (
          abortable ? (
            <button onClick={() => void onAbort()} disabled={aborting} className={actionButton}>
              {aborting ? "…" : "Abort"}
            </button>
          ) : offerToAnswer ? (
            <>
              <button
                onClick={() => void onAnswerDraw(true)}
                disabled={respondingToDraw}
                className={actionButton}
              >
                {respondingToDraw ? "…" : "Accept draw"}
              </button>
              <button
                onClick={() => void onAnswerDraw(false)}
                disabled={respondingToDraw}
                className={actionButton}
              >
                Decline
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => void onOfferDraw()}
                disabled={offeringDraw || offerPending}
                className={actionButton}
              >
                {offeringDraw ? "…" : offerPending ? "Draw offered" : "Offer draw"}
              </button>
              <button
                onClick={() => void onClaimDraw()}
                disabled={claimingDraw}
                title="Claim a draw by threefold repetition or the fifty-move rule"
                className={actionButton}
              >
                {claimingDraw ? "…" : "Claim draw"}
              </button>
              <button
                onClick={() => void onResign()}
                disabled={resigning}
                className="border-down/40 text-down cursor-pointer rounded-full border px-3.5 py-1.5 font-sans text-[11.5px] font-semibold whitespace-nowrap disabled:opacity-50"
              >
                {resigning ? "…" : "Resign"}
              </button>
            </>
          )
        ) : null}
      </div>

      {idle.pending !== null && !leavePrompt && !over ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px] bg-black/60 backdrop-blur-md">
          <div className="ws-glass w-[320px] rounded-2xl px-8 py-9 text-center shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <div className="text-[12px] font-semibold tracking-[0.06em] text-white/70 uppercase">
              Still there?
            </div>
            <div className="mt-2.5 text-[13px] font-normal text-white/70">
              You haven&apos;t moved in a while and your opponent is waiting. Keep playing, or
              resign the game.
            </div>
            <div className="mt-2 text-[11.5px] font-normal text-white/45">
              If you still haven&apos;t moved by {Math.round(AUTO_RESIGN_FRACTION * 100)}% of your
              clock, the game resigns itself.
            </div>
            <button
              onClick={idle.dismiss}
              className="text-ink mt-5 w-full cursor-pointer rounded-full bg-white p-3 font-sans text-[13px] font-bold"
            >
              I&apos;m still playing
            </button>
            <button
              onClick={() => void onResign()}
              disabled={resigning}
              className="border-down/40 text-down mt-2.5 w-full cursor-pointer rounded-full border p-3 font-sans text-[13px] font-bold disabled:opacity-50"
            >
              {resigning ? "Resigning…" : "Resign"}
            </button>
          </div>
        </div>
      ) : null}

      {leavePrompt && !over ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px] bg-black/60 backdrop-blur-md">
          <div className="ws-glass w-[320px] rounded-2xl px-8 py-9 text-center shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <div className="text-[12px] font-semibold tracking-[0.06em] text-white/70 uppercase">
              Leave this game?
            </div>
            <div className="mt-2.5 text-[13px] font-normal text-white/70">
              The game is still running. The only way out is to resign it, which hands the win to
              your opponent.
            </div>
            <button
              onClick={() => void onResignAndLeave()}
              disabled={resigning}
              className="border-down/40 text-down mt-5 w-full cursor-pointer rounded-full border p-3 font-sans text-[13px] font-bold disabled:opacity-50"
            >
              {resigning ? "Resigning…" : "Resign and leave"}
            </button>
            <button
              onClick={() => setLeavePrompt(false)}
              className="text-ink mt-2.5 w-full cursor-pointer rounded-full bg-white p-3 font-sans text-[13px] font-bold"
            >
              Keep playing
            </button>
          </div>
        </div>
      ) : null}

      {over ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[10px] bg-black/60 backdrop-blur-md">
          <div className="ws-glass w-[320px] rounded-2xl px-8 py-9 text-center shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
            <div className="text-[12px] font-semibold tracking-[0.06em] text-white/70 uppercase">
              {resultLine(match, you)}
            </div>
            {match.wager ? (
              <div className="mt-3 text-[12.5px] font-normal text-white/70">
                {settlementLine(match, you)}
              </div>
            ) : null}
            {you !== null ? (
              rematchOffered ? (
                <>
                  <div className="mt-4 text-[12.5px] font-normal text-white/70">
                    Your opponent wants a rematch.
                  </div>
                  <button
                    onClick={() => void onAcceptRematch()}
                    disabled={acceptRematch.isPending}
                    className="text-ink mt-2.5 w-full cursor-pointer rounded-full bg-white p-3 font-sans text-[13px] font-bold disabled:opacity-50"
                  >
                    {acceptRematch.isPending ? "Joining…" : "Accept rematch"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => void onRematch()}
                  disabled={requestingRematch}
                  className="text-ink mt-5 w-full cursor-pointer rounded-full bg-white p-3 font-sans text-[13px] font-bold disabled:opacity-50"
                >
                  {requestingRematch ? "Opening…" : "Rematch"}
                </button>
              )
            ) : null}
            <button
              onClick={() => void onDownloadPgn()}
              disabled={pgn.downloading}
              className="mt-2.5 w-full cursor-pointer rounded-full border border-white/15 p-3 font-sans text-[13px] font-semibold text-white/70 transition-colors hover:border-white/35 hover:text-white disabled:opacity-50"
            >
              {pgn.downloading ? "Preparing…" : "Download PGN"}
            </button>
            <button
              onClick={() => router.push("/casino/chess")}
              className="mt-2.5 w-full cursor-pointer rounded-full border border-white/15 p-3 font-sans text-[13px] font-semibold text-white/70 transition-colors hover:border-white/35 hover:text-white"
            >
              Back to lobby
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
