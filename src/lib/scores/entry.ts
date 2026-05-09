// Pure helpers for the score-entry UI. Kept outside the React component so
// the behaviour is unit-testable without React.

export type GroupHoleScore = {
  // Each entry in the group, with this hole's strokes (or null = unentered).
  gameEntryId: string;
  strokes: number | null;
};

// Default landing hole when opening the score entry screen: the first hole
// with at least one missing score, else hole 1 if every hole is full.
// `holes` is keyed by holeNumber → array of group entry scores.
export function firstHoleNeedingScore(
  holes: { holeNumber: number; entries: GroupHoleScore[] }[],
): number {
  const sorted = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  for (const h of sorted) {
    if (h.entries.some((e) => e.strokes == null)) return h.holeNumber;
  }
  return sorted[0]?.holeNumber ?? 1;
}

// Sub-2× par warning: per decisions.md, this is a non-blocking soft check
// for likely fat-fingers (e.g. typing 12 on a par-4). Returns true when
// strokes ≥ 2 × par. Null strokes are not flagged.
export function isSuspiciouslyHigh(strokes: number | null, par: number): boolean {
  if (strokes == null) return false;
  return strokes >= par * 2;
}

// True when the typed value is an unambiguous, in-range score and the row
// should auto-commit and move focus to the next player. The deliberate
// exception is "1" — it could still grow into 10–15, or be a real hole-
// in-one — so we wait for blur/Enter rather than guessing.
export function shouldAutoAdvanceOnKeystroke(value: string): boolean {
  return /^[2-9]$/.test(value) || /^1[0-5]$/.test(value);
}

// Index of the player whose input should receive focus when landing on a
// hole: the first one with a missing score, falling back to 0 when every
// score is filled (or the list is empty).
export function firstPlayerIndexNeedingScore(strokes: (number | null)[]): number {
  const idx = strokes.findIndex((s) => s == null);
  return idx >= 0 ? idx : 0;
}

// Index to focus after a player's score is auto-committed. Wraps back to 0
// after the last player so the typist stays in flow.
export function nextPlayerIndex(fromIndex: number, count: number): number {
  if (count <= 0) return 0;
  return (fromIndex + 1) % count;
}

// True when an auto-commit on a hole should jump focus to the next hole
// instead of the next player. We only do this during fresh entry — if the
// cell already had a value, the user is correcting a score and shouldn't be
// teleported away.
export function shouldAdvanceToNextHole(
  strokesByPlayer: (number | null)[],
  wasNewEntry: boolean,
): boolean {
  if (!wasNewEntry) return false;
  if (strokesByPlayer.length === 0) return false;
  return strokesByPlayer.every((s) => s != null);
}
