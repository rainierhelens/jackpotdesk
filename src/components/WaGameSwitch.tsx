import { WA_GAME_ORDER, WA_GAMES } from "../lib/waGames";
import type { WaGameId } from "../types";

type Props = {
  game: WaGameId;
  onGame: (game: WaGameId) => void;
};

export function WaGameSwitch({ game, onGame }: Props) {
  return (
    <div className="segment is-wrap" role="group" aria-label="Washington lottery">
      {WA_GAME_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          className={game === id ? "on" : ""}
          aria-pressed={game === id}
          onClick={() => onGame(id)}
        >
          {WA_GAMES[id].label}
        </button>
      ))}
    </div>
  );
}
