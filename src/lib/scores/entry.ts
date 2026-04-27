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

// Auto-advance trigger: after a write, if every entry on the current hole
// has a non-null score, the carousel should move to the next hole.
export function shouldAutoAdvance(entries: GroupHoleScore[]): boolean {
  if (entries.length === 0) return false;
  return entries.every((e) => e.strokes != null);
}
