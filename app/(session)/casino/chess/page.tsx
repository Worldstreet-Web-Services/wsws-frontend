export default function ChessLobbyPage() {
  return (
    <iframe
      src="/api/chess/play"
      title="Ark Chess"
      className="fixed inset-0 h-dvh w-full border-0 bg-[#11100e]"
    />
  );
}
