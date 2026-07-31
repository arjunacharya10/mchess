import type { Color, GameStatus } from "@mchess/chess-engine";
import type { GameOverReason } from "@mchess/protocol";

interface GameStatusBannerProps {
  yourColor: Color | null;
  status: GameStatus | null;
  opponentConnected: boolean;
  drawOfferFrom: Color | null;
  gameOver: { reason: GameOverReason; winner: Color | null } | null;
  onResign: () => void;
  onOfferDraw: () => void;
  onRespondDraw: (accept: boolean) => void;
  /** Read-only viewer: hides Resign/Offer Draw and phrases the outcome neutrally. */
  spectator?: boolean;
}

function describeGameOver(
  reason: GameOverReason,
  winner: Color | null,
  yourColor: Color | null,
  spectator: boolean,
): string {
  const youWon = winner !== null && winner === yourColor;
  const outcome = winner === null ? "Draw" : spectator ? `${winner} won` : youWon ? "You won" : "You lost";
  const reasonText: Record<string, string> = {
    checkmate: "by checkmate",
    stalemate: "by stalemate",
    "insufficient-material": "by insufficient material",
    "threefold-repetition": "by threefold repetition",
    "fifty-move-rule": "by the fifty-move rule",
    resignation: spectator ? "by resignation" : winner === yourColor ? "— opponent resigned" : "by resignation",
    "draw-agreement": "by agreement",
    "disconnect-timeout":
      spectator ? "by disconnection" : winner === yourColor ? "— opponent disconnected" : "by disconnection",
  };
  return `${outcome} ${reasonText[reason ?? ""] ?? ""}`.trim();
}

export function GameStatusBanner({
  yourColor,
  status,
  opponentConnected,
  drawOfferFrom,
  gameOver,
  onResign,
  onOfferDraw,
  onRespondDraw,
  spectator = false,
}: GameStatusBannerProps) {
  if (gameOver) {
    return (
      <div className="status-banner status-banner-over">
        {describeGameOver(gameOver.reason, gameOver.winner, yourColor, spectator)}
      </div>
    );
  }

  return (
    <div className="status-banner">
      <span>{spectator ? "Spectating" : `You are playing ${yourColor ?? "…"}`}</span>
      <span>{opponentConnected ? "Opponent connected" : "Waiting for opponent…"}</span>
      {status?.inCheck && <span className="status-check">Check!</span>}
      {!spectator && drawOfferFrom && drawOfferFrom === yourColor && (
        <span>Waiting for opponent's response…</span>
      )}
      {!spectator && drawOfferFrom && drawOfferFrom !== yourColor && (
        <span>
          Opponent offered a draw.{" "}
          <button type="button" onClick={() => onRespondDraw(true)}>
            Accept
          </button>{" "}
          <button type="button" onClick={() => onRespondDraw(false)}>
            Decline
          </button>
        </span>
      )}
      {!spectator && (
        <div className="status-actions">
          <button type="button" onClick={onOfferDraw} disabled={drawOfferFrom === yourColor}>
            Offer draw
          </button>
          <button type="button" onClick={onResign}>
            Resign
          </button>
        </div>
      )}
    </div>
  );
}
