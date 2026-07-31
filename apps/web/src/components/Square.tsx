import type { Piece } from "@mchess/chess-engine";
import { PieceIcon } from "./PieceIcon.js";

interface SquareProps {
  isDark: boolean;
  piece: Piece | null;
  isSelected: boolean;
  isLegalTarget: boolean;
  isLastMove: boolean;
  onClick: () => void;
}

export function Square({ isDark, piece, isSelected, isLegalTarget, isLastMove, onClick }: SquareProps) {
  const classNames = [
    "square",
    isDark ? "square-dark" : "square-light",
    isSelected ? "square-selected" : "",
    isLastMove ? "square-last-move" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={classNames} onClick={onClick}>
      {piece && <PieceIcon type={piece.type} color={piece.color} />}
      {isLegalTarget && <span className={piece ? "capture-marker" : "move-marker"} />}
    </button>
  );
}
