import type { Color, PieceType } from "@mchess/chess-engine";
import bishopB from "../assets/pieces/bishop-b.svg";
import bishopW from "../assets/pieces/bishop-w.svg";
import kingB from "../assets/pieces/king-b.svg";
import kingW from "../assets/pieces/king-w.svg";
import knightB from "../assets/pieces/knight-b.svg";
import knightW from "../assets/pieces/knight-w.svg";
import pawnB from "../assets/pieces/pawn-b.svg";
import pawnW from "../assets/pieces/pawn-w.svg";
import queenB from "../assets/pieces/queen-b.svg";
import queenW from "../assets/pieces/queen-w.svg";
import rookB from "../assets/pieces/rook-b.svg";
import rookW from "../assets/pieces/rook-w.svg";

const ICONS: Record<Color, Record<PieceType, string>> = {
  white: { pawn: pawnW, knight: knightW, bishop: bishopW, rook: rookW, queen: queenW, king: kingW },
  black: { pawn: pawnB, knight: knightB, bishop: bishopB, rook: rookB, queen: queenB, king: kingB },
};

export function PieceIcon({ type, color }: { type: PieceType; color: Color }) {
  return <img src={ICONS[color][type]} alt={`${color} ${type}`} draggable={false} className="piece-icon" />;
}
