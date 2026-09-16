import { useId } from "react";
import type { ChromeIconProps } from "./types";

// Every glyph the chrome draws. They live here rather than in either app so
// the rail and the dome look the same on every page of www.tsionark.com, and
// they are drawn inline so no host has to serve an image path for them.
//
// Not a client module: nothing here holds state, so a server component (the
// WSWS landing page) can render these without shipping them as client
// JavaScript. useId works on the server too.
//
// Line icons stroke in currentColor, so the row or seat around them sets the
// colour. The dome's Square card carries its own fills, and its gradient id
// comes from useId: the rail and the dome are mounted on the same page, and a
// fixed id would resolve to whichever copy came first, which on a desktop is
// the hidden tab bar.

const stroke = "currentColor";

export function ChartBarsIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 19h16M6 19V9m4 10V5m4 14v-7m4 7V8"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TrendIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 17l5-6 4 3 5-8 4 5"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BulbIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3v4m0 0a6 6 0 016 6c0 4-3 5-6 5s-6-1-6-5a6 6 0 016-6Z"
        stroke={stroke}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HouseIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 20V10l8-5 8 5v10" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function GridIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="8" height="8" rx="2" stroke={stroke} strokeWidth="1.8" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke={stroke} strokeWidth="1.8" />
      <rect x="13" y="11" width="8" height="10" rx="2" stroke={stroke} strokeWidth="1.8" />
      <rect x="3" y="14" width="8" height="7" rx="2" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function DiceIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4" stroke={stroke} strokeWidth="1.8" />
      <circle cx="9" cy="9" r="1.3" fill={stroke} />
      <circle cx="15" cy="9" r="1.3" fill={stroke} />
      <circle cx="9" cy="15" r="1.3" fill={stroke} />
      <circle cx="15" cy="15" r="1.3" fill={stroke} />
    </svg>
  );
}

export function BriefcaseIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="7" width="18" height="13" rx="3" stroke={stroke} strokeWidth="1.8" />
      <path
        d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M3 12h18" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}

export function ClockIcon({ size = 26, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.6" />
      <path d="M12 7v5l3 2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FlameIcon({ size = 22, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3c1 3-3.5 4.5-3.5 8.5a5.5 5.5 0 0011 0C19.5 7 14 6.5 12 3Zm0 18a3 3 0 01-3-3c0-2 3-2.5 3-4.5 1.5 1.5 3 2.5 3 4.5a3 3 0 01-3 3Z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The broadcast glyph on the Go Live control. */
export function LiveIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <path
        d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 16.6a6.5 6.5 0 0 0 0-9.2M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 19.4a10.5 10.5 0 0 0 0-14.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The Square's mark in the rail: a small sheened card. Sized like the 20px
 * line icons beside it, at the art's own 17.12 by 12.74 proportion. Drawn by
 * styles.css from the art file, which rasterises the card exactly as an <img>
 * of it does; an inline copy antialiases the one-pixel edges differently. Only
 * visible where the host imports @ark/chrome/styles.css.
 */
export function SquareMarkIcon({ size = 20, className }: ChromeIconProps) {
  return (
    <span
      aria-hidden
      className={className ? `ark-chrome-square-mark ${className}` : "ark-chrome-square-mark"}
      style={{ width: size * 0.856, height: size * 0.637 }}
    />
  );
}

// The dome's glyphs, lifted from the art (node 104:2688). Each keeps the art's
// own coordinates as its viewBox, so it sits in the dome exactly where the
// comp drew it.

export function DomeHomeIcon({ size = 24, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="50 53.5 22 22.5" fill="none" className={className}>
      <path
        d="M57.9993 75L57.7487 71.4911C57.6139 69.6046 59.108 68 60.9993 68C62.8906 68 64.3847 69.6046 64.25 71.4911L63.9993 75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M51.3514 66.2135C50.9984 63.9162 50.8219 62.7676 51.2562 61.7494C51.6905 60.7311 52.654 60.0344 54.5811 58.6411L56.021 57.6C58.4183 55.8667 59.6169 55 61 55C62.3831 55 63.5817 55.8667 65.979 57.6L67.4189 58.6411C69.346 60.0344 70.3095 60.7311 70.7438 61.7494C71.1781 62.7676 71.0016 63.9162 70.6486 66.2135L70.3476 68.1724C69.8471 71.4289 69.5969 73.0572 68.429 74.0286C67.2611 75 65.5537 75 62.1388 75H59.8612C56.4463 75 54.7389 75 53.571 74.0286C52.4031 73.0572 52.1529 71.4289 51.6524 68.1724L51.3514 66.2135Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DomeMarketIcon({ size = 24, className }: ChromeIconProps) {
  return (
    <svg
      width={size}
      height={(size * 15) / 17}
      viewBox="121 32.5 18 16"
      fill="none"
      className={className}
    >
      <path
        d="M122.973 47.8717H138.865M124.959 47.8717V37.9393M128.932 47.8717V33.9663M132.905 47.8717V40.919M136.878 47.8717V36.946"
        stroke="currentColor"
        strokeWidth="1.78784"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The Square in the dome: a sheened ID card with its own fills. */
export function DomeSquareIcon({ size = 26, className }: ChromeIconProps) {
  const sheen = `ark-chrome-dome-card-sheen${useId()}`;
  return (
    <svg
      width={size}
      height={(size * 20) / 26}
      viewBox="188 19.5 26 20"
      fill="none"
      className={className}
    >
      <path
        d="M203.229 20L189 21.7423V38.5845H203.52H213.973V21.7423L203.229 20Z"
        fill={`url(#${sheen})`}
      />
      <path
        d="M190.453 35.3902V23.7749L202.939 22.3229V37.7133L199.745 35.0998L190.453 35.3902Z"
        fill="#1F1F1F"
      />
      <path
        d="M198.525 28.1909C198.045 28.2244 197.669 28.6416 197.686 29.1222C197.703 29.603 198.105 29.9665 198.585 29.933C199.065 29.8993 199.441 29.4814 199.424 29.0007C199.407 28.5201 199.004 28.1574 198.525 28.1909ZM196.207 28.3539C195.727 28.3875 195.352 28.8045 195.368 29.2852C195.385 29.7658 195.788 30.1285 196.268 30.095C196.748 30.0615 197.123 29.6444 197.106 29.1637C197.09 28.6829 196.687 28.3203 196.207 28.3539ZM193.889 28.515C193.41 28.5487 193.034 28.9658 193.051 29.4463C193.068 29.927 193.47 30.2895 193.95 30.2561C194.43 30.2225 194.806 29.8056 194.789 29.3248C194.772 28.8442 194.369 28.4814 193.889 28.515Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id={sheen}
          x1="202.068"
          y1="33.9384"
          x2="216.006"
          y2="33.9384"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#978EA5" />
          <stop offset="0.171352" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DomeArkadeIcon({ size = 24, className }: ChromeIconProps) {
  return (
    <svg width={size} height={size} viewBox="277 30 22 22" fill="none" className={className}>
      <path
        d="M285.192 40.9811V44.5322"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M287.004 42.7561H283.381"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M291.373 41.0892H291.271"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M293.092 44.4782H292.99"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M284.457 31.2014C284.463 31.9107 285.044 32.4796 285.754 32.4729H286.755C287.85 32.4644 288.746 33.3425 288.761 34.4377V35.438"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M297.665 42.8017C297.665 37.2793 295.294 35.4379 288.182 35.4379C281.068 35.4379 278.698 37.2793 278.698 42.8017C278.698 48.3251 281.068 50.1656 288.182 50.1656C295.294 50.1656 297.665 48.3251 297.665 42.8017Z"
        stroke="currentColor"
        strokeWidth="1.48988"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The rail's row icons, by the section they stand for. */
export const ArkNavIcons = {
  portfolio: GridIcon,
  spot: ChartBarsIcon,
  perps: TrendIcon,
  meme: FlameIcon,
  rwa: HouseIcon,
  prediction: BulbIcon,
  earn: BriefcaseIcon,
  casino: DiceIcon,
  activity: ClockIcon,
  square: SquareMarkIcon,
} as const;

/** The dome's seat icons. */
export const ArkTabIcons = {
  home: DomeHomeIcon,
  market: DomeMarketIcon,
  square: DomeSquareIcon,
  arkade: DomeArkadeIcon,
  activity: ClockIcon,
} as const;
