import { describe, expect, it } from "vitest";

import { strokePlayResult, type StrokeHoleInput } from "../stroke";

const fullRound = (gross: number[], sis?: number[]): StrokeHoleInput[] =>
  Array.from({ length: 18 }, (_, i) => ({
    strokeIndex: sis?.[i] ?? i + 1,
    grossStrokes: gross[i] ?? null,
  }));

describe("strokePlayResult", () => {
  it("scratch player who shoots all 4s totals 72 net (and 72 gross)", () => {
    const r = strokePlayResult(0, fullRound(Array(18).fill(4)));
    expect(r.grossTotal).toBe(72);
    expect(r.netTotal).toBe(72);
    expect(r.holesPlayed).toBe(18);
  });

  it("18-handicap player who shoots all 4s nets 54 (one stroke per hole)", () => {
    const r = strokePlayResult(18, fullRound(Array(18).fill(4)));
    expect(r.grossTotal).toBe(72);
    expect(r.netTotal).toBe(54);
    expect(r.holesPlayed).toBe(18);
  });

  it("22-handicap player: 22 strokes deducted from gross", () => {
    // 22 strokes total: 1 per hole + 1 extra on SI 1–4 = 18 + 4 = 22
    const r = strokePlayResult(22, fullRound(Array(18).fill(5)));
    expect(r.grossTotal).toBe(90);
    expect(r.netTotal).toBe(68);
  });

  it("plus handicap (-2) gets 2 strokes added back", () => {
    const r = strokePlayResult(-2, fullRound(Array(18).fill(4)));
    expect(r.grossTotal).toBe(72);
    expect(r.netTotal).toBe(74);
  });

  it("skips unentered holes and reports holesPlayed", () => {
    const gross: (number | null)[] = Array(18).fill(null);
    gross[0] = 4;
    gross[1] = 5;
    gross[2] = 3;
    const holes: StrokeHoleInput[] = Array.from({ length: 18 }, (_, i) => ({
      strokeIndex: i + 1,
      grossStrokes: gross[i],
    }));
    const r = strokePlayResult(0, holes);
    expect(r.grossTotal).toBe(12);
    expect(r.netTotal).toBe(12);
    expect(r.holesPlayed).toBe(3);
  });

  it("handles a sample round with mixed scores correctly", () => {
    // par: doesn't matter for stroke total; just sum and subtract handicap
    // strokes received per hole
    const gross = [4, 5, 3, 6, 4, 4, 5, 4, 4, 5, 4, 5, 3, 6, 4, 4, 5, 4];
    // Default SIs 1..18 ascending; H=10 → strokes on SI 1..10 (= holes 1..10)
    const r = strokePlayResult(10, fullRound(gross));
    const expectedGross = gross.reduce((a, b) => a + b, 0);
    expect(r.grossTotal).toBe(expectedGross);
    expect(r.netTotal).toBe(expectedGross - 10);
  });

  it("handles SIs that don't match hole order", () => {
    // hole 1 has SI 18 (easiest); hole 18 has SI 1 (hardest)
    const sis = Array.from({ length: 18 }, (_, i) => 18 - i);
    const r = strokePlayResult(1, fullRound(Array(18).fill(4), sis));
    // H=1 → 1 stroke on SI 1 → applied to hole 18
    expect(r.netTotal).toBe(72 - 1);
  });

  it("returns zeros for an empty round", () => {
    const r = strokePlayResult(10, fullRound([]));
    expect(r.grossTotal).toBe(0);
    expect(r.netTotal).toBe(0);
    expect(r.holesPlayed).toBe(0);
  });
});
