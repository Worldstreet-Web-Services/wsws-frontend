"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/eyebrow";
import { AsyncEmpty, AsyncError, AsyncLoading } from "@/components/ui/async-state";
import { marketSquareHref } from "@/lib/market-square";
import { useSquareFeed } from "@/features/square/hooks/use-square-feed";
import { SquareLiveStrip } from "@/features/square/components/square-live-strip";
import { SquarePostCard } from "@/features/square/components/square-post-card";
import { useSpotMarkets } from "@/features/trade/hooks/use-spot-markets";
import type { SquareLane } from "@/lib/api/market-square";
import type { BuyPayload } from "@/lib/modal-types";

const LANES: readonly SquareLane[] = ["for-you", "following"] as const;

/**
 * Market Square, met while scrolling the dashboard.
 *
 * The PRD makes the square the platform's connective tissue, but a link in the
 * nav is something you have to already want. Trading apps that feel social put
 * the conversation IN the surface people are already in, so it is discovered
 * by scrolling rather than by deciding to leave. This is that surface: real
 * posts and real live rooms from the square, inline, under the markets.
 *
 * It is deliberately READ-ONLY here. Ark's proxy relays the feed and the write
 * that composes a post; it does not relay likes, comments or follows, and it
 * should not — Ark forwards the player's session, so every path opened here is
 * a path that acts as them. Reading is what makes the section feel inhabited;
 * every deeper action opens the square itself, where it works properly.
 */
export function SquareSection({ onOpenBuy }: { onOpenBuy?: (buy: BuyPayload) => void }) {
  const t = useTranslations("square");
  const [lane, setLane] = useState<SquareLane>("for-you");
  const feed = useSquareFeed(lane);
  // The tradeable universe, so a $TICKER in a post can open the real buy sheet
  // instead of pretending to be a link. Already cached by the spot section
  // above, so this costs nothing extra on the dashboard.
  const { markets } = useSpotMarkets();
  const squareHref = marketSquareHref();

  const items = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data]
  );
  const posts = useMemo(
    () => items.flatMap((item) => (item.type === "post" && item.post ? [item.post] : [])),
    [items]
  );
  const streams = useMemo(
    () =>
      items.flatMap((item) =>
        item.type === "stream" && item.stream && item.stream.status === "live"
          ? [item.stream]
          : []
      ),
    [items]
  );

  // Without the square's URL there is no upstream to read, so the section
  // does not exist rather than rendering a permanent error under the markets.
  if (!squareHref) return null;

  return (
    <div className="mx-auto w-full max-w-[640px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{t("title")}</Eyebrow>
        <a
          href={squareHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-grey-500 hover:text-grey-200 text-xs font-medium transition-colors"
        >
          {t("openSquare")}
        </a>
      </div>

      <div className="mt-3 flex gap-1.5">
        {LANES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setLane(option)}
            aria-pressed={lane === option}
            className={
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
              (lane === option
                ? "bg-grey-800 text-white"
                : "text-grey-500 hover:text-grey-300")
            }
          >
            {t(option === "for-you" ? "laneForYou" : "laneFollowing")}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {feed.isPending ? <AsyncLoading label={t("loading")} rows={3} /> : null}

        {feed.isError ? (
          <AsyncError
            error={feed.error}
            subject={t("subject")}
            unconfiguredDetail={t("unconfigured")}
            onRetry={() => void feed.refetch()}
          />
        ) : null}

        {!feed.isPending && !feed.isError ? (
          <>
            <SquareLiveStrip streams={streams} />
            {posts.length === 0 ? (
              <AsyncEmpty>
                {lane === "following" ? t("emptyFollowing") : t("empty")}
              </AsyncEmpty>
            ) : (
              // ONE column, at reading width. A feed is a stream you scroll,
              // not a gallery you scan: multiple columns give the eye no single
              // path, and the research on social layouts is consistent that
              // attention consolidates into one column rather than splitting
              // across several. The markets above are a grid because they are
              // data to compare; this is people to read.
              <div className="border-grey-800 border-t">
                {posts.map((post) => (
                  <SquarePostCard
                    key={post.id}
                    post={post}
                    markets={markets}
                    onOpenBuy={onOpenBuy}
                  />
                ))}
              </div>
            )}

            {feed.hasNextPage ? (
              <div className="mt-4 flex justify-center">
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
          </>
        ) : null}
      </div>
    </div>
  );
}
