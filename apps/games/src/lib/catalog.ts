// The Games hub catalog. Chess is live (served by the `chess` Rust microservice
// through the API gateway); the rest are placeholders so the lobby reads as a
// real games destination. Flip `status` to "live" and add an `href` as each
// game ships. Dependency-free so the games app stays self-contained.

export type GameStatus = "live" | "soon";

export type GameCategory = "popular" | "table" | "instant";

export interface GameEntry {
  id: string;
  name: string;
  tagline: string;
  status: GameStatus;
  category: GameCategory;
  // CSS gradient for the card thumbnail (our own art, not third-party images).
  gradient: string;
  // Symbol shown on the thumbnail.
  glyph: string;
  // Live player count, shown only on live games.
  players?: number;
  // Route to open the game. Present only when the game is live.
  href?: string;
}

export const CATEGORIES: readonly { id: "all" | GameCategory | "live"; label: string }[] = [
  { id: "all", label: "All games" },
  { id: "popular", label: "Popular" },
  { id: "table", label: "Table" },
  { id: "instant", label: "Instant" },
  { id: "live", label: "Live now" },
];

export const GAMES: readonly GameEntry[] = [
  {
    id: "chess",
    name: "Chess",
    tagline: "Server-refereed, head to head",
    status: "live",
    category: "table",
    gradient: "linear-gradient(140deg,#10b981,#0f766e)",
    glyph: "♞",
    players: 312,
    href: "/games/chess",
  },
  {
    id: "crash",
    name: "Crash",
    tagline: "Cash out before the crash",
    status: "soon",
    category: "popular",
    gradient: "linear-gradient(140deg,#f43f5e,#be123c)",
    glyph: "✕",
  },
  {
    id: "dice",
    name: "Dice",
    tagline: "Roll over, roll under",
    status: "soon",
    category: "instant",
    gradient: "linear-gradient(140deg,#38bdf8,#4f46e5)",
    glyph: "⚁",
  },
  {
    id: "mines",
    name: "Mines",
    tagline: "Pick tiles, dodge the mines",
    status: "soon",
    category: "popular",
    gradient: "linear-gradient(140deg,#a78bfa,#7c3aed)",
    glyph: "◆",
  },
  {
    id: "coinflip",
    name: "Coinflip",
    tagline: "Double or nothing",
    status: "soon",
    category: "instant",
    gradient: "linear-gradient(140deg,#fbbf24,#ea580c)",
    glyph: "◉",
  },
  {
    id: "blackjack",
    name: "Blackjack",
    tagline: "Beat the dealer to 21",
    status: "soon",
    category: "table",
    gradient: "linear-gradient(140deg,#64748b,#1e293b)",
    glyph: "♠",
  },
  {
    id: "roulette",
    name: "Roulette",
    tagline: "Pick your number, spin",
    status: "soon",
    category: "table",
    gradient: "linear-gradient(140deg,#f472b6,#db2777)",
    glyph: "◍",
  },
  {
    id: "plinko",
    name: "Plinko",
    tagline: "Drop the ball, chase the edge",
    status: "soon",
    category: "instant",
    gradient: "linear-gradient(140deg,#2dd4bf,#0d9488)",
    glyph: "▚",
  },
];
