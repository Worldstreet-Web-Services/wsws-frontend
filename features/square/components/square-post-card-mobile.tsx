"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { timeAgo } from "@/lib/format";
import { parseCashtags } from "@/lib/square/cashtags";
import { formatCompact } from "@/lib/square/format-count";
import { authorName } from "@/lib/square/author";
import { squareLinks } from "@/lib/square/links";
import { SquareAvatar } from "@/features/square/components/square-avatar";
import { VerifiedChip } from "@/features/square/components/verified-chip";
import { FollowButton } from "@/features/square/components/follow-button";
import { IconComment, IconRepost, IconLike } from "@/features/square/components/square-icons";
import type { MarketSquareFeedPost } from "@/lib/api/market-square";
import type { TradableSymbol } from "@/lib/square/tradable";
import type { BuyPayload } from "@/lib/modal-types";

// Bookmark and share, drawn to match the solid 16x16 engagement glyphs. Visual
// only: the mobile square is a preview carousel, a doorway to the real square
// where saving and sharing live.
function IconBookmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className}>
      <path
        d="M4.5 2.25h7a1 1 0 0 1 1 1v10.4a.5.5 0 0 1-.78.42L8 11.6l-3.72 2.47a.5.5 0 0 1-.78-.42V3.25a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className}>
      <path
        d="M8 1.75a.5.5 0 0 1 .35.15l3 3-.7.7L8.5 3.46V10.5h-1V3.46L5.35 5.6l-.7-.7 3-3A.5.5 0 0 1 8 1.75Z"
        fill="currentColor"
      />
      <path
        d="M3.5 8.5h1v4.25h7V8.5h1v4.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V8.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

// One engagement tally in the footer. Presentational, like the rest of the
// preview card.
function Stat({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  return (
    <span className="text-grey-500 flex items-center gap-1" aria-label={label}>
      <span className="h-[15px] w-[15px]" aria-hidden>
        {icon}
      </span>
      <span className="tnum text-[11px]">{formatCompact(count)}</span>
    </span>
  );
}

/**
 * One square post as the mobile comp draws it (node 194:48056): a preview tile
 * in the horizontal feed carousel. It shows the author, media and text, and a
 * tally-only footer, then hands off to the square for anything you would
 * actually do to the post. The real, fully wired card is the desktop
 * `SquarePostCard`; this one is a doorway, so it stays presentational.
 */
export function SquarePostCardMobile({
  post,
  markets,
  onOpenBuy,
  meId,
}: {
  post: MarketSquareFeedPost;
  meId?: string;
  markets: TradableSymbol[];
  onOpenBuy?: (buy: BuyPayload) => void;
}) {
  const t = useTranslations("square");
  const author = post.author;
  const isMe = meId !== undefined && author?.id === meId;
  const href = squareLinks.post(post.id);
  const poster = post.thumbnailUrl ?? post.mediaUrl;

  const bySymbol = useMemo(() => {
    const map = new Map<string, TradableSymbol>();
    for (const market of markets) map.set(market.symbol.toUpperCase(), market);
    return map;
  }, [markets]);

  // Same rule as the desktop card: a $TICKER the app can trade becomes a chip
  // that opens the buy sheet; everything else stays plain text.
  const segments = useMemo(
    () =>
      onOpenBuy
        ? parseCashtags(post.text, bySymbol.keys())
        : [{ kind: "text" as const, value: post.text }],
    [post.text, bySymbol, onOpenBuy]
  );

  return (
    <article className="flex w-full flex-col">
      <header className="flex items-center gap-2">
        <SquareAvatar src={author?.avatarUrl ?? null} seed={author?.id ?? post.id} size={34} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1">
            <span className="truncate text-[13px] leading-4 font-semibold text-white">
              {authorName(author, t("someone"))}
            </span>
            <VerifiedChip verification={author?.verification} />
          </p>
          <p className="text-grey-500 truncate text-[11px] leading-4">
            {author ? `@${author.username} · ` : ""}
            {timeAgo(post.createdAt)}
          </p>
        </div>
        {author && !isMe ? <FollowButton author={author} /> : null}
      </header>

      {poster ? (
        <a
          href={href ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="border-grey-800 mt-3 block aspect-[16/9] overflow-hidden rounded-[12px] border bg-black/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- author-supplied host is unknown */}
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </a>
      ) : null}

      {post.text ? (
        <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-[17px] whitespace-pre-wrap text-white/85">
          {segments.map((segment, index) => {
            if (segment.kind === "cashtag") {
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const market = bySymbol.get(segment.symbol);
                    if (market && onOpenBuy) {
                      onOpenBuy({
                        symbol: market.symbol,
                        name: market.name,
                        priceUsd: market.priceUsd,
                        logo: market.logo,
                      });
                    }
                  }}
                  className="bg-grey-800/70 hover:bg-grey-700 text-accent mx-[1px] rounded-md px-1 text-[12px] font-semibold transition-colors"
                >
                  {segment.value}
                </button>
              );
            }
            // A preview keeps hashtags, mentions and links as plain text; the
            // real, linked versions live on the square.
            if (segment.kind === "url") return <span key={index}>{segment.label}</span>;
            return <span key={index}>{segment.value}</span>;
          })}
        </p>
      ) : null}

      {/* Tally-only footer, plus the comp's comment prompt and the save/share
          pair on the right. Presentational: this is a preview of the square. */}
      <footer className="text-grey-500 mt-3 flex items-center gap-3">
        <Stat
          icon={<IconComment className="h-full w-full" />}
          count={post.commentCount}
          label={t("commentsLabel")}
        />
        <Stat
          icon={<IconRepost className="h-full w-full" />}
          count={post.repostCount}
          label={t("repostsLabel")}
        />
        <Stat
          icon={<IconLike className="h-full w-full" />}
          count={post.likeCount}
          label={t("likesLabel")}
        />
        <span className="text-grey-600 ml-1 flex min-w-0 flex-1 items-center gap-1.5">
          <span className="h-[15px] w-[15px] shrink-0" aria-hidden>
            <IconComment className="h-full w-full" />
          </span>
          <span className="truncate text-[11px]">{t("commentHere")}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="h-[15px] w-[15px]" aria-hidden>
            <IconBookmark className="h-full w-full" />
          </span>
          <span className="h-[15px] w-[15px]" aria-hidden>
            <IconShare className="h-full w-full" />
          </span>
        </span>
      </footer>
    </article>
  );
}
