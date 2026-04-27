// Net Stableford (decisions.md → "Format definitions"): per-hole points
// on the 4/3/2/1/0 scale (eagle-or-better / birdie / par / bogey /
// double-or-worse), using *net* score. Highest total wins.

import { strokesOnHole } from "./strokes";

export function stablefordHolePoints(netStrokes: number, par: number): number {
  const diff = netStrokes - par;
  if (diff <= -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

export type StablefordHoleInput = {
  par: number;
  strokeIndex: number;
  grossStrokes: number | null;
};

export type StablefordResult = {
  points: number;
  holesPlayed: number;
};

export function stablefordResult(
  courseHandicap: number,
  holes: StablefordHoleInput[],
): StablefordResult {
  let points = 0;
  let holesPlayed = 0;
  for (const h of holes) {
    if (h.grossStrokes == null) continue;
    const net = h.grossStrokes - strokesOnHole(courseHandicap, h.strokeIndex);
    points += stablefordHolePoints(net, h.par);
    holesPlayed++;
  }
  return { points, holesPlayed };
}
