import { useState } from "react";
import { algebraicToSquare, squareOf, type Color, type PieceType } from "@mchess/chess-engine";
import type { LegalMoveWire, WireGameState } from "@mchess/protocol";
import { PromotionPicker } from "./PromotionPicker.js";
import { Square } from "./Square.js";

const BOARD_SIZE = 7;

interface BoardProps {
  gameState: WireGameState;
  yourColor: Color | null;
  legalMovesForYou: LegalMoveWire[];
  onMove: (from: number, to: number, promotion?: PieceType) => void;
}

export function Board({ gameState, yourColor, legalMovesForYou, onMove }: BoardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: number; to: number } | null>(null);

  const isYourTurn = yourColor !== null && gameState.sideToMove === yourColor;
  const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
  const lastMoveFrom = lastMove ? algebraicToSquare(lastMove.from) : null;
  const lastMoveTo = lastMove ? algebraicToSquare(lastMove.to) : null;

  const targetsForSelected = selected === null ? [] : legalMovesForYou.filter((m) => m.from === selected);

  function handleSquareClick(square: number) {
    if (!isYourTurn) return;
    const piece = gameState.board[square];

    if (selected !== null) {
      const matches = targetsForSelected.filter((m) => m.to === square);
      if (matches.length > 0) {
        if (matches.length > 1) {
          setPendingPromotion({ from: selected, to: square });
        } else {
          onMove(matches[0].from, matches[0].to, matches[0].promotion);
        }
        setSelected(null);
        return;
      }
    }

    if (piece && piece.color === yourColor && legalMovesForYou.some((m) => m.from === square)) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  }

  function choosePromotion(promotion: PieceType) {
    if (pendingPromotion) onMove(pendingPromotion.from, pendingPromotion.to, promotion);
    setPendingPromotion(null);
  }

  const ranks = Array.from({ length: BOARD_SIZE }, (_, i) => i);
  const files = Array.from({ length: BOARD_SIZE }, (_, i) => i);
  const orderedRanks = yourColor === "black" ? ranks : ranks.slice().reverse();
  const orderedFiles = yourColor === "black" ? files.slice().reverse() : files;

  return (
    <div className="board-wrapper">
      <div className="board">
        {orderedRanks.map((rank) =>
          orderedFiles.map((file) => {
            const square = squareOf(file, rank);
            const piece = gameState.board[square];
            const isDark = (file + rank) % 2 === 0;
            const isLastMove = square === lastMoveFrom || square === lastMoveTo;
            return (
              <Square
                key={square}
                isDark={isDark}
                piece={piece}
                isSelected={selected === square}
                isLegalTarget={targetsForSelected.some((m) => m.to === square)}
                isLastMove={isLastMove}
                onClick={() => handleSquareClick(square)}
              />
            );
          }),
        )}
      </div>
      {pendingPromotion && yourColor && (
        <PromotionPicker color={yourColor} onChoose={choosePromotion} />
      )}
    </div>
  );
}
