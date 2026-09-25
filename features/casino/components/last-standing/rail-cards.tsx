"use client";

// React 19 dropped the global JSX namespace; it lives on the react package now.
import type { JSX, Ref } from "react";
import { ButtonSpinner } from "@/components/ui/button-spinner";
import { PlayIcon } from "@/components/ui/icons";

/**
 * The arcade's right rail, as four interchangeable cards.
 *
 * Every card is ~295px of dark glass: a pill badge, a display heading, a grey
 * sub-line, the card's own body, a full-width pill button and — supplied
 * separately — the dot pager that swaps between them.
 *
 * These are presentation and nothing else. No hook, no fetch, no translation
 * lookup and no QR generation lives here: every string and every node arrives
 * as a prop, already formatted and already localised by the rail that mounts
 * them. Money in particular is display-only — a card renders the string it is
 * handed and never does arithmetic on it, so no rounding can happen at the
 * last edge before a player reads a figure.
 */

export type RailTone = "lead" | "behind" | "waiting";

export interface StakeStepperProps {
  /** Already formatted for display, e.g. "$0.38". Never parsed here. */
  amount: string;
  currency: string;
  onDecrement(): void;
  onIncrement(): void;
  canDecrement: boolean;
  canIncrement: boolean;
  disabled?: boolean;
  /**
   * Accessible names for the two round buttons. The contract carried no slot
   * for them, and a hard-coded English name cannot be translated, so the rail
   * may hand localised ones down; without them the names fall back to the
   * card's own `amountLabel`.
   */
  decrementLabel?: string;
  incrementLabel?: string;
}

export interface RailBadge {
  label: string;
  tone: RailTone;
  /** The design's "You earn 10%" chip is a plain pill with no status dot. */
  dot?: boolean;
}

export interface RailActionCardProps {
  badge: RailBadge | null;
  heading: string;
  sub: string;
  amountLabel: string;
  stepper: StakeStepperProps;
  cta: { label: string; icon?: "play" | null; onPress(): void; disabled?: boolean; busy?: boolean };
  /** A handle on the action button, for a caller that animates something out
   *  of it. The wager's coin flight launches from this button's viewport box,
   *  and the button is drawn here rather than by the caller. */
  ctaRef?: Ref<HTMLButtonElement>;
}

export interface RailInviteCardProps {
  badge: RailBadge | null;
  heading: string;
  sub: string;
  /** The rail owns the code; the card only frames it in white. */
  qr: React.ReactNode;
  caption: string;
  share: { label: string; onPress(): void };
}

export interface RailClaimCardProps {
  heading: string;
  shareLabel: string;
  shareValue: string;
  status: { label: string; ready: boolean };
  rows: { label: string; value: string }[];
  cta: { label: string; onPress(): void; disabled?: boolean; busy?: boolean };
}

export interface RailPagerProps {
  count: number;
  index: number;
  onSelect(i: number): void;
  /**
   * The whole accessible name for one dot, already translated: the caller
   * knows the language and the card's name, and a sentence assembled from
   * English fragments here would never reach the catalogues.
   */
  itemLabel(index: number, count: number): string;
}

// The card shell. Full width on a phone, and only from the small breakpoint up
// does it settle to the design's 295px column, so the rail never pushes a
// horizontal scrollbar onto a narrow screen.
const CARD =
  "ws-card flex w-full max-w-full flex-col rounded-[20px] p-5 sm:max-w-[295px] overflow-hidden";

// The design's amber pill, mirroring ws-chrome-pill's geometry in the brand
// yellow. The white variant is ws-chrome-pill itself, untouched.
const AMBER_PILL: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(178.96deg, #ffe178 2.36%, #f8d559 38.57%, #ffdf6e 62.39%, #fcd95e 97.64%)",
  boxShadow: "inset 0 1.24px 0 rgba(255, 255, 255, 0.95), 0 2.49px 4.97px rgba(0, 0, 0, 0.5)",
};

const PILL_BUTTON =
  "ws-pressable text-ink mt-6 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40";

// Amber when this wallet is ahead, red when someone else is, grey before the
// first play. The dot repeats the colour for anyone who reads shape before
// hue, and the tone lands on a data attribute so the rail can assert on it.
const BADGE_TONE: Record<RailTone, { chip: string; dot: string }> = {
  lead: { chip: "border-[#ffe178]/70 text-[#ffe178]", dot: "bg-[#ffe178]" },
  behind: { chip: "border-down/50 text-down", dot: "bg-down" },
  waiting: { chip: "border-hairline text-white/40", dot: "bg-white/40" },
};

function Badge({ label, tone, dot: showDot = true }: RailBadge): JSX.Element {
  const { chip, dot } = BADGE_TONE[tone];
  return (
    <span
      data-testid="rail-badge"
      data-tone={tone}
      className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${chip}`}
    >
      {showDot ? <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dot}`} /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function Heading({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <h3 className="ws-display text-[22px] leading-tight tracking-[-0.04em] text-white">
      {children}
    </h3>
  );
}

function Sub({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p className="mt-1.5 text-[13px] leading-normal font-semibold text-white/40">{children}</p>
  );
}

// Plain strokes rather than a brand glyph: the circle is the button's own
// border, so all these draw is the sign inside it.
function MinusGlyph(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M3 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusGlyph(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M3 7h8M7 3v8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function ShareGlyph(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

const STEP_BUTTON =
  "ws-pressable grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-hairline bg-surface text-white/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

// One row at every width: the two round buttons keep their 44px, and only the
// figure between them gives ground, so the stepper never wraps or overflows.
function StakeStepper({
  amount,
  currency,
  onDecrement,
  onIncrement,
  canDecrement,
  canIncrement,
  disabled,
  decrementLabel,
  incrementLabel,
  amountLabel,
}: StakeStepperProps & { amountLabel: string }): JSX.Element {
  return (
    <div className="mt-3 flex w-full items-center justify-between gap-3">
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled === true || !canDecrement}
        aria-label={decrementLabel ?? `Decrease ${amountLabel}`}
        className={STEP_BUTTON}
      >
        <MinusGlyph />
      </button>
      <span className="flex min-w-0 flex-col items-center gap-1 text-center">
        <span className="ws-display tnum block w-full truncate text-[32px] leading-none tracking-[-0.03em] text-[#ffe178]">
          {amount}
        </span>
        <span className="block text-[13px] font-semibold text-white/40">{currency}</span>
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled === true || !canIncrement}
        aria-label={incrementLabel ?? `Increase ${amountLabel}`}
        className={STEP_BUTTON}
      >
        <PlusGlyph />
      </button>
    </div>
  );
}

// Busy locks the button as well as spinning it: a second press mid-transaction
// is how a player ends up paying their stake twice.
function PillButton({
  label,
  onPress,
  disabled,
  busy,
  tone,
  buttonRef,
  children,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  busy?: boolean;
  tone: "amber" | "chrome";
  buttonRef?: Ref<HTMLButtonElement>;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={onPress}
      disabled={disabled === true || busy === true}
      style={tone === "amber" ? AMBER_PILL : undefined}
      className={`${PILL_BUTTON}${tone === "chrome" ? "ws-chrome-pill" : ""}`}
    >
      {busy === true ? <ButtonSpinner /> : null}
      {children}
      {label}
    </button>
  );
}

/** START and ADD: the badge, the stake stepper and the one action. */
export function RailActionCard({
  badge,
  heading,
  sub,
  amountLabel,
  stepper,
  cta,
  ctaRef,
}: RailActionCardProps): JSX.Element {
  return (
    <section data-rail-card="action" className={CARD}>
      {badge ? (
        <div className="mb-3 flex">
          <Badge {...badge} />
        </div>
      ) : null}
      <Heading>{heading}</Heading>
      <Sub>{sub}</Sub>

      <p className="mt-6 text-center text-[13px] font-semibold text-white/40">{amountLabel}</p>
      <StakeStepper {...stepper} amountLabel={amountLabel} />

      <PillButton
        label={cta.label}
        onPress={cta.onPress}
        disabled={cta.disabled}
        busy={cta.busy}
        tone="amber"
        buttonRef={ctaRef}
      >
        {cta.icon === "play" && cta.busy !== true ? <PlayIcon size={13} /> : null}
      </PillButton>
    </section>
  );
}

/** INVITE: the badge sits beside the heading, and the code fills a white tile. */
export function RailInviteCard({
  badge,
  heading,
  sub,
  qr,
  caption,
  share,
}: RailInviteCardProps): JSX.Element {
  return (
    <section data-rail-card="invite" className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <Heading>{heading}</Heading>
        {badge ? <Badge {...badge} /> : null}
      </div>
      <Sub>{sub}</Sub>

      <div className="mt-6 flex flex-col items-center gap-2">
        <div
          data-testid="rail-qr"
          className="grid size-32.5 max-w-full place-items-center overflow-hidden rounded-xl bg-white p-2"
        >
          {qr}
        </div>
        <p className="text-center text-[12px] font-semibold text-white/40">{caption}</p>
      </div>

      <PillButton label={share.label} onPress={share.onPress} tone="chrome">
        <ShareGlyph />
      </PillButton>
    </section>
  );
}

/** CLAIM: the winner's share, the breakdown, and the button that settles it. */
export function RailClaimCard({
  heading,
  shareLabel,
  shareValue,
  status,
  rows,
  cta,
}: RailClaimCardProps): JSX.Element {
  return (
    <section data-rail-card="claim" className={CARD}>
      <Heading>{heading}</Heading>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12px] font-semibold text-white/40">{shareLabel}</span>
          <span className="ws-display tnum truncate text-[24px] leading-tight text-white">
            {shareValue}
          </span>
        </span>
        <Badge label={status.label} tone={status.ready ? "lead" : "waiting"} />
      </div>

      <div className="border-hairline mt-5 border-t" />

      <dl className="mt-5 flex flex-col gap-1.5 text-[12px] font-semibold">
        {rows.map((row) => (
          <div
            key={row.label}
            data-testid="rail-claim-row"
            className="flex items-center justify-between gap-3"
          >
            <dt className="min-w-0 truncate text-white/40">{row.label}</dt>
            <dd className="tnum shrink-0 text-white">{row.value}</dd>
          </div>
        ))}
      </dl>

      <PillButton
        label={cta.label}
        onPress={cta.onPress}
        disabled={cta.disabled}
        busy={cta.busy}
        tone="chrome"
      />
    </section>
  );
}

/**
 * The three dots under the rail. Each is a real button with a 44px target —
 * the dot itself is only 10px, which no thumb can hit — and the active one
 * carries aria-current so a screen reader knows where it is. One card means
 * nothing to page between, so the pager draws nothing at all.
 */
export function RailPager({ count, index, onSelect, itemLabel }: RailPagerProps): JSX.Element {
  return (
    <div className="flex items-center justify-center">
      {(count < 2 ? [] : Array.from({ length: count }, (_unused, i) => i)).map((i) => {
        const active = i === index;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={itemLabel(i, count)}
            aria-current={active ? "true" : undefined}
            className="grid size-11 cursor-pointer place-items-center"
          >
            <span
              aria-hidden
              className={`size-2.5 rounded-full transition-colors ${active ? "bg-white" : "bg-white/25"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
