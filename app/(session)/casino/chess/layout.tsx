import { ChessHeaderActions } from "@/features/casino/components/chess-app/chess-profile-balance";

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChessHeaderActions />
    </>
  );
}
