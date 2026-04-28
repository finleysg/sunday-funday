// GET /api/games/:id/export.xlsx
// Excel export — Summary, Gross/Net Scorecards, Skins (when enabled).
// Available once the game has entered IN_PROGRESS (decisions.md).

import { prisma } from "@/lib/db";
import { buildGameExportWorkbook } from "@/lib/export/xlsx";
import { loadLeaderboard } from "@/lib/leaderboard/load";
import { requireSession } from "@/lib/session";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }) {
  await requireSession();
  const { id } = await ctx.params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      course: { include: { holes: { orderBy: { holeNumber: "asc" } } } },
      entries: {
        orderBy: { player: { name: "asc" } },
        include: {
          player: { select: { id: true, name: true } },
          tee: {
            select: {
              name: true,
              holes: {
                orderBy: { holeNumber: "asc" },
                select: { holeNumber: true, strokeIndex: true },
              },
            },
          },
          scores: { orderBy: { holeNumber: "asc" } },
        },
      },
    },
  });
  if (!game) return new Response("Not found", { status: 404 });
  if (game.status === "SETUP") {
    return new Response("Game has not started yet", { status: 409 });
  }

  const r = await loadLeaderboard(id);
  if (!r.ok) return new Response("Not found", { status: 404 });

  const pars = Array.from({ length: 18 }, (_, i) => {
    const hole = game.course.holes.find((h) => h.holeNumber === i + 1);
    return hole?.par ?? 4;
  });

  const buf = await buildGameExportWorkbook({
    game: {
      name: game.name,
      date: game.date,
      courseName: game.course.name,
      format: game.format,
      skinsType: game.skinsType,
    },
    pars,
    entries: game.entries.map((e) => {
      const teeSi = new Map(e.tee.holes.map((h) => [h.holeNumber, h.strokeIndex]));
      return {
        gameEntryId: e.id,
        playerName: e.player.name,
        teeName: e.tee.name,
        courseHandicap: e.courseHandicap,
        strokeIndexes: Array.from({ length: 18 }, (_, i) => teeSi.get(i + 1) ?? i + 1),
        scoresByHole: Object.fromEntries(e.scores.map((s) => [s.holeNumber, s.strokes])) as Record<
          number,
          number | null
        >,
      };
    }),
    leaderboard: r.leaderboard,
  });

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeFileName(game.name)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

function safeFileName(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "game";
}
