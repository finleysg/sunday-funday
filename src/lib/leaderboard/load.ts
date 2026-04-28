// Loads everything `computeLeaderboard` needs from the DB in one round trip.
// Used by both the JSON API (Phase 7 polling) and the server-rendered page
// (initial paint), so they always agree on the snapshot.

import { prisma } from "@/lib/db";
import {
  computeLeaderboard,
  type LeaderboardResult,
  type GameFormat,
  type SkinsType,
} from "./compute";

export type LeaderboardLoadOk = {
  ok: true;
  game: {
    id: string;
    name: string;
    date: Date;
    courseName: string;
    status: "SETUP" | "IN_PROGRESS" | "COMPLETE";
    format: GameFormat;
    skinsType: SkinsType;
  };
  leaderboard: LeaderboardResult;
};

export type LeaderboardLoadResult = LeaderboardLoadOk | { ok: false; reason: "not_found" };

export async function loadLeaderboard(gameId: string): Promise<LeaderboardLoadResult> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      course: {
        include: { holes: { orderBy: { holeNumber: "asc" } } },
      },
      entries: {
        orderBy: { player: { name: "asc" } },
        include: {
          player: { select: { id: true, name: true } },
          tee: { include: { holes: { orderBy: { holeNumber: "asc" } } } },
          scores: { orderBy: { holeNumber: "asc" } },
        },
      },
    },
  });
  if (!game) return { ok: false, reason: "not_found" };

  const pars = Array.from({ length: 18 }, (_, i) => {
    const hole = game.course.holes.find((h) => h.holeNumber === i + 1);
    return hole?.par ?? 4;
  });

  const leaderboard = computeLeaderboard({
    format: game.format,
    skinsType: game.skinsType,
    pars,
    entries: game.entries.map((e) => {
      const teeSi = new Map(e.tee.holes.map((h) => [h.holeNumber, h.strokeIndex]));
      const scoresByHole: Record<number, number | null> = {};
      for (const s of e.scores) scoresByHole[s.holeNumber] = s.strokes;
      return {
        gameEntryId: e.id,
        playerId: e.player.id,
        playerName: e.player.name,
        courseHandicap: e.courseHandicap,
        strokeIndexes: Array.from({ length: 18 }, (_, i) => teeSi.get(i + 1) ?? i + 1),
        scoresByHole,
      };
    }),
  });

  return {
    ok: true,
    game: {
      id: game.id,
      name: game.name,
      date: game.date,
      courseName: game.course.name,
      status: game.status,
      format: game.format,
      skinsType: game.skinsType,
    },
    leaderboard,
  };
}
