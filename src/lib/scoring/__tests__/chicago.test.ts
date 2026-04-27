import { describe, expect, it } from "vitest";

import { chicagoHolePoints, chicagoQuota, chicagoResult, type ChicagoHoleInput } from "../chicago";

describe("chicagoHolePoints", () => {
  it.each<[number, number, number, string]>([
    // par-4 hole
    [1, 4, 16, "double eagle on a par 4 (hole-out)"],
    [2, 4, 8, "eagle"],
    [3, 4, 4, "birdie"],
    [4, 4, 2, "par"],
    [5, 4, 1, "bogey"],
    [6, 4, 0, "double bogey"],
    [9, 4, 0, "disaster"],
    // par-3 hole
    [1, 3, 8, "ace = eagle on a par-3"],
    [2, 3, 4, "birdie on a par-3"],
    [3, 3, 2, "par"],
    [4, 3, 1, "bogey"],
    // par-5 hole
    [2, 5, 16, "albatross on a par-5"],
    [3, 5, 8, "eagle"],
    [4, 5, 4, "birdie"],
    [5, 5, 2, "par"],
  ])("gross %i on par %i → %i (%s)", (gross, par, expected) => {
    expect(chicagoHolePoints(gross, par)).toBe(expected);
  });
});

describe("chicagoQuota", () => {
  it.each<[number, number]>([
    [0, 39],
    [10, 29],
    [18, 21],
    [22, 17],
    [-2, 41],
  ])("H=%i → quota %i", (h, expected) => {
    expect(chicagoQuota(h)).toBe(expected);
  });
});

const fullRound = (pars: number[], gross: (number | null)[]): ChicagoHoleInput[] =>
  Array.from({ length: 18 }, (_, i) => ({
    par: pars[i],
    grossStrokes: gross[i] ?? null,
  }));

describe("chicagoResult", () => {
  const allPar4s = Array<number>(18).fill(4);

  it("scratch player shoots all pars: 36 points, quota 39 → -3", () => {
    const r = chicagoResult(0, fullRound(allPar4s, allPar4s));
    expect(r.points).toBe(36);
    expect(r.quota).toBe(39);
    expect(r.vsQuota).toBe(-3);
    expect(r.holesPlayed).toBe(18);
  });

  it("18-handicap player shoots all pars: 36 points, quota 21 → +15", () => {
    const r = chicagoResult(18, fullRound(allPar4s, allPar4s));
    expect(r.points).toBe(36);
    expect(r.quota).toBe(21);
    expect(r.vsQuota).toBe(15);
  });

  it("scratch player who shoots all bogeys: 18 points, vsQuota -21", () => {
    const r = chicagoResult(0, fullRound(allPar4s, Array(18).fill(5)));
    expect(r.points).toBe(18);
    expect(r.vsQuota).toBe(-21);
  });

  it("partial round counts only entered holes", () => {
    const gross: (number | null)[] = Array(18).fill(null);
    gross[0] = 4; // par → 2
    gross[1] = 3; // birdie → 4
    gross[2] = 5; // bogey → 1
    const r = chicagoResult(10, fullRound(allPar4s, gross));
    expect(r.points).toBe(7);
    expect(r.quota).toBe(29);
    expect(r.vsQuota).toBe(-22);
    expect(r.holesPlayed).toBe(3);
  });

  it("uses gross — handicap does not affect hole points (only quota)", () => {
    // Two players, same gross. They get the same `points`; their
    // `vsQuota` differs only by handicap.
    const gross = Array<number>(18).fill(4);
    const a = chicagoResult(0, fullRound(allPar4s, gross));
    const b = chicagoResult(15, fullRound(allPar4s, gross));
    expect(a.points).toBe(b.points);
    expect(a.vsQuota - b.vsQuota).toBe(-15);
  });
});
