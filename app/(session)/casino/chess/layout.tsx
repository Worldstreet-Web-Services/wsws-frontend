import { ChessHeaderActions } from "@/features/casino/components/chess-app/chess-profile-balance";
import { ChessStyleBoundary } from "@/features/casino/components/chess-app/chess-style-boundary";

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ChessStyleBoundary />
      {children}
      <ChessHeaderActions />
    </>
  );
}
