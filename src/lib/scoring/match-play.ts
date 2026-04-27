// Match-play stroke distribution for Nassau side bets (decisions.md →
// "Scoring math"). The lower handicap plays scratch; the higher handicap
// receives the differential, distributed using their *own* tee's stroke
// indexes. Behavior matches USGA Section 9.

import { strokesOnHole } from "./strokes";

export function matchPlayStrokesOnHole(
  higherHcp: number,
  lowerHcp: number,
  higherPlayerSI: number,
): number {
  const diff = higherHcp - lowerHcp;
  if (diff <= 0) return 0;
  return strokesOnHole(diff, higherPlayerSI);
}
