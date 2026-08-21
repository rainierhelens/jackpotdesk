import { describe, expect, it } from "vitest";
import { deskPay, deskPayPhrase, type DeskPaySource } from "./deskPrize";

const HIT5: DeskPaySource = {
  id: "hit5",
  label: "Hit 5",
  officialWhites: [8, 14, 19, 26, 37],
  officialExtra: null,
  cashpot: 230_000,
};

const LOTTO: DeskPaySource = {
  id: "lotto",
  label: "Lotto",
  officialWhites: [5, 8, 17, 28, 32, 41],
  officialExtra: null,
  advertised: "1.2M",
  cash: "600K",
};

const POWER: DeskPaySource = {
  id: "powerball",
  label: "Powerball",
  officialWhites: [5, 12, 23, 44, 61],
  officialExtra: 9,
  advertised: "380M",
  cash: "176M",
};

const MEGA: DeskPaySource = {
  id: "megamillions",
  label: "Mega Millions",
  officialWhites: [2, 9, 18, 30, 50],
  officialExtra: 4,
  cash: "80M",
};

describe("deskPay official tables", () => {
  it("pays $0 for 1 of 5 Hit 5, 1 of 6 Lotto, and 1 of 5 with no Powerball", () => {
    expect(
      deskPay(HIT5, { whites: [8, 1, 2, 3, 4], extra: null }),
    ).toEqual({ kind: "zero", amount: 0, base: false });
    expect(
      deskPay(LOTTO, { whites: [5, 1, 2, 3, 4, 6], extra: null }),
    ).toEqual({ kind: "zero", amount: 0, base: false });
    expect(
      deskPay(POWER, { whites: [5, 1, 2, 3, 4], extra: 8, extraHit: false }),
    ).toEqual({ kind: "zero", amount: 0, base: false });
    expect(
      deskPayPhrase(HIT5, { whites: [8, 1, 2, 3, 4], extra: null }),
    ).toBe("paid $0");
  });

  it("pays $150 for 4 of 5 Hit 5 and $3 for 3 of 6 Lotto", () => {
    expect(
      deskPay(HIT5, { whites: [8, 14, 19, 26, 1], extra: null }),
    ).toEqual({ kind: "cash", amount: 150, base: false });
    expect(
      deskPayPhrase(HIT5, { whites: [8, 14, 19, 26, 1], extra: null }),
    ).toBe("paid $150");
    expect(
      deskPay(LOTTO, { whites: [5, 8, 17, 1, 2, 3], extra: null }),
    ).toEqual({ kind: "cash", amount: 3, base: false });
    expect(
      deskPayPhrase(LOTTO, { whites: [5, 8, 17, 1, 2, 3], extra: null }),
    ).toBe("paid $3");
  });

  it("uses Hit 5 free play and cashpot jackpot, Lotto jackpot from the recap block", () => {
    expect(
      deskPayPhrase(HIT5, { whites: [8, 14, 1, 2, 3], extra: null }),
    ).toBe("paid a free play");
    expect(
      deskPayPhrase(HIT5, { whites: [8, 14, 19, 26, 37], extra: null }),
    ).toBe("paid the jackpot · cashpot $230,000");
    expect(
      deskPayPhrase(LOTTO, { whites: [5, 8, 17, 28, 32, 41], extra: null }),
    ).toBe("paid the jackpot · cash $600K");
  });

  it("uses the official Powerball chart and current Mega Millions base prizes", () => {
    expect(
      deskPayPhrase(POWER, { whites: [5, 12, 1, 2, 3], extra: 9, extraHit: true }),
    ).toBe("paid $7");
    expect(
      deskPayPhrase(POWER, {
        whites: [5, 12, 23, 44, 61],
        extra: 9,
        extraHit: true,
      }),
    ).toBe("paid the jackpot · cash $176M");
    expect(
      deskPayPhrase(MEGA, { whites: [1, 3, 5, 6, 7], extra: 4, extraHit: true }),
    ).toBe("paid base $5");
    expect(
      deskPayPhrase(MEGA, { whites: [2, 9, 1, 3, 5], extra: 4, extraHit: true }),
    ).toBe("paid base $10");
    expect(
      deskPayPhrase(MEGA, { whites: [1, 3, 7, 11, 22], extra: 8, extraHit: false }),
    ).toBe("paid $0");
  });
});
