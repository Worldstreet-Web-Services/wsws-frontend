"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ModalShell } from "@/components/ui/modal-shell";
import { fetchSquareMe, fetchSquareTopics, fetchSquareUnread } from "@/lib/api/market-square";
import { squareLinks } from "@/lib/square/links";
import { SquareAvatar } from "@/features/square/components/square-avatar";

/**
 * What the plus opens.
 *
 * The plus used to go straight to the composer, which assumed writing is the
 * only thing someone reaches for it to do. It is really the entry to the
 * square as a whole — so this is a small hub: who you are there, whether
 * anything is waiting for you, and the ways in.
 *
 * Every entry here is backed by something. The reference layout also offers
 * Article, Video, Creator Center and CreatorPad; a post in this platform has
 * exactly two kinds (`update` and `story`) and there is no article or video
 * type behind them, so those tiles would be four controls that fail on tap.
 * The one adjacent thing that IS real — applying to be a creator — is here
 * instead, and only for someone who is not one yet.
 */
export function SquareActionsSheet({
  open,
  onClose,
  onCompose,
  onPickTopic,
}: {
  open: boolean;
  onClose: () => void;
  onCompose: () => void;
  onPickTopic?: (key: string) => void;
}) {
  const t = useTranslations("square");

  const me = useQuery({
    queryKey: ["market-square", "me"],
    queryFn: fetchSquareMe,
    enabled: open,
    staleTime: 5 * 60_000,
    // Signed out, or the square has no profile yet — the sheet still works,
    // it just cannot greet anyone. Not worth a retry storm.
    retry: false,
  });

  const unread = useQuery({
    queryKey: ["market-square", "unread"],
    queryFn: fetchSquareUnread,
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  const topics = useQuery({
    queryKey: ["market-square", "topics"],
    queryFn: fetchSquareTopics,
    enabled: open,
    staleTime: 30 * 60_000,
  });

  const count = unread.data ?? 0;
  const bellHref = squareLinks.notifications();
  const profileHref = me.data ? squareLinks.profile(me.data.username) : null;

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="p-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <SquareAvatar src={me.data?.avatarUrl ?? null} seed={me.data?.id ?? "me"} size={38} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white">
                {me.data?.displayName ?? t("yourProfile")}
              </p>
              {me.data ? (
                <p className="text-grey-500 truncate text-[12px]">@{me.data.username}</p>
              ) : null}
            </div>
          </div>

          {bellHref ? (
            <a
              href={bellHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={count > 0 ? t("notificationsWithCount", { count }) : t("notifications")}
              className="text-grey-400 hover:text-grey-100 relative shrink-0 p-1.5 transition-colors"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
                <path
                  d="M18 9a6 6 0 1 0-12 0c0 4-2 5-2 5h16s-2-1-2-5M13.7 20a2 2 0 0 1-3.4 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {count > 0 ? (
                // Capped, because a badge is a signal not a statistic — three
                // digits stops being readable and starts being a shape.
                <span className="bg-down text-ink absolute -top-0.5 -right-0.5 grid min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-bold">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </a>
          ) : null}
        </header>

        <button
          type="button"
          onClick={onCompose}
          className="ws-inset mt-4 flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-white/5"
        >
          <span className="bg-accent text-ink grid size-9 shrink-0 place-items-center rounded-xl">
            <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]">
              <path
                d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-white">{t("composeTitle")}</span>
            <span className="text-grey-500 block text-[12.5px]">{t("composeBlurb")}</span>
          </span>
        </button>

        {topics.data && topics.data.length > 0 ? (
          <section className="mt-4">
            <h3 className="text-grey-400 text-[11.5px] font-medium tracking-[0.14em] uppercase">
              {t("discussions")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topics.data.map((topic) => (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => {
                    onPickTopic?.(topic.key);
                    onClose();
                  }}
                  className="border-grey-800 text-grey-300 hover:bg-grey-800 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                >
                  #{topic.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {profileHref ? (
          <a
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-grey-400 hover:text-grey-100 mt-4 inline-block text-[12.5px] font-medium transition-colors"
          >
            {t("openProfile")}
          </a>
        ) : null}
      </div>
    </ModalShell>
  );
}
