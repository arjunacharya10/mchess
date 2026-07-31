import type { WireGameState } from "@mchess/protocol";

export function MoveHistoryList({ moveHistory }: { moveHistory: WireGameState["moveHistory"] }) {
  return (
    <ol className="move-history">
      {moveHistory.map((move, i) => (
        <li key={i}>{move.notation}</li>
      ))}
    </ol>
  );
}
