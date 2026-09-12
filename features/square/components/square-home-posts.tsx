"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { squareLinks } from "@/lib/square/links";
import { useSquareFeed } from "@/features/square/hooks/use-square-feed";
import {
  SQUARE_GLASS,
  SquareHomeRail,
  SquareHomeSection,
} from "@/features/square/components/square-home-section";
import { SquarePostCard } from "@/features/square/components/square-post-card";
import type { TradableSymbol } from "@/lib/square/tradable";
import type { BuyPayload } from "@/lib/modal-types";

/**
 * "Post For You": Home's for-you lane, laid sideways the way Home lays it,
 * one 467-wide card per post. The card is the post card the dashboard
 * already renders, so nothing the reader can do there is taken away here:
 * like, repost, reply and follow stay in the app, and a $TICKER the app
 * trades opens the buy sheet. The full thread is the Square's, which the
 * card's arrow opens; the whole timeline is where "View more" goes.
 *
 * The rail grows to the right when asked to, with the same "Show more" the
 * dashboard section uses at its end, never a scroll listener.
 */
export function SquareHomePosts({
  markets,
  onOpenBuy,
  meId,
}: {
  markets: TradableSymbol[];
  onOpenBuy?: (buy: BuyPayload) => void;
  meId?: string;
}) {
  const t = useTranslations("square");
  const feed = useSquareFeed("for-you");
  const posts = useMemo(
    () =>
      (feed.data?.pages.flatMap((page) => page.items) ?? []).flatMap((item) =>
        item.type === "post" && item.post ? [item.post] : []
      ),
    [feed.data]
  );

  return (
    <SquareHomeSection
      id="square-post-for-you"
      lead={t("homePosts")}
      viewMore={{ label: t("viewMore"), href: squareLinks.feed() }}
      loading={feed.isPending}
      loadingLabel={t("loading")}
      error={feed.error}
      errorSubject={t("subject")}
      unconfiguredDetail={t("unconfigured")}
      onRetry={() => void feed.refetch()}
      empty={posts.length === 0}
    >
      <SquareHomeRail gap={17.37}>
        {posts.map((post) => (
          <div
            key={post.id}
            className={`${SQUARE_GLASS} w-[467px] max-w-[85vw] shrink-0 snap-start rounded-[16.5px] px-4 pt-4 [&>article]:border-b-0 [&>article]:py-0 [&>article]:pb-4`}
          >
            <SquarePostCard post={post} markets={markets} onOpenBuy={onOpenBuy} meId={meId} />
          </div>
        ))}
        {feed.hasNextPage ? (
          <div className="flex h-[120px] shrink-0 items-center px-2">
            <button
              type="button"
              onClick={() => void feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
              className="border-grey-800 hover:bg-grey-900 text-grey-300 rounded-full border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {feed.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
            </button>
          </div>
        ) : null}
      </SquareHomeRail>
    </SquareHomeSection>
  );
}
