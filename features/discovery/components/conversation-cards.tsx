"use client";

import { useTranslations } from "next-intl";
import type { LiveRound } from "@/lib/dashboard-feed";
import type { LiveConversation } from "@/features/discovery/hooks/use-live-conversations";
import { DiscoveryCta } from "@/features/discovery/components/discovery-cta";
import {
  ConversationCard,
  Dust,
  FaceScatter,
  KickerGlyph,
  KickerIcon,
  across,
  artLayer,
  useHoldReport,
} from "@/features/discovery/components/conversation-card";

// The four cards that sit beside the chess room on the "Join the Conversation"
// band. Three of them are the chess card's frame in its own hue with its own
// motif where the chess card scatters faces: a board and discs for Checkers, a
// row of balls for ArkBall, and the hosts' faces for the rooms live on Market
// Square. The Last Man card is the exception — the event has its own poster,
// so it wears the band's height and radius but none of the shared chrome.
//
// Every card here is pure. The row reads the feeds and hands each card what it
// needs, so a card renders the same for a given input wherever it is drawn and
// the tests can put it in any state by passing a prop.

// The glyph after a pill's label, drawn inline so the cards need no icon
// exports of their own. Sized as the design draws the chess pills' glyphs.
function Chevron() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowOut() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The gold-to-bark fill the Marathon wordmark is lettered in. */
const WORDMARK_INK = "bg-gradient-to-r from-[#ac6900] to-[#462b00] bg-clip-text text-transparent";

export interface LastManCardProps {
  /** The round worth joining, or null when none is open. */
  round: LiveRound | null;
  /** Milliseconds left in `round`, from the row's clock; null with no round. */
  remainingMs: number | null;
  onHold?: (held: boolean) => void;
}

// The Marathon poster. Where the other cards on this band wear the shared
// frame, this one is the event's own artwork: the wordmark lettered in gold
// over a hot yellow sky, the hourglass running behind it, and a single pill
// into the round. It keeps the band's height and radius so it stands flush
// beside its neighbours, and reports holds the way they do.
export function LastManCard({ round, remainingMs, onHold }: LastManCardProps) {
  const t = useTranslations("discovery");
  const hold = useHoldReport(onHold);

  // The poster draws neither the clock nor the pot the old card did, so the
  // round is read for one thing: where the pill goes. A round whose time has
  // already run out is not one to join, and the lobby takes it from there.
  const live = round !== null && remainingMs !== null && remainingMs > 0;

  return (
    <article
      className="relative h-[203px] overflow-hidden rounded-[18px] bg-[linear-gradient(126.36deg,#ffd52d_36.667%,#f5c500_87.735%)]"
      {...hold}
    >
      {/* The two cloud bands, in the order the design paints them. Each export
          is already the whole card rather than a strip, so it is laid over the
          frame instead of being positioned along the bottom. */}
      <div
        aria-hidden
        className={`${artLayer} inset-0 bg-[url('/market/lastman-clouds-back.png')] bg-[length:100%_100%] bg-no-repeat`}
      />
      <div
        aria-hidden
        className={`${artLayer} inset-0 bg-[url('/market/lastman-clouds-front.png')] bg-[length:100%_100%] bg-no-repeat`}
      />

      {/* The hourglass, and a blurred copy screened over it for the glow the
          design puts around the glass. Anchored to the right edge as a share of
          the card, so the wordmark keeps the left of it at every width. */}
      <div
        aria-hidden
        className={`${artLayer} top-1/2 right-[-4%] h-[210px] w-[210px] -translate-y-1/2 rotate-[13.21deg]`}
      >
        <img
          src="/market/lastman-hourglass.png"
          alt=""
          width={500}
          height={500}
          className="h-full w-full object-contain"
        />
        <img
          src="/market/lastman-hourglass.png"
          alt=""
          width={500}
          height={500}
          className="absolute inset-0 h-full w-full object-contain mix-blend-screen blur-[5.71px]"
        />
      </div>

      {/* The wordmark is one name broken over two lines, so it is one heading
          with two lines in it rather than two headings: a reader hears "Last
          Man Marathon" rather than a fragment and then another.
          A phone's card is narrower than the desk's, and the design's type ran
          the name into the hourglass there, so it steps down below md. */}
      <div className="relative z-[1] flex h-full flex-col items-start justify-center pl-[32px]">
        <h3>
          <span
            className={`block -rotate-[1.72deg] font-serif text-[21px] leading-[1.1] font-semibold tracking-[-2.2px] md:text-[34px] md:tracking-[-2.72px] ${WORDMARK_INK}`}
          >
            {t("lastManMarathonLead")}
          </span>{" "}
          <span
            className={`ws-chewy mt-[2px] block text-[32px] leading-[1.1] tracking-[-0.53px] md:text-[53px] ${WORDMARK_INK}`}
          >
            {t("lastManMarathonTitle")}
          </span>
        </h3>
        <DiscoveryCta
          href={live ? `/casino/last-standing/${round.gameId}` : "/casino/last-standing"}
          label={t("lastManJoinNow")}
          tone="dark"
          size={15}
          className="mt-[14px] border-[1.974px] border-[#ffd52d]"
          icon={
            <img
              src="/market/prediction-coins-white.svg"
              alt=""
              aria-hidden
              width={14}
              height={14}
              className="size-[13.818px] shrink-0"
            />
          }
        />
      </div>
    </article>
  );
}

export interface CheckersCardProps {
  /** Matches being played right now. */
  liveCount: number;
  onHold?: (held: boolean) => void;
}

// Where the discs sit on the board, as a share of its width and height.
const DISCS: { x: number; y: number; dark: boolean }[] = [
  { x: 14, y: 14, dark: false },
  { x: 62, y: 14, dark: false },
  { x: 38, y: 38, dark: false },
  { x: 86, y: 38, dark: true },
  { x: 14, y: 62, dark: true },
  { x: 62, y: 62, dark: true },
  { x: 38, y: 86, dark: true },
];

// Ink to forest. The motif is a board drawn in CSS, tilted back the way a
// table reads from a chair, with discs on it.
export function CheckersCard({ liveCount, onHold }: CheckersCardProps) {
  const t = useTranslations("discovery");
  const live = liveCount > 0;

  return (
    <ConversationCard
      gradient="bg-[linear-gradient(180deg,#03120c_0%,#1f8a5b_100%)]"
      art={
        <>
          <Dust />
          <div
            className={`${artLayer} top-[-18px] h-[132px] w-[132px] rounded-[6px] shadow-[0_18px_30px_rgba(0,0,0,0.45)]`}
            style={{
              right: across(48),
              backgroundImage: "repeating-conic-gradient(#f2e7cf 0 25%, #2c1a10 0 50%)",
              backgroundSize: "33px 33px",
              transform: "perspective(520px) rotateX(52deg) rotateZ(-16deg)",
              transformOrigin: "50% 100%",
            }}
          >
            {DISCS.map((disc) => (
              <span
                key={`${disc.x}-${disc.y}`}
                className={`absolute size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_2px_2px_rgba(0,0,0,0.5)] ${
                  disc.dark ? "bg-[#1c1c1e]" : "bg-[#d12727]"
                }`}
                style={{ left: `${disc.x}%`, top: `${disc.y}%` }}
              />
            ))}
          </div>
          {live ? (
            <span
              className={`${artLayer} top-[14px] rounded-full bg-white/15 px-[9px] py-[3px] font-serif text-[11px] leading-none font-semibold text-white`}
              style={{ left: across(44.32) }}
            >
              <span className="mr-[5px] inline-block size-[6px] rounded-full bg-[#5df2a4] align-middle" />
              {t("checkersLiveBadge", { count: liveCount })}
            </span>
          ) : null}
        </>
      }
      kicker={{ icon: <KickerGlyph glyph="◉" />, label: t("checkersKicker") }}
      headline={live ? t("checkersLiveHeadline", { count: liveCount }) : t("checkersIdleHeadline")}
      primary={{
        href: "/casino/checkers",
        label: live ? t("checkersJoin") : t("checkersPlay"),
        icon: <Chevron />,
      }}
      secondary={{ href: "/casino/checkers/learn", label: t("checkersLearn"), icon: <Chevron /> }}
      onHold={onHold}
    />
  );
}

// The five white balls and the one ArkBall, as the game draws a pick.
const BALLS = [7, 14, 23, 31, 45];

// Ink to amber. The motif is a drawn pick: five white balls and the ArkBall,
// over the game's own hero art fading in from the right.
export function ArkBallCard({ onHold }: { onHold?: (held: boolean) => void }) {
  const t = useTranslations("discovery");

  return (
    <ConversationCard
      gradient="bg-[linear-gradient(180deg,#1a0f00_0%,#d99a1e_100%)]"
      art={
        <>
          <img
            src="/casino/arkball/hero.png"
            alt=""
            aria-hidden
            width={482}
            height={203}
            className={`${artLayer} inset-y-0 right-0 h-full w-[62%] object-cover opacity-45`}
            style={{
              maskImage: "linear-gradient(90deg, transparent 0%, #000 55%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 55%)",
            }}
          />
          <Dust />
          <div
            className={`${artLayer} top-[22px] flex items-center gap-[7px]`}
            style={{ left: across(44.32), transform: "rotate(-6deg)", transformOrigin: "0 50%" }}
          >
            {BALLS.map((ball) => (
              <span
                key={ball}
                className="tnum grid size-[34px] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#d9d9d9_70%,#9a9a9a_100%)] font-serif text-[13px] font-bold text-[#1a0f00] shadow-[0_4px_6px_rgba(0,0,0,0.4)]"
              >
                {ball}
              </span>
            ))}
            <span className="tnum grid size-[40px] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd166_0%,#d99a1e_60%,#7a4e00_100%)] font-serif text-[14px] font-bold text-white shadow-[0_6px_8px_rgba(0,0,0,0.45)]">
              9
            </span>
          </div>
        </>
      }
      kicker={{ icon: <KickerGlyph glyph="●" />, label: t("arkballKicker") }}
      headline={t("arkballHeadline")}
      primary={{ href: "/casino/arkball", label: t("arkballPlay"), icon: <Chevron /> }}
      secondary={{ href: "/casino", label: t("arkballAll"), icon: <Chevron /> }}
      onHold={onHold}
    />
  );
}

export interface SquareCardProps {
  /** The room on show, or null when nothing is live. */
  room: LiveConversation | null;
  /** Hosts' faces across every live room, for the scatter. */
  avatars: readonly string[];
  /** The square's front door. */
  homeHref: string;
  onHold?: (held: boolean) => void;
}

// Ink to teal. The motif is the chess card's own: the faces of the people in
// the rooms, live on Market Square. Every link on it leaves for the square's
// deployment in a new tab.
export function SquareCard({ room, avatars, homeHref, onHold }: SquareCardProps) {
  const t = useTranslations("discovery");
  const live = room !== null && room.href !== null;

  return (
    <ConversationCard
      gradient="bg-[linear-gradient(180deg,#02121a_0%,#1d9aa8_100%)]"
      art={
        <>
          <Dust />
          <FaceScatter avatars={avatars} />
        </>
      }
      kicker={{
        icon:
          live && room.avatars[0] ? (
            <KickerIcon src={room.avatars[0]} />
          ) : (
            <KickerIcon src="/market/convo-house-icon.png" />
          ),
        label: live && room.host ? t("squareLiveKicker", { host: room.host }) : t("squareKicker"),
      }}
      headline={live ? room.title : t("squareIdleHeadline")}
      primary={
        live
          ? {
              href: room.href as string,
              label: t("squareJoin"),
              icon: <ArrowOut />,
              external: true,
            }
          : { href: homeHref, label: t("squareOpen"), icon: <ArrowOut />, external: true }
      }
      secondary={
        live
          ? { href: homeHref, label: t("squareOpen"), icon: <ArrowOut />, external: true }
          : { href: homeHref, label: t("squareStart"), icon: <ArrowOut />, external: true }
      }
      onHold={onHold}
    />
  );
}
