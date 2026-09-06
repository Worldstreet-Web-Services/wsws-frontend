"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { squareLinks } from "@/lib/square/links";
import { fetchSquareMe } from "@/lib/api/market-square";
import { authorName } from "@/lib/square/author";
import { useSquareFeed } from "@/features/square/hooks/use-square-feed";
import { SquarePostCardMobile } from "@/features/square/components/square-post-card-mobile";
import { SquareAvatar } from "@/features/square/components/square-avatar";
import type { TradableSymbol } from "@/lib/square/tradable";
import type { BuyPayload } from "@/lib/modal-types";

// How many member faces the header shows before the "and others" count.
const HEADER_FACES = 3;

/**
 * Market Square on a phone, as the mobile comp draws it (node 194:48056): a
 * titled header with a few member faces, then the feed as a horizontal carousel
 * of preview tiles rather than the desktop's vertical column.
 *
 * A preview, not the full feed: it fetches the for-you lane, shows the posts as
 * swipeable tiles, and hands off to the square for the rest. From `sm` up the
 * desktop `SquareSection` takes over, so this renders phone-only.
 */
export function SquareMobile({
  onOpenBuy,
  markets = [],
}: {
  onOpenBuy?: (buy: BuyPayload) => void;
  markets?: TradableSymbol[];
}) {
  const t = useTranslations("square");
  const squareHref = squareLinks.home();
  const feed = useSquareFeed("for-you");

  // Only to suppress a self-follow button; shared query key with the desktop
  // section, so it costs no extra request.
  const meQuery = useQuery({
    queryKey: ["market-square", "me"],
    queryFn: fetchSquareMe,
    enabled: squareHref !== null,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const posts = useMemo(
    () =>
      (feed.data?.pages ?? [])
        .flatMap((page) => page.items)
        .flatMap((item) => (item.type === "post" && item.post ? [item.post] : [])),
    [feed.data]
  );

  // No upstream, no content, or a failure: the preview simply does not appear,
  // rather than sitting on the dashboard as an empty shelf. The desktop section
  // owns the first-run and error surfaces.
  if (!squareHref || posts.length === 0) return null;

  const faces = posts.slice(0, HEADER_FACES);
  const leadName = authorName(faces[0]?.author, t("someone"));

  return (
    <div id="market-square" className="w-full p-4">
      <a
        href={squareHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-white"
      >
        <span className="ws-display text-[20px]">{t("title")}</span>
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
          <path
            d="m9 6 6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex -space-x-2">
          {faces.map((post) => (
            <span key={post.id} className="ring-panel inline-flex rounded-full ring-2">
              <SquareAvatar
                src={post.author?.avatarUrl ?? null}
                seed={post.author?.id ?? post.id}
                size={18}
              />
            </span>
          ))}
        </div>
        <span className="text-grey-500 truncate text-[12px]">
          {t("othersJoined", { name: leadName })}
        </span>
      </div>

      {/* Horizontal feed: CSS scroll-snap, so it swipes with no JavaScript. The
          negative margin lets the tiles bleed to the screen edges while the
          section keeps its padding. */}
      <div className="ws-no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4">
        {posts.map((post) => {
          const hasMedia = !!(post.thumbnailUrl ?? post.mediaUrl);
          return (
            <div
              key={post.id}
              className={`ws-card shrink-0 snap-start p-4 ${hasMedia ? "w-[86%]" : "w-[72%]"}`}
            >
              <SquarePostCardMobile
                post={post}
                markets={markets}
                onOpenBuy={onOpenBuy}
                meId={meQuery.data?.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
