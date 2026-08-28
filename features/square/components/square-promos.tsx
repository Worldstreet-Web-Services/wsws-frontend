"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { timeAgo } from "@/lib/format";
import { formatCompact } from "@/lib/square/format-count";
import { authorName } from "@/lib/square/author";
import { distinctByAuthor } from "@/lib/square/distinct-authors";
import { squareLinks } from "@/lib/square/links";
import { fetchSuggestedProfiles } from "@/lib/api/market-square";
import { useSquareFeed } from "@/features/square/hooks/use-square-feed";
import { SquareAvatar } from "@/features/square/components/square-avatar";
import { PromoCard, PromoShell } from "@/features/square/components/promo-shell";
import { VerifiedChip } from "@/features/square/components/verified-chip";
import { FollowButton } from "@/features/square/components/follow-button";

/**
 * Market Square blocks for the gaps between dashboard sections.
 *
 * They exist to recruit: someone reading their portfolio meets a little of the
 * square on the way down rather than having to reach the very bottom of the
 * page to learn it exists. Each is ONE horizontal rail, so it costs a fixed
 * slice of height however much it has to show.
 *
 * Every block returns NULL when it has nothing worth showing. A recruitment
 * block advertising an empty room argues against visiting, so the dashboard
 * closes back up around it rather than rendering an empty shelf.
 */

/**
 * One tally in the engagement pill: the glyph, then the count.
 *
 * The icon is not decoration — a row of four bare numbers says nothing about
 * WHICH four, and the first version of this shipped exactly that. The design
 * pairs each count with its glyph for the same reason every feed does.
 */
function Tally({
  count,
  label,
  children,
}: {
  count: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1 text-white/70" aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden className="h-[13px] w-[13px] shrink-0">
        {children}
      </svg>
      <span className="tnum text-[10.5px]">{formatCompact(count)}</span>
    </span>
  );
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinejoin: "round" as const,
};

/** Posts people are talking about. */
export function SquarePostsPromo() {
  const t = useTranslations("square");
  const feed = useSquareFeed("for-you");

  const posts = useMemo(() => {
    const all = (feed.data?.pages.flatMap((page) => page.items) ?? []).flatMap((item) =>
      item.type === "post" && item.post ? [item.post] : []
    );
    // ONE post per author, so the rail shows a room rather than one person's
    // timeline. See lib/square/distinct-authors.ts for the fallback.
    return distinctByAuthor(all, (post) => post.author?.id ?? post.authorId).slice(0, 8);
  }, [feed.data]);

  if (posts.length === 0) return null;

  return (
    <PromoShell title={t("promoPostsTitle")} action={t("openSquare")}>
      {posts.map((post) => (
        <PromoCard key={post.id} href={squareLinks.post(post.id)} width="w-[320px]">
          <div className="flex items-center gap-2">
            <SquareAvatar
              src={post.author?.avatarUrl ?? null}
              seed={post.author?.id ?? post.id}
              name={post.author?.displayName}
              size={34}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1">
                <span className="truncate text-[13.5px] font-bold text-white">
                  {authorName(post.author, t("someone"))}
                </span>
                <VerifiedChip verification={post.author?.verification} />
              </p>
              <p className="truncate text-[11.5px] text-white/50">
                {post.author ? `@${post.author.username} · ` : ""}
                {timeAgo(post.createdAt)}
              </p>
            </div>
          </div>

          {/* Clamped here too, but with no expand control: this card is a
              LINK into the square, so the whole post is one tap away already.
              A "show more" that expanded a promo card would grow the rail's
              row height and shove the cards beside it out of alignment. */}
          <p className="mt-2.5 line-clamp-4 text-[12.5px] leading-[18px] text-[#E5E5E5]">
            {post.text}
          </p>

          {/* The design holds the tallies in ONE soft pill, so they read as a
              single fact about the post rather than four competing numbers. */}
          <div className="mt-3 flex items-center gap-3.5 rounded-full bg-white/3 px-3 py-2">
            <Tally count={post.commentCount} label={t("commentsLabel")}>
              <path
                d="M20 12a7 7 0 0 1-7 7H7l-3 2.5V12a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7Z"
                {...STROKE}
              />
            </Tally>
            <Tally count={post.repostCount} label={t("repostsLabel")}>
              <path
                d="M4 8h11a4 4 0 0 1 4 4M4 8l3-3M4 8l3 3m13 5H9a4 4 0 0 1-4-4m15 4-3 3m3-3-3-3"
                {...STROKE}
                strokeLinecap="round"
              />
            </Tally>
            <Tally count={post.likeCount} label={t("likesLabel")}>
              <path
                d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9Z"
                {...STROKE}
              />
            </Tally>
            <Tally count={post.viewCount} label={t("viewsLabel")}>
              <path d="M4 20V10m5 10V4m5 16v-7m5 7V8" {...STROKE} strokeLinecap="round" />
            </Tally>
          </div>
        </PromoCard>
      ))}
    </PromoShell>
  );
}

/** Rooms that are live right now. */
export function SquareLivePromo() {
  const t = useTranslations("square");
  const feed = useSquareFeed("live");

  const streams = useMemo(
    () =>
      (feed.data?.pages.flatMap((page) => page.items) ?? [])
        .flatMap((item) =>
          item.type === "stream" && item.stream && item.stream.status === "live"
            ? [item.stream]
            : []
        )
        .slice(0, 8),
    [feed.data]
  );

  if (streams.length === 0) return null;

  return (
    <PromoShell title={t("promoLiveTitle")} action={t("openSquare")}>
      {streams.map((stream) => (
        <PromoCard key={stream.id} href={squareLinks.live(stream.id)} width="w-[320px]">
          <div className="flex items-start justify-between gap-2">
            <SquareAvatar
              src={stream.owner?.avatarUrl ?? null}
              seed={stream.owner?.id ?? stream.id}
              name={stream.owner?.displayName}
              size={42}
            />
            {/* Live is the one thing here that must be unmistakable, so it
                keeps the square's red and a pulse — motion-safe, so it holds
                still for anyone who asked for that. */}
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#FF0B0B] px-2 py-1">
              <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" />
              <span className="text-[9.5px] font-bold tracking-wide text-white uppercase">
                {t("liveNow")}
              </span>
            </span>
          </div>

          <p className="mt-2.5 line-clamp-2 text-[13px] leading-[18px] font-semibold text-[#E5E5E5]">
            {stream.title}
          </p>
          <p className="mt-1.5 truncate text-[11.5px] text-white/50">
            {stream.owner
              ? t("createdBy", { name: stream.owner.displayName })
              : t("createdInSquare")}
          </p>
          <p className="mt-0.5 text-[11.5px] text-white/50">
            {t("joinedCount", { count: stream.peakViewers })}
          </p>

          <span className="mt-3 block rounded-full bg-[#34C759] py-2 text-center text-[12.5px] font-bold text-black">
            {t("joinLive")}
          </span>
        </PromoCard>
      ))}
    </PromoShell>
  );
}

/** People worth following. */
export function SquarePeoplePromo() {
  const t = useTranslations("square");
  const squareHref = squareLinks.home();

  const people = useQuery({
    queryKey: ["market-square", "suggested-profiles"],
    queryFn: () => fetchSuggestedProfiles(8),
    enabled: squareHref !== null,
    staleTime: 10 * 60_000,
    retry: false,
  });

  const profiles = people.data ?? [];
  if (profiles.length === 0) return null;

  return (
    <PromoShell title={t("promoPeopleTitle")} action={t("openSquare")}>
      {profiles.map((profile) => (
        <div key={profile.id} className="bg-grey-800 w-[210px] shrink-0 snap-start rounded-lg p-4">
          {/* Centred stack, as the design draws it: portrait, name, handle,
              reach, action. The avatar is deliberately large — on a card whose
              whole job is "follow this person", the face IS the content. */}
          <div className="flex flex-col items-center text-center">
            <a
              href={squareLinks.profile(profile.username) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-[filter] hover:brightness-110"
            >
              <SquareAvatar
                src={profile.avatarUrl}
                seed={profile.id}
                name={profile.displayName}
                size={96}
              />
            </a>

            <p className="mt-2.5 flex max-w-full items-center justify-center gap-1">
              <span className="truncate text-[13.5px] font-bold text-white">
                {profile.displayName || `@${profile.username}`}
              </span>
              <VerifiedChip verification={profile.verification} />
            </p>
            <p className="mt-0.5 max-w-full truncate text-[12px] text-white/50">
              @{profile.username}
            </p>
            <p className="mt-1 text-[11.5px] text-white/50">
              {t("followersCount", { count: profile.followerCount })}
            </p>

            {/* A real Follow, not a link to go and do it elsewhere — the write
                is already relayed, and a card that says Follow should follow. */}
            <div className="mt-2.5 w-full">
              <FollowButton
                author={{
                  id: profile.id,
                  username: profile.username,
                  displayName: profile.displayName,
                  avatarUrl: profile.avatarUrl,
                  verification: profile.verification,
                  role: profile.role,
                  isFollowing: profile.isFollowing,
                }}
                block
              />
            </div>
          </div>
        </div>
      ))}
    </PromoShell>
  );
}
