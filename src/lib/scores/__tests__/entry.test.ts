import { describe, expect, it } from "vitest";

import { firstHoleNeedingScore, isSuspiciouslyHigh, type GroupHoleScore } from "../entry";

const mkHole = (holeNumber: number, entries: GroupHoleScore[]) => ({
  holeNumber,
  entries,
});

const e = (id: string, strokes: number | null): GroupHoleScore => ({
  gameEntryId: id,
  strokes,
});

describe("firstHoleNeedingScore", () => {
  it("returns hole 1 when every score is missing", () => {
    const holes = Array.from({ length: 18 }, (_, i) => mkHole(i + 1, [e("a", null), e("b", null)]));
    expect(firstHoleNeedingScore(holes)).toBe(1);
  });

  it("returns the first hole with any missing entry", () => {
    const holes = [
      mkHole(1, [e("a", 4), e("b", 4)]),
      mkHole(2, [e("a", 5), e("b", 4)]),
      mkHole(3, [e("a", 4), e("b", null)]), // first with a hole
      mkHole(4, [e("a", null), e("b", null)]),
    ];
    expect(firstHoleNeedingScore(holes)).toBe(3);
  });

  it("returns hole 1 when every entry has a score on every hole", () => {
    const holes = Array.from({ length: 18 }, (_, i) => mkHole(i + 1, [e("a", 4), e("b", 4)]));
    expect(firstHoleNeedingScore(holes)).toBe(1);
  });

  it("handles holes given out of order", () => {
    const holes = [
      mkHole(5, [e("a", null)]),
      mkHole(2, [e("a", 4)]),
      mkHole(1, [e("a", 4)]),
      mkHole(3, [e("a", 4)]),
    ];
    expect(firstHoleNeedingScore(holes)).toBe(5);
  });

  it("falls back to 1 for an empty list", () => {
    expect(firstHoleNeedingScore([])).toBe(1);
  });
});

describe("isSuspiciouslyHigh", () => {
  it.each<[number | null, number, boolean]>([
    [null, 4, false],
    [1, 4, false],
    [4, 4, false],
    [7, 4, false],
    [8, 4, true], // 2× par
    [9, 4, true],
    [6, 3, true], // 2× par-3
    [5, 3, false],
    [10, 5, true],
    [9, 5, false],
  ])("strokes=%s par=%i → %s", (strokes, par, expected) => {
    expect(isSuspiciouslyHigh(strokes, par)).toBe(expected);
  });
});
