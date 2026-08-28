"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ModalShell } from "@/components/ui/modal-shell";
import { AsyncError, AsyncLoading } from "@/components/ui/async-state";
import { squareLinks } from "@/lib/square/links";
import { authorName } from "@/lib/square/author";
import {
  fetchSuggestedProfiles,
  type MarketSquareAuthor,
  type SquareLane,
} from "@/lib/api/market-square";
import { FollowButton } from "@/features/square/components/follow-button";
import { SquareAvatar } from "@/features/square/components/square-avatar";
import { SquarePostCard } from "@/features/square/components/square-post-card";
import { useSquareFeed } from "@/features/square/hooks/use-square-feed";
import type { TradableSymbol } from "@/lib/square/tradable";
import type { BuyPayload } from "@/lib/modal-types";

/**
 * A square member, opened in place.
 *
 * The service exposes no per-profile read and no author-filtered feed, so
 * this sheet is honest about what it can know: identity comes off the feed
 * row that was tapped, the follower count is best-effort from the public
 * directory (absent for anyone the directory does not rank), and "recent
 * posts" are exactly that, the person's posts among the recent feed, never a
 * complete history. The complete story lives on the square itself, and the
 * footer link hands over to it.
 *
 * Reusing the exact feed query the tap came from is deliberate: the pages
 * the section already loaded appear instantly, the tapped post is guaranteed
 * to be among them, and looking further back warms the same cache the
 * section scrolls.
 */
export function SquareProfileSheet({
  author,
  markets,
  onOpenBuy,
  meId,
  lane = "for-you",
  topics,
  hashtag,
  onClose,
}: {
  author: MarketSquareAuthor;
  markets: TradableSymbol[];
  onOpenBuy?: (buy: BuyPayload) => void;
  meId?: string;
  /**
   * The feed the tap came from. Reusing its exact query is what makes the
   * pages the section already loaded appear instantly, and it guarantees the
   * tapped post is among them on every tab, not only on For You.
   */
  lane?: SquareLane;
  topics?: string[];
  hashtag?: string;
  onClose: () => void;
}) {
  const t = useTranslations("square");
  const feed = useSquareFeed(lane, topics, hashtag);

  // The public directory ranks people by followers; someone outside it has
  // no knowable count, and the header simply omits the figure rather than
  // showing a zero that means "unranked".
  const directory = useQuery({
    queryKey: ["market-square", "profile-directory"],
    queryFn: () => fetchSuggestedProfiles(50),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const directoryRow = directory.data?.find((profile) => profile.id === author.id);

  const posts = useMemo(() => {
    const items = feed.data?.pages.flatMap((page) => page.items) ?? [];
    return items.flatMap((item) => {
      if (item.type !== "post" || !item.post) return [];
      const postAuthor = item.post.author?.id ?? item.post.authorId;
      return postAuthor === author.id ? [item.post] : [];
    });
  }, [feed.data, author.id]);

  const externalHref = squareLinks.profile(author.username);
  const isMe = meId !== undefined && author.id === meId;

  return (
    <ModalShell open onClose={onClose} contentKey={author.id}>
      <div className="flex max-h-[80dvh] flex-col p-5">
        <header className="flex items-center gap-4">
          <SquareAvatar src={author.avatarUrl} seed={author.id} size={72} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5">
              <span className="truncate text-[18px] leading-6 font-semibold text-white">
                {authorName(author, t("someone"))}
              </span>
              {author.verification === "verified" ? (
                <svg viewBox="0 0 24 24" aria-hidden className="text-accent h-4 w-4 shrink-0">
                  <circle cx="12" cy="12" r="10" fill="currentColor" />
                  <path
                    d="m8 12.5 2.6 2.6L16 9.7"
                    fill="none"
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </p>
            <p className="text-grey-500 truncate text-[13px] leading-5">@{author.username}</p>
            {directoryRow ? (
              <p className="text-grey-400 mt-0.5 text-[12px] leading-4">
                {t("followersCount", { count: directoryRow.followerCount })}
              </p>
            ) : null}
          </div>
          {!isMe ? <FollowButton author={author} /> : null}
        </header>

        <div className="mt-5 flex items-baseline justify-between gap-3">
          <h3 className="text-grey-400 text-[11.5px] font-medium tracking-[0.14em] uppercase">
            {t("profileRecentPosts")}
          </h3>
        </div>
        <p className="text-grey-500 mt-1 text-[12px] leading-4">{t("profileRecentHint")}</p>

        <div className="ws-no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto">
          {feed.isPending ? (
            <AsyncLoading label={t("loading")} rows={2} />
          ) : feed.isError ? (
            // A failed fetch must never read as "they have no posts".
            <AsyncError
              error={feed.error}
              subject={t("subject")}
              unconfiguredDetail={t("unconfigured")}
              onRetry={() => void feed.refetch()}
            />
          ) : posts.length === 0 ? (
            <p className="text-grey-500 py-6 text-center text-[13px]">
              {t("profileNothingRecent")}
            </p>
          ) : (
            posts.map((post) => (
              <SquarePostCard
                key={post.id}
                post={post}
                markets={markets}
                onOpenBuy={onOpenBuy}
                meId={meId}
              />
            ))
          )}

          {feed.hasNextPage ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => void feed.fetchNextPage()}
                disabled={feed.isFetchingNextPage}
                className="border-grey-700 text-grey-300 rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors hover:text-white disabled:opacity-60"
              >
                {feed.isFetchingNextPage ? t("profileLooking") : t("profileLookBack")}
              </button>
            </div>
          ) : null}
        </div>

        {externalHref ? (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent mt-4 text-center text-[12.5px] font-semibold hover:underline"
          >
            {t("profileOpenSquare")}
          </a>
        ) : null}
      </div>
    </ModalShell>
  );
}
