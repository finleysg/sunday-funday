import { describe, expect, it } from "vitest";

import { strokesOnHole } from "../strokes";

describe("strokesOnHole", () => {
  describe("standard handicaps", () => {
    it.each<[number, number, number]>([
      // H=18: 1 stroke on every hole
      [18, 1, 1],
      [18, 9, 1],
      [18, 17, 1],
      [18, 18, 1],
      // H=22: 1 on every hole, plus an extra on SI 1–4
      [22, 1, 2],
      [22, 4, 2],
      [22, 5, 1],
      [22, 18, 1],
      // H=9: 1 on SI 1–9, 0 on SI 10–18
      [9, 1, 1],
      [9, 9, 1],
      [9, 10, 0],
      [9, 18, 0],
      // H=0: nothing
      [0, 1, 0],
      [0, 18, 0],
      // H=1: just SI 1
      [1, 1, 1],
      [1, 2, 0],
    ])("H=%i SI=%i → %i", (h, si, expected) => {
      expect(strokesOnHole(h, si)).toBe(expected);
    });
  });

  describe("plus handicaps (give strokes back)", () => {
    it.each<[number, number, number]>([
      // H=-2: gives strokes on SI 17, 18 only
      [-2, 1, 0],
      [-2, 16, 0],
      [-2, 17, -1],
      [-2, 18, -1],
      // H=-1: gives stroke on SI 18 only
      [-1, 17, 0],
      [-1, 18, -1],
      // H=-5: gives strokes on SI 14–18
      [-5, 13, 0],
      [-5, 14, -1],
      [-5, 18, -1],
    ])("H=%i SI=%i → %i", (h, si, expected) => {
      expect(strokesOnHole(h, si)).toBe(expected);
    });
  });

  describe("very high / very low handicaps", () => {
    it("H=36 → 2 strokes on every hole", () => {
      for (let si = 1; si <= 18; si++) {
        expect(strokesOnHole(36, si)).toBe(2);
      }
    });

    it("H=37 → 3 on SI 1, 2 elsewhere", () => {
      expect(strokesOnHole(37, 1)).toBe(3);
      expect(strokesOnHole(37, 2)).toBe(2);
      expect(strokesOnHole(37, 18)).toBe(2);
    });

    it("H=-18 → -1 on every hole", () => {
      for (let si = 1; si <= 18; si++) {
        expect(strokesOnHole(-18, si)).toBe(-1);
      }
    });

    it("H=-20 → -2 on SI 17–18, -1 elsewhere", () => {
      expect(strokesOnHole(-20, 1)).toBe(-1);
      expect(strokesOnHole(-20, 16)).toBe(-1);
      expect(strokesOnHole(-20, 17)).toBe(-2);
      expect(strokesOnHole(-20, 18)).toBe(-2);
    });
  });

  describe("input validation", () => {
    it("throws when SI is out of range", () => {
      expect(() => strokesOnHole(10, 0)).toThrow(/strokeIndex/);
      expect(() => strokesOnHole(10, 19)).toThrow(/strokeIndex/);
    });

    it("throws when SI is not an integer", () => {
      expect(() => strokesOnHole(10, 1.5)).toThrow(/strokeIndex/);
    });
  });
});
