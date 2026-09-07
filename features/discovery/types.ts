// What the discovery cards need in order to feature something.
//
// The cards rotate through live content, but discovery must not reach into
// trade, prediction, meme or square to get it: features never import each
// other. So each card takes a plain array of the shapes below and the route
// composes them, mapping whatever its own feature hooks return into these.
//
// Everything here is already display-ready. A card formats nothing and rounds
// nothing, which keeps money formatting in one place rather than in four cards.

/** One token the "Stay Ahead of Token Moves" card can feature. */
export interface TokenSpot {
  symbol: string;
  name: string;
  /** Formatted for display, e.g. "$1,876,617". Never a raw number. */
  price: string;
  /** Formatted and signed, e.g. "+12.8%". */
  change: string;
  /** Whether `change` is a gain, so the card can colour it without parsing. */
  up: boolean;
  /** Absolute percentage, for the tip's copy. Formatted, e.g. "12.8%". */
  movePercent: string;
  logo: string | null;
  href: string;
}

/** One market the "Your Next Prediction Starts Here" card can feature. */
export interface PredictionSpot {
  id: string;
  /** The market's question, as the card's headline. */
  question: string;
  /** Formatted countdown, e.g. "01:46:55:22", or null when it has no deadline. */
  countdown: string | null;
  /** The collage takes two; fewer is fine, more is ignored. */
  images: readonly string[];
  href: string;
}

/** One room the "Join the Conversation" card can feature. */
export interface SpaceSpot {
  id: string;
  /** The room's name, e.g. "Mitolyx Playroom". */
  room: string;
  headline: string;
  /** Member avatars for the scatter. The card uses as many as it draws. */
  avatars: readonly string[];
  /** Where the primary pill leads. */
  href: string;
  /** Where the secondary pill leads. */
  actionHref: string;
}

/** One trending memecoin the "Find the next 100X" card can feature. */
export interface MemeSpot {
  symbol: string;
  name: string;
  /** Formatted and signed, e.g. "+1000%". */
  change: string;
  up: boolean;
  image: string | null;
  href: string;
}
