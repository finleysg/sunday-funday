// GET /api/games/:id/nassau?a=<gameEntryId>&b=<gameEntryId>
// On-demand Nassau result (decisions.md → "Side bets"). Computed each call
// from the live `Score` table — never persisted.

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { nassau, type NassauHole } from "@/lib/scoring/nassau";
import { requireSession } from "@/lib/session";

type Params = Promise<{ id: string }>;

export async function GET(req: Request, ctx: { params: Params }) {
  await requireSession();
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const aId = url.searchParams.get("a");
  const bId = url.searchParams.get("b");
  if (!aId || !bId || aId === bId) {
    return NextResponse.json({ error: "Two distinct game entries are required" }, { status: 400 });
  }

  const entries = await prisma.gameEntry.findMany({
    where: { gameId: id, id: { in: [aId, bId] } },
    include: {
      player: { select: { name: true } },
      tee: {
        select: {
          holes: {
            orderBy: { holeNumber: "asc" },
            select: { holeNumber: true, strokeIndex: true },
          },
        },
      },
      scores: { orderBy: { holeNumber: "asc" } },
    },
  });
  if (entries.length !== 2) {
    return NextResponse.json({ error: "Entries not found" }, { status: 404 });
  }

  const byId = new Map(entries.map((e) => [e.id, e]));
  const a = byId.get(aId)!;
  const b = byId.get(bId)!;

  const result = nassau(
    {
      playerId: a.id,
      courseHandicap: a.courseHandicap,
      holes: toNassauHoles(a),
    },
    {
      playerId: b.id,
      courseHandicap: b.courseHandicap,
      holes: toNassauHoles(b),
    },
    { aDisplay: a.player.name, bDisplay: b.player.name },
  );

  return NextResponse.json({
    a: { id: a.id, name: a.player.name, courseHandicap: a.courseHandicap },
    b: { id: b.id, name: b.player.name, courseHandicap: b.courseHandicap },
    result,
  });
}

function toNassauHoles(entry: {
  tee: { holes: { holeNumber: number; strokeIndex: number }[] };
  scores: { holeNumber: number; strokes: number | null }[];
}): NassauHole[] {
  const siByHole = new Map(entry.tee.holes.map((h) => [h.holeNumber, h.strokeIndex]));
  const grossByHole = new Map(entry.scores.map((s) => [s.holeNumber, s.strokes]));
  return Array.from({ length: 18 }, (_, i) => {
    const holeNumber = i + 1;
    return {
      holeNumber,
      strokeIndex: siByHole.get(holeNumber) ?? holeNumber,
      grossStrokes: grossByHole.get(holeNumber) ?? null,
    };
  });
}
