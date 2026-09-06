"use client";

import { SquareAvatar } from "@/features/square/components/square-avatar";
import { VerifiedChip } from "@/features/square/components/verified-chip";
import { IconComment, IconRepost, IconLike } from "@/features/square/components/square-icons";

// TEMPORARY preview harness for the Market Square mobile section (node
// 194:48056). Static mock data so it renders without the live API. Delete this
// route once the layout is signed off. View at a phone width (<640px).

// Figma asset — expires after 7 days, replace with a real image if needed.
const BANNER_IMG = "https://www.figma.com/api/mcp/asset/d309aaee-026f-4441-b89c-2cb99fd25760.png";

const MOCK_AUTHORS = [
  { id: "a1", username: "adeey", name: "Adejoke Adeosun", verification: "verified" },
  { id: "a2", username: "amara.obi", name: "Amara Obi", verification: "verified" },
  { id: "a3", username: "fatima_b", name: "Fatima Bello", verification: undefined },
];

const MOCK_POSTS = [
  {
    id: "p1",
    author: MOCK_AUTHORS[0],
    timeAgo: "10m ago",
    image: BANNER_IMG,
    text: "🚀 Welcome to Market Square! This is the core social and discovery layer for the Market ecosystem.\nFollow creators, join live streams, discover products in the ARK Store, and trade seamlessly.",
    comments: 1300,
    reposts: 1300,
    likes: 1300,
    following: true,
  },
  {
    id: "p2",
    author: MOCK_AUTHORS[1],
    timeAgo: "20m ago",
    image: BANNER_IMG,
    text: "🚀 Welcome to Market Square! This is the core social and discovery layer for the Market ecosystem.\nFollow creators, join live streams, discover products in the ARK Store, and trade seamlessly.",
    comments: 1300,
    reposts: 1300,
    likes: 1300,
    following: false,
  },
  {
    id: "p3",
    author: MOCK_AUTHORS[2],
    timeAgo: "4h ago",
    image: null,
    text: "Shoutout to the 12,000+ citizens on the Ark waitlist! Self-sovereign money means no freezes, no middlemen, and instant bank-transfer funding. Market Square is where we build together. 🔥🌐",
    comments: 1300,
    reposts: 1300,
    likes: 1300,
    following: true,
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

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

export default function SquareMobilePreviewPage() {
  const MOCK_STREAMS = [
    { id: "s1", seed: "stream-1" },
    { id: "s2", seed: "stream-2" },
    { id: "s3", seed: "stream-3" },
    { id: "s4", seed: "stream-4" },
    { id: "s5", seed: "stream-5" },
    { id: "s6", seed: "stream-6" },
    { id: "s7", seed: "stream-7" },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      <p className="px-4 pt-4 pb-1 text-[11px] text-white/30">
        Preview at phone width (&lt;640px) · temporary
      </p>

      {/* ---- Join the Conversation card (node 1:4816) ---- */}
      <section className="w-full px-4 pt-4">
        <a href="#preview" className="mb-2 inline-flex items-center gap-1 text-white">
          <span className="ws-display text-[15px]">Join the Conversation</span>
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
            <path
              d="m9 6 6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>

        <a
          href="#preview"
          className="relative block overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #1a0533 0%, #2d1266 40%, #4a1d8e 100%)",
          }}
        >
          {/* Stardust sparkle field */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden
            src="/market-square/sparkle-field.svg"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
          />
          {/* Wave decoration at bottom-left */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden
            src="/market-square/wave-left.svg"
            className="pointer-events-none absolute -bottom-4 -left-[30px] w-[393px] opacity-30"
          />

          {/* Floating avatars */}
          <div className="pointer-events-none absolute inset-x-3 top-1 h-[78px]">
            {MOCK_STREAMS.map((s, i) => {
              const positions = [
                { left: "68%", top: "10%", size: 38 },
                { left: "11%", top: "-6%", size: 36 },
                { left: "15%", top: "68%", size: 35 },
                { left: "57%", top: "58%", size: 35 },
                { left: "31%", top: "32%", size: 34 },
                { left: "87%", top: "-28%", size: 108 },
                { left: "-2%", top: "58%", size: 31 },
              ];
              const pos = positions[i];
              return (
                <span
                  key={s.id}
                  className="absolute rounded-full ring-2 ring-white/10"
                  style={{ left: pos.left, top: pos.top }}
                >
                  <SquareAvatar src={null} seed={s.seed} size={pos.size} />
                </span>
              );
            })}
          </div>

          {/* Content */}
          <div className="relative flex items-end justify-between gap-3 px-[17px] pt-[80px] pb-[15px]">
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1 rounded-md px-1 py-0.5">
                <SquareAvatar src={null} seed="house-owner" size={13} />
                <span className="truncate text-[10px] font-semibold text-white">
                  {"Mitchy's Playroom"}
                </span>
              </div>
              <p className="line-clamp-3 text-[21px] leading-[1.1] font-bold text-white">
                How to think like a chess grandmaster &amp; win
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 flex-col gap-[9px]">
              <span className="flex items-center justify-center gap-[5px] rounded-full bg-[#d12727] px-[17px] py-[8px] text-[10px] font-medium whitespace-nowrap text-white capitalize">
                Join Space
                <svg viewBox="0 0 24 24" aria-hidden className="h-[10px] w-[10px]" fill="none">
                  <path
                    d="M11 5L6 9H2v6h4l5 4V5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="flex items-center justify-center gap-[5px] rounded-full border-[1.4px] border-white px-[17px] py-[8px] text-[10px] font-medium whitespace-nowrap text-white capitalize">
                Play Chess
              </span>
            </div>
          </div>
        </a>
      </section>

      {/* ---- Market Square feed section ---- */}
      <div id="market-square" className="w-full p-4">
        {/* Header */}
        <a href="#preview" className="inline-flex items-center gap-1 text-white">
          <span className="ws-display text-[20px]">Market Square</span>
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

        {/* Member faces + tagline */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex -space-x-2">
            {MOCK_AUTHORS.map((author) => (
              <span key={author.id} className="ring-panel inline-flex rounded-full ring-2">
                <SquareAvatar src={null} seed={author.id} size={18} />
              </span>
            ))}
          </div>
          <span className="text-grey-500 truncate text-[12px]">Sirgappy and 100 others joined</span>
        </div>

        {/* Horizontal carousel */}
        <div className="ws-no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4">
          {MOCK_POSTS.map((post) => (
            <div
              key={post.id}
              className={`ws-card shrink-0 snap-start p-4 ${post.image ? "w-[86%]" : "w-[72%]"}`}
            >
              {/* Author row */}
              <header className="flex items-center gap-2">
                <SquareAvatar src={null} seed={post.author.id} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1">
                    <span className="truncate text-[13px] leading-4 font-semibold text-white">
                      {post.author.name}
                    </span>
                    <VerifiedChip verification={post.author.verification} />
                  </p>
                  <p className="text-grey-500 truncate text-[11px] leading-4">
                    @{post.author.username} · {post.timeAgo}
                  </p>
                </div>
                <button
                  type="button"
                  className={
                    post.following
                      ? "shrink-0 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] text-white/90"
                      : "shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-black"
                  }
                >
                  {post.following ? "Following" : "Follow"}
                </button>
              </header>

              <hr className="my-3 border-white/8" />

              {/* Media */}
              {post.image ? (
                <div className="border-grey-800 mb-2.5 aspect-[16/9] overflow-hidden rounded-[12px] border bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.image} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}

              {/* Text */}
              <p className="line-clamp-3 text-[12.5px] leading-[17px] whitespace-pre-wrap text-white/85">
                {post.text}
              </p>

              {/* Footer */}
              <footer className="text-grey-500 mt-3 flex items-center gap-3">
                <span className="flex items-center gap-1" aria-label="comments">
                  <span className="h-[15px] w-[15px]" aria-hidden>
                    <IconComment className="h-full w-full" />
                  </span>
                  <span className="tnum text-[11px]">{formatCount(post.comments)}</span>
                </span>
                <span className="flex items-center gap-1" aria-label="reposts">
                  <span className="h-[15px] w-[15px]" aria-hidden>
                    <IconRepost className="h-full w-full" />
                  </span>
                  <span className="tnum text-[11px]">{formatCount(post.reposts)}</span>
                </span>
                <span className="flex items-center gap-1" aria-label="likes">
                  <span className="h-[15px] w-[15px]" aria-hidden>
                    <IconLike className="h-full w-full" />
                  </span>
                  <span className="tnum text-[11px]">{formatCount(post.likes)}</span>
                </span>
                <span className="text-grey-600 ml-1 flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="h-[15px] w-[15px] shrink-0" aria-hidden>
                    <IconComment className="h-full w-full" />
                  </span>
                  <span className="truncate text-[11px]">Comment here...</span>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
