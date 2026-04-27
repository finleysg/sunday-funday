// Net stroke play (decisions.md → "Format definitions"): sum of
// (gross − strokesOnHole) over all entered holes; lowest wins.
// Holes without a strokes value are skipped — the caller tracks "thru".

import { strokesOnHole } from "./strokes";

export type StrokeHoleInput = {
  strokeIndex: number;
  grossStrokes: number | null;
};

export type StrokePlayResult = {
  netTotal: number;
  grossTotal: number;
  holesPlayed: number;
};

export function strokePlayResult(
  courseHandicap: number,
  holes: StrokeHoleInput[],
): StrokePlayResult {
  let netTotal = 0;
  let grossTotal = 0;
  let holesPlayed = 0;
  for (const h of holes) {
    if (h.grossStrokes == null) continue;
    netTotal += h.grossStrokes - strokesOnHole(courseHandicap, h.strokeIndex);
    grossTotal += h.grossStrokes;
    holesPlayed++;
  }
  return { netTotal, grossTotal, holesPlayed };
}
