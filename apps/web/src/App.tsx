import { useRoute } from "./lib/router.js";
import { HomePage } from "./routes/HomePage.js";
import { MatchmakingPage } from "./routes/MatchmakingPage.js";
import { RoomPage } from "./routes/RoomPage.js";
import { SoloPage } from "./routes/SoloPage.js";
import { SpectatePage } from "./routes/SpectatePage.js";

export function App() {
  const path = useRoute();
  const roomMatch = path.match(/^\/game\/([^/]+)$/);
  const watchMatch = path.match(/^\/watch\/([^/]+)$/);

  if (roomMatch) return <RoomPage gameId={roomMatch[1]} />;
  if (watchMatch) return <SpectatePage gameId={watchMatch[1]} />;
  if (path === "/matchmaking") return <MatchmakingPage />;
  if (path === "/solo") return <SoloPage />;
  return <HomePage />;
}
