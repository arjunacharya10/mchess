import type { Color, PieceType } from "@mchess/chess-engine";
import { PieceIcon } from "./PieceIcon.js";

const CHOICES: PieceType[] = ["queen", "rook", "bishop", "knight"];

export function PromotionPicker({ color, onChoose }: { color: Color; onChoose: (piece: PieceType) => void }) {
  return (
    <div className="promotion-picker-overlay">
      <div className="promotion-picker">
        <p>Promote to:</p>
        <div className="promotion-choices">
          {CHOICES.map((piece) => (
            <button key={piece} type="button" onClick={() => onChoose(piece)}>
              <PieceIcon type={piece} color={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
