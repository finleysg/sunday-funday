import { describe, expect, it } from "vitest";

import { matchPlayStrokesOnHole } from "../match-play";

describe("matchPlayStrokesOnHole", () => {
  it.each<[number, number, number, number]>([
    // 3 vs 10: 7-stroke differential, distributed by 10's tee SI 1–7
    [10, 3, 1, 1],
    [10, 3, 7, 1],
    [10, 3, 8, 0],
    [10, 3, 18, 0],
    // equal handicaps → no strokes
    [5, 5, 1, 0],
    [5, 5, 18, 0],
    [-3, -3, 1, 0],
    // plus vs +N: -2 (the +2) is "higher" vs -5 (+5), diff=3
    [-2, -5, 1, 1],
    [-2, -5, 3, 1],
    [-2, -5, 4, 0],
    // scratch vs +N: 0 vs -3, diff=3, scratch is higher
    [0, -3, 1, 1],
    [0, -3, 3, 1],
    [0, -3, 4, 0],
    // defensive: caller passed higher/lower swapped → no strokes (already
    // covered by the diff-≤-0 branch, but worth nailing down)
    [3, 10, 1, 0],
    // 18+ differential: every hole gets at least 1 stroke
    [20, 0, 18, 1],
    [20, 0, 1, 2],
    [20, 0, 2, 2],
    [20, 0, 3, 1],
  ])("higher=%i lower=%i SI=%i → %i", (higher, lower, si, expected) => {
    expect(matchPlayStrokesOnHole(higher, lower, si)).toBe(expected);
  });
});
