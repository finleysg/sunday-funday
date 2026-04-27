// Net skins per-hole resolver (decisions.md → "Format definitions").
// Lowest unique net wins the hole; any tie kills the skin (no carry-over).
// Holes with fewer than two valid scores can't have a winner.

export type SkinEntry = {
  playerId: string;
  netStrokes: number | null;
};

export function netSkinWinner(entries: SkinEntry[]): string | null {
  let min = Infinity;
  let winner: string | null = null;
  let tied = false;
  let valid = 0;
  for (const e of entries) {
    if (e.netStrokes == null) continue;
    valid++;
    if (e.netStrokes < min) {
      min = e.netStrokes;
      winner = e.playerId;
      tied = false;
    } else if (e.netStrokes === min) {
      tied = true;
    }
  }
  if (valid < 2) return null;
  return tied ? null : winner;
}
