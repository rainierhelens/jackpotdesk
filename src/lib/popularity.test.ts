import { describe, expect, it } from "vitest";
import {
  crowdReading,
  deskPickTickets,
  deskPickWaPlays,
  popularityModel,
  waCrowdReading,
  waPopularityModel,
} from "./popularity";
import { DEFAULT_FILTERS, rejectReasons } from "./picks";
import { GAMES } from "./prizes";
import { WA_GAMES } from "./waGames";
import { DEFAULT_WA_FILTERS } from "./waPicks";
import type { GameId, WaGameId } from "../types";

const ids: GameId[] = ["powerball", "megamillions"];
const waIds: WaGameId[] = ["hit5", "lotto", "match4", "cashpop"];

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

describe("washington popularity model", () => {
  it("loads weights matching each game matrix", () => {
    for (const id of waIds) {
      const model = waPopularityModel(id);
      expect(model, id).not.toBeNull();
      expect(model?.white.length).toBe(WA_GAMES[id].whiteMax);
    }
  });

  it("ranks a board of the most-picked numbers above the least-picked", () => {
    for (const id of ["hit5", "lotto", "match4"] as WaGameId[]) {
      const model = waPopularityModel(id)!;
      const ranked = model.white
        .map((w, i) => ({ n: i + 1, w }))
        .sort((a, b) => b.w - a.w)
        .map((x) => x.n);
      const hot = waCrowdReading(id, ranked.slice(0, model.pick))!;
      const cold = waCrowdReading(id, ranked.slice(-model.pick))!;
      expect(hot.index).toBeGreaterThan(cold.index);
      expect(cold.beats).toBeGreaterThan(hot.beats);
    }
  });

  it("reads cash pop picks directly", () => {
    const model = waPopularityModel("cashpop")!;
    expect(model.pick).toBe(1);
    for (let n = 1; n <= 15; n++) {
      const r = waCrowdReading("cashpop", [n])!;
      expect(r.index).toBeGreaterThan(0);
      expect(r.beats).toBeGreaterThanOrEqual(0);
      expect(r.beats).toBeLessThanOrEqual(100);
    }
  });

  it("rejects boards of the wrong size", () => {
    expect(waCrowdReading("hit5", [1, 2, 3])).toBeNull();
  });
});

describe("desk pick", () => {
  const NO_PAST = new Set<string>();

  it("mints national boards that clear the fades and sit in the uncrowded tail", () => {
    for (const id of ids) {
      const result = deskPickTickets(id, 3, DEFAULT_FILTERS, NO_PAST)!;
      expect(result.tickets.length).toBe(3);
      for (const t of result.tickets) {
        expect(t.whites.length).toBe(5);
        expect(rejectReasons(t.whites, DEFAULT_FILTERS, NO_PAST)).toEqual([]);
        const reading = crowdReading(id, t.whites, t.extra)!;
        expect(reading.index).toBeLessThan(1);
        expect(reading.beats).toBeGreaterThanOrEqual(85);
      }
    }
  });

  it("respects slip uniqueness on national desk picks", () => {
    const result = deskPickTickets("powerball", 6, DEFAULT_FILTERS, NO_PAST)!;
    const all = result.tickets.flatMap((t) => t.whites);
    expect(new Set(all).size).toBe(all.length);
  });

  it("mints uncrowded Washington boards", () => {
    // uniqueSlip off isolates the engine: with it on, later boards on small
    // pools are forced deeper into the ranking by design.
    const filters = { ...DEFAULT_WA_FILTERS, uniqueSlip: false };
    for (const id of ["hit5", "match4"] as WaGameId[]) {
      const spec = WA_GAMES[id];
      const result = deskPickWaPlays(
        spec,
        spec.whiteCount,
        4,
        filters,
        NO_PAST,
      )!;
      expect(result.tickets.length).toBe(4);
      for (const t of result.tickets) {
        expect(waCrowdReading(id, t.numbers)!.beats).toBeGreaterThanOrEqual(85);
      }
    }
  });

  it("respects slip uniqueness on Washington desk picks", () => {
    const spec = WA_GAMES.hit5;
    const result = deskPickWaPlays(
      spec,
      spec.whiteCount,
      4,
      DEFAULT_WA_FILTERS,
      NO_PAST,
    )!;
    const all = result.tickets.flatMap((t) => t.numbers);
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps Lotto desk picks in disjoint pairs", () => {
    const spec = WA_GAMES.lotto;
    const result = deskPickWaPlays(
      spec,
      spec.whiteCount,
      4,
      { ...DEFAULT_WA_FILTERS, uniqueSlip: false },
      NO_PAST,
    )!;
    expect(result.tickets.length % 2).toBe(0);
    for (let i = 0; i < result.tickets.length; i += 2) {
      const a = new Set(result.tickets[i].numbers);
      const overlap = result.tickets[i + 1].numbers.filter((n) => a.has(n));
      expect(overlap).toEqual([]);
    }
  });
});
