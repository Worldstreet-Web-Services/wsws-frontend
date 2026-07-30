import { GamesLobby } from "@games/components/games-lobby";

// Standalone Games hub. Self-contained (no host chrome), so it stays decoupled
// from the rest of the project, the same way earn is its own thing.
export function GamesPage() {
  return <GamesLobby />;
}
