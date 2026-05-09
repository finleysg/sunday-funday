import { describe, expect, it } from "vitest";

import {
  firstHoleNeedingScore,
  firstPlayerIndexNeedingScore,
  isSuspiciouslyHigh,
  nextPlayerIndex,
  shouldAdvanceToNextHole,
  shouldAutoAdvanceOnKeystroke,
  type GroupHoleScore,
} from "../entry";

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

describe("shouldAutoAdvanceOnKeystroke", () => {
  it.each<[string, boolean]>([
    ["", false],
    ["1", false], // ambiguous: could be hole-in-one or partial 10-15
    ["2", true],
    ["3", true],
    ["9", true],
    ["10", true],
    ["11", true],
    ["15", true],
    ["16", false], // out of range, wait for blur to revert
    ["19", false],
    ["20", false], // also out of range; only 1x is valid two-digit
    ["0", false], // not a valid score
    ["100", false], // too long
    [" 5", false], // typed-leading-space (rare, but be strict)
    ["5 ", false],
    ["1.5", false],
    ["a", false],
  ])("%s → %s", (value, expected) => {
    expect(shouldAutoAdvanceOnKeystroke(value)).toBe(expected);
  });
});

describe("firstPlayerIndexNeedingScore", () => {
  it("returns 0 when the first player is missing", () => {
    expect(firstPlayerIndexNeedingScore([null, 5, 4])).toBe(0);
  });

  it("returns the index of the first null score", () => {
    expect(firstPlayerIndexNeedingScore([6, null, 4])).toBe(1);
  });

  it("falls back to 0 when every player is filled in", () => {
    expect(firstPlayerIndexNeedingScore([4, 5, 6])).toBe(0);
  });

  it("falls back to 0 for an empty list", () => {
    expect(firstPlayerIndexNeedingScore([])).toBe(0);
  });
});

describe("nextPlayerIndex", () => {
  it("advances to the next index", () => {
    expect(nextPlayerIndex(0, 4)).toBe(1);
    expect(nextPlayerIndex(2, 4)).toBe(3);
  });

  it("wraps from the last index back to the first", () => {
    expect(nextPlayerIndex(3, 4)).toBe(0);
  });

  it("returns 0 for an empty list (defensive)", () => {
    expect(nextPlayerIndex(0, 0)).toBe(0);
    expect(nextPlayerIndex(5, 0)).toBe(0);
  });

  it("works for a single-player group (always self)", () => {
    expect(nextPlayerIndex(0, 1)).toBe(0);
  });
});

describe("shouldAdvanceToNextHole", () => {
  it("advances when a fresh entry completes the hole", () => {
    expect(shouldAdvanceToNextHole([4, 5, 6], true)).toBe(true);
  });

  it("does not advance when the just-edited cell already had a value", () => {
    expect(shouldAdvanceToNextHole([4, 5, 6], false)).toBe(false);
  });

  it("does not advance when another player is still missing", () => {
    expect(shouldAdvanceToNextHole([4, null, 6], true)).toBe(false);
  });

  it("does not advance for an empty group", () => {
    expect(shouldAdvanceToNextHole([], true)).toBe(false);
  });

  it("advances for a single-player group on a fresh entry", () => {
    expect(shouldAdvanceToNextHole([4], true)).toBe(true);
  });
});
