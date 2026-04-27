import { describe, expect, it } from "vitest";

import { stablefordHolePoints, stablefordResult, type StablefordHoleInput } from "../stableford";

describe("stablefordHolePoints", () => {
  it.each<[number, number, number, string]>([
    // par-4 hole, varying net scores
    [2, 4, 4, "eagle (par-2)"],
    [1, 4, 4, "albatross (par-3) still caps at 4"],
    [3, 4, 3, "birdie (par-1)"],
    [4, 4, 2, "par"],
    [5, 4, 1, "bogey (par+1)"],
    [6, 4, 0, "double bogey"],
    [10, 4, 0, "blow-up"],
    // par-3 hole
    [1, 3, 4, "eagle on a par-3 (hole-out 1)"],
    [2, 3, 3, "birdie on a par-3"],
    [3, 3, 2, "par-3 par"],
    // par-5 hole
    [3, 5, 4, "eagle on par-5"],
    [2, 5, 4, "albatross on par-5 still 4"],
  ])("net %i on par %i → %i points (%s)", (net, par, expected) => {
    expect(stablefordHolePoints(net, par)).toBe(expected);
  });
});

const fullRound = (
  pars: number[],
  gross: (number | null)[],
  sis?: number[],
): StablefordHoleInput[] =>
  Array.from({ length: 18 }, (_, i) => ({
    par: pars[i],
    strokeIndex: sis?.[i] ?? i + 1,
    grossStrokes: gross[i] ?? null,
  }));

describe("stablefordResult", () => {
  const allPar4s = Array<number>(18).fill(4);

  it("scratch player who shoots all pars: 36 points", () => {
    const r = stablefordResult(0, fullRound(allPar4s, allPar4s));
    expect(r.points).toBe(36);
    expect(r.holesPlayed).toBe(18);
  });

  it("scratch player who shoots all bogeys: 18 points", () => {
    const r = stablefordResult(0, fullRound(allPar4s, Array(18).fill(5)));
    expect(r.points).toBe(18);
  });

  it("18-handicap player who shoots all bogeys: 36 points (net par)", () => {
    const r = stablefordResult(18, fullRound(allPar4s, Array(18).fill(5)));
    expect(r.points).toBe(36);
  });

  it("birdies count as 3 net", () => {
    // scratch, gross 3 on par 4 = net 3 = birdie = 3 pts
    const gross = Array<number>(18).fill(3);
    const r = stablefordResult(0, fullRound(allPar4s, gross));
    expect(r.points).toBe(18 * 3);
  });

  it("skips unentered holes", () => {
    const gross: (number | null)[] = Array(18).fill(null);
    gross[0] = 4; // par
    gross[1] = 5; // bogey
    const r = stablefordResult(0, fullRound(allPar4s, gross));
    expect(r.points).toBe(2 + 1);
    expect(r.holesPlayed).toBe(2);
  });

  it("blow-up holes contribute 0", () => {
    const gross = Array<number>(18).fill(4);
    gross[0] = 9; // disaster
    const r = stablefordResult(0, fullRound(allPar4s, gross));
    expect(r.points).toBe(17 * 2 + 0);
  });
});
