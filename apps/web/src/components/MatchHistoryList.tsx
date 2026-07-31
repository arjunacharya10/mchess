import { useEffect, useState } from "react";
import { getHistory, type HistoryEntry } from "../lib/api.js";

export function MatchHistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  if (history.length === 0) return null;

  return (
    <section className="history-section">
      <h2>Match history</h2>
      <ul className="history-list">
        {history.map((entry) => (
          <li key={entry.id}>
            {entry.whiteDisplayName} vs {entry.blackDisplayName} — {entry.result} ({entry.resultReason})
          </li>
        ))}
      </ul>
    </section>
  );
}
