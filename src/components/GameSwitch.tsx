import type { GameId } from "../types";

type Props = {
  game: GameId;
  onGame: (game: GameId) => void;
};

export function GameSwitch({ game, onGame }: Props) {
  return (
    <div className="segment" role="group" aria-label="Lottery">
      <button
        type="button"
        className={game === "powerball" ? "on" : ""}
        onClick={() => onGame("powerball")}
      >
        Powerball
      </button>
      <button
        type="button"
        className={game === "megamillions" ? "on" : ""}
        onClick={() => onGame("megamillions")}
      >
        Mega Millions
      </button>
    </div>
  );
}
