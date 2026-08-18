import { describe, expect, it } from "vitest";
import { crowdReading, popularityModel } from "./popularity";
import { GAMES } from "./prizes";
import type { GameId } from "../types";

const ids: GameId[] = ["powerball", "megamillions"];

describe("popularity model", () => {
  it("loads weights matching each game matrix", () => {
    for (const id of ids) {
      const model = popularityModel(id);
      expect(model, id).not.toBeNull();
      expect(model?.white.length).toBe(GAMES[id].whiteMax);
      expect(model?.special.length).toBe(GAMES[id].extraMax);
    }
  });

  it("weights average to 1", () => {
    for (const id of ids) {
      const model = popularityModel(id)!;
      const mean = model.white.reduce((a, b) => a + b, 0) / model.white.length;
      expect(mean).toBeCloseTo(1, 2);
    }
  });

  it("scores a birthday board as more crowded than a high board", () => {
    for (const id of ids) {
      const birthday = crowdReading(id, [3, 7, 8, 10, 23], 5)!;
      const high = crowdReading(id, [45, 52, 58, 64, 68], 20)!;
      expect(birthday.index).toBeGreaterThan(1);
      expect(high.index).toBeLessThan(1);
      expect(high.beats).toBeGreaterThan(birthday.beats);
    }
  });

  it("keeps percentile readings in range", () => {
    for (const id of ids) {
      const r = crowdReading(id, [1, 2, 3, 4, 5], 1)!;
      expect(r.beats).toBeGreaterThanOrEqual(0);
      expect(r.beats).toBeLessThanOrEqual(100);
      expect(r.index).toBeGreaterThan(0);
    }
  });
});
