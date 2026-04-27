// Chicago 39 (decisions.md → "Format definitions"). Quota = 39 − H.
// Per-hole points are gross-based (not net): bogey 1, par 2, birdie 4,
// eagle 8, double-eagle 16, anything worse 0. Round score = sum − quota,
// highest wins.

export function chicagoHolePoints(grossStrokes: number, par: number): number {
  const diff = grossStrokes - par;
  if (diff <= -3) return 16;
  if (diff === -2) return 8;
  if (diff === -1) return 4;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}

export function chicagoQuota(courseHandicap: number): number {
  return 39 - courseHandicap;
}

export type ChicagoHoleInput = {
  par: number;
  grossStrokes: number | null;
};

export type ChicagoResult = {
  points: number;
  quota: number;
  vsQuota: number;
  holesPlayed: number;
};

export function chicagoResult(courseHandicap: number, holes: ChicagoHoleInput[]): ChicagoResult {
  let points = 0;
  let holesPlayed = 0;
  for (const h of holes) {
    if (h.grossStrokes == null) continue;
    points += chicagoHolePoints(h.grossStrokes, h.par);
    holesPlayed++;
  }
  const quota = chicagoQuota(courseHandicap);
  return { points, quota, vsQuota: points - quota, holesPlayed };
}
