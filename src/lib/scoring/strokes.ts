// Strokes a player receives on a single hole given their course handicap
// and that hole's stroke index. Used by every main format and Half-shot
// Skins (decisions.md → "Scoring math").
//
// Distribution: 1 stroke on every hole where SI ≤ (H mod 18), plus
// floor(H / 18) on every hole. Plus handicaps (negative H) work the
// same way using true mathematical modulo, so a +2 returns -1 on the
// two highest-SI holes (giving strokes back) and 0 elsewhere.

export const HOLES_PER_ROUND = 18;

export function strokesOnHole(courseHandicap: number, strokeIndex: number): number {
  if (!Number.isInteger(strokeIndex) || strokeIndex < 1 || strokeIndex > HOLES_PER_ROUND) {
    throw new Error(`strokeIndex must be 1–${HOLES_PER_ROUND}, got ${strokeIndex}`);
  }
  const fullRounds = Math.floor(courseHandicap / HOLES_PER_ROUND);
  // Always 0..17, even for negative handicaps. JS `%` is truncating, so we
  // can't use it directly here.
  const remainder = courseHandicap - fullRounds * HOLES_PER_ROUND;
  return fullRounds + (strokeIndex <= remainder ? 1 : 0);
}
