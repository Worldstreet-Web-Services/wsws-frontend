import { ChessLobbyFrame } from "@/features/casino/components/chess-app/chess-lobby-frame";

interface ChessLobbyPageProps {
  searchParams: Promise<{
    challenge?: string | string[];
    setup?: string | string[];
  }>;
}

export function chessLobbySource(params: {
  challenge?: string | string[];
  setup?: string | string[];
}) {
  const challenge = Array.isArray(params.challenge) ? params.challenge[0] : params.challenge;
  if (challenge) return `/api/chess/challenge/${encodeURIComponent(challenge)}`;

  const setup = Array.isArray(params.setup) ? params.setup[0] : params.setup;
  return setup === "friend" || setup === "ai" || setup === "hook"
    ? `/api/chess/play?setup=${encodeURIComponent(setup)}#game-setup`
    : "/api/chess/play";
}

export default async function ChessLobbyPage({ searchParams }: ChessLobbyPageProps) {
  return <ChessLobbyFrame source={chessLobbySource(await searchParams)} />;
}
