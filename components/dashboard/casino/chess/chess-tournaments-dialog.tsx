"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChessDialogFrame } from "@/components/dashboard/casino/chess/chess-dialog-frame";
import { SwissCreateForm } from "@/components/dashboard/casino/chess/swiss/create-form";
import { useSwissList } from "@/hooks/use-casino-swiss";
import {
  CasinoEmpty,
  CasinoError,
  CasinoLoading,
} from "@/components/dashboard/casino/casino-state";
import {
  CHESS_CARD_BG,
  CHESS_CARD_SHADOW,
  CHESS_PRIMARY_BUTTON_CLASS,
  CHESS_SECONDARY_BUTTON_CLASS,
} from "@/lib/casino/chess/ui";
import type { SwissState, SwissSummary } from "@/lib/casino/api/swiss";

const GROUP_ORDER: readonly SwissState[] = ["running", "open", "finished"];

const GROUP_TITLE_KEY: Record<SwissState, string> = {
  running: "groupRunning",
  open: "groupOpen",
  finished: "groupFinished",
};

type TournamentTab = "current" | "create";
type CreateKind = "picker" | "swiss";

function TournamentRow({
  tournament,
  onOpen,
}: {
  tournament: SwissSummary;
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("casino.chess.swiss");
  const roundCell =
    tournament.state === "open"
      ? t("notStarted")
      : t("roundOf", { round: tournament.round, total: tournament.nbRounds });

  return (
    <button
      type="button"
      onClick={() => onOpen(tournament.id)}
      className="w-full cursor-pointer rounded-[18px] border border-white/8 px-5 py-4 text-left transition-colors hover:border-white/18 hover:bg-white/4"
      style={{ background: CHESS_CARD_BG, boxShadow: CHESS_CARD_SHADOW }}
    >
      <div className="mb-1 font-sans text-[1.12rem] font-extrabold tracking-[-0.03em] text-white">
        {tournament.name}
      </div>
      <div className="mb-3 text-[13px] text-white/58">
        {roundCell} · {t("playersCount", { count: tournament.participantCount })} · {tournament.timeControl}
      </div>
      <span
        className={
          tournament.state === "open"
            ? `${CHESS_PRIMARY_BUTTON_CLASS} inline-flex px-4 py-2 text-[12px] font-bold`
            : `${CHESS_SECONDARY_BUTTON_CLASS} inline-flex px-4 py-2 text-[12px] font-semibold`
        }
      >
        {tournament.state === "open" ? t("join") : t("view")}
      </span>
    </button>
  );
}

function TournamentCreatePicker({ onSwiss }: { onSwiss: () => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center text-[15px] font-semibold text-white/84">
        Please select the kind of event you&apos;d like to create:
      </div>
      <div className="mx-auto max-w-[920px] space-y-3">
        <button
          type="button"
          onClick={onSwiss}
          className="flex w-full cursor-pointer items-center justify-between gap-5 rounded-[18px] border border-white/8 px-5 py-5 text-left transition-colors hover:border-white/18 hover:bg-white/4"
          style={{ background: CHESS_CARD_BG, boxShadow: CHESS_CARD_SHADOW }}
        >
          <div className="flex min-w-0 items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/chesscom-icons/tournaments.svg" alt="" className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <div className="font-sans text-[1.22rem] font-extrabold tracking-[-0.03em] text-white">
                Swiss Tournament
              </div>
              <div className="mt-1 text-[14px] leading-6 text-white/62">
                Invite players to a shareable Swiss tournament and manage pairings from one place.
              </div>
            </div>
          </div>
          <span className="shrink-0 text-[28px] font-light text-white/62">›</span>
        </button>
      </div>
    </div>
  );
}

interface ChessTournamentsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChessTournamentsDialog({ open, onClose }: ChessTournamentsDialogProps) {
  const t = useTranslations("casino.chess.swiss");
  const router = useRouter();
  const { tournaments, isLoading, error, refetch } = useSwissList();
  const [tab, setTab] = useState<TournamentTab>("current");
  const [createKind, setCreateKind] = useState<CreateKind>("picker");

  const openTournament = (id: string) => {
    onClose();
    router.push(`/casino/chess/swiss/${id}`);
  };

  return (
    <ChessDialogFrame
      open={open}
      onClose={onClose}
      title="Tournaments"
      iconSrc="/chesscom-icons/tournaments.svg"
      tabs={[
        { id: "current", label: "Current", active: tab === "current", onClick: () => setTab("current") },
        {
          id: "create",
          label: "Create",
          active: tab === "create",
          onClick: () => setTab("create"),
        },
      ]}
      rightAction={
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/casino/chess/swiss");
          }}
          className={`${CHESS_SECONDARY_BUTTON_CLASS} hidden px-4 py-2 text-[12px] font-semibold md:inline-flex`}
        >
          Tournament Directory
        </button>
      }
    >
      {tab === "current" ? (
        error ? (
          <CasinoError error={error} subject={t("subject")} onRetry={refetch} />
        ) : isLoading ? (
          <CasinoLoading label={t("loading")} rows={4} />
        ) : tournaments.length === 0 ? (
          <CasinoEmpty>{t("empty")}</CasinoEmpty>
        ) : (
          <div className="space-y-7">
            {GROUP_ORDER.map((state) => {
              const items = tournaments.filter((item) => item.state === state);
              if (items.length === 0) return null;
              return (
                <div key={state}>
                  <div className="mb-3 text-[18px] font-extrabold text-white">{t(GROUP_TITLE_KEY[state])}</div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <TournamentRow key={item.id} tournament={item} onOpen={openTournament} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : createKind === "picker" ? (
        <TournamentCreatePicker onSwiss={() => setCreateKind("swiss")} />
      ) : (
        <div className="mx-auto max-w-[720px]">
          <button
            type="button"
            onClick={() => setCreateKind("picker")}
            className="mb-4 cursor-pointer text-[13px] text-white/62 transition-colors hover:text-white"
          >
            ← Back
          </button>
          <div
            className="rounded-[18px] border border-white/8 px-5 py-5"
            style={{ background: CHESS_CARD_BG, boxShadow: CHESS_CARD_SHADOW }}
          >
            <div className="mb-4 font-sans text-[1.35rem] font-extrabold tracking-[-0.03em] text-white">
              New Shareable Swiss Tournament
            </div>
            <SwissCreateForm embedded onCreated={() => onClose()} />
          </div>
        </div>
      )}
    </ChessDialogFrame>
  );
}
