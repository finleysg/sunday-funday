// Half-shot skins per-hole resolver (decisions.md → "Format definitions").
//
// Lowest unique net wins outright. On a tie at the lowest net, a "natural"
// (gross ≤ par − 1, i.e. a real birdie or better) beats anyone who used a
// stroke to match. Among the tied naturals, the lowest gross wins; tied
// naturals at the same gross → skin dead. If no one in the tied group has
// a natural, the skin is also dead.

export type HalfShotEntry = {
  playerId: string;
  par: number;
  grossStrokes: number | null;
  netStrokes: number | null;
};

export function halfShotSkinWinner(entries: HalfShotEntry[]): string | null {
  const valid = entries.filter((e) => e.grossStrokes != null && e.netStrokes != null);
  if (valid.length < 2) return null;

  let minNet = Infinity;
  for (const e of valid) {
    if (e.netStrokes! < minNet) minNet = e.netStrokes!;
  }
  const tied = valid.filter((e) => e.netStrokes === minNet);
  if (tied.length === 1) return tied[0]!.playerId;

  // Tiebreaker: only natural birdies/eagles can break the tie.
  const naturals = tied.filter((e) => e.grossStrokes! <= e.par - 1);
  if (naturals.length === 0) return null;

  let minGross = Infinity;
  for (const e of naturals) {
    if (e.grossStrokes! < minGross) minGross = e.grossStrokes!;
  }
  const lowestNaturals = naturals.filter((e) => e.grossStrokes === minGross);
  return lowestNaturals.length === 1 ? lowestNaturals[0]!.playerId : null;
}
