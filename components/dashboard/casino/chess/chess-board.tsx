"use client";

import type { Board, Move, Square } from "@/lib/casino/chess/engine";
import { PIECE_PATHS } from "@/components/dashboard/casino/chess/piece-art";

// Square colors, dark/light with tints for the last move, the selected piece,
// and its legal targets. Kept as inline styles because they are data-driven.
const DARK_SQ = "#33363D";
const LIGHT_SQ = "#D8D0C0";
const DARK_LAST = "#4A4436";
const LIGHT_LAST = "#E8DCA8";
const SELECTED = "#a78bfa";
const DARK_TARGET = "#4A4460";
const LIGHT_TARGET = "#CFC2EE";

interface ChessBoardProps {
  board: Board;
  selected?: Square | null;
  legalTargets?: Square[];
  lastMove?: Move | null;
  // Omit to render a read-only board (spectator view).
  onSquareClick?: (r: number, c: number) => void;
}

export function ChessBoard({
  board,
  selected = null,
  legalTargets = [],
  lastMove = null,
  onSquareClick,
}: ChessBoardProps) {
  return (
    <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-md border border-white/10">
      {board.map((row, r) =>
        row.map((piece, c) => {
          const isDark = (r + c) % 2 === 1;
          const isSelected = selected?.r === r && selected?.c === c;
          const isTarget = legalTargets.some((t) => t.r === r && t.c === c);
          const isLast =
            !!lastMove &&
            ((lastMove.from.r === r && lastMove.from.c === c) ||
              (lastMove.to.r === r && lastMove.to.c === c));
          let background = isDark ? DARK_SQ : LIGHT_SQ;
          if (isLast) background = isDark ? DARK_LAST : LIGHT_LAST;
          if (isSelected) background = SELECTED;
          else if (isTarget) background = isDark ? DARK_TARGET : LIGHT_TARGET;

          return (
            <div
              key={`${r}-${c}`}
              onClick={onSquareClick ? () => onSquareClick(r, c) : undefined}
              className={`flex items-center justify-center ${onSquareClick ? "cursor-pointer" : ""}`}
              style={{ background }}
            >
              {piece ? (
                <svg viewBox="0 0 45 45" className="pointer-events-none h-[78%] w-[78%]">
                  <path
                    d={PIECE_PATHS[piece.type]}
                    fill={piece.color === "w" ? "#F2F1F5" : "#15151A"}
                    stroke={piece.color === "w" ? "#0D0D10" : "#F2F1F5"}
                    strokeWidth="1"
                  />
                </svg>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
