import { NextResponse } from "next/server";

import { loadLeaderboard } from "@/lib/leaderboard/load";
import { requireSession } from "@/lib/session";

// GET /api/games/:id/leaderboard
// All signed-in users can read any leaderboard (decisions.md: "all signed-in
// users see all games"). Polled by the leaderboard page every 15s.

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }) {
  await requireSession();
  const { id } = await ctx.params;
  const r = await loadLeaderboard(id);
  if (!r.ok) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({
    game: r.game,
    leaderboard: r.leaderboard,
    fetchedAt: new Date().toISOString(),
  });
}
