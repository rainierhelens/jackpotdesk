import type { DeskId } from "../types";

type Props = {
  desk: DeskId;
  onDesk: (desk: DeskId) => void;
};

export function DeskSwitch({ desk, onDesk }: Props) {
  return (
    <div className="segment" role="group" aria-label="Lottery desk">
      <button
        type="button"
        className={desk === "national" ? "on" : ""}
        aria-pressed={desk === "national"}
        onClick={() => onDesk("national")}
      >
        National
      </button>
      <button
        type="button"
        className={desk === "washington" ? "on" : ""}
        aria-pressed={desk === "washington"}
        onClick={() => onDesk("washington")}
      >
        Washington
      </button>
    </div>
  );
}
