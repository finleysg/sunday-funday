import { prisma } from "@/lib/db";

// Returns each player's most recently played tee/handicap at the given
// course, derived from their `GameEntry` rows on prior games at that course.
// Used as the default when building the roster for a new game.

export type LastUsed = { teeId: string; courseHandicap: number };

export async function lastUsedTeeForPlayers(
  courseId: string,
  playerIds: string[],
  excludeGameId?: string,
): Promise<Map<string, LastUsed>> {
  if (playerIds.length === 0) return new Map();
  const entries = await prisma.gameEntry.findMany({
    where: {
      playerId: { in: playerIds },
      game: { courseId, ...(excludeGameId ? { id: { not: excludeGameId } } : {}) },
    },
    orderBy: { game: { date: "desc" } },
    select: {
      playerId: true,
      teeId: true,
      courseHandicap: true,
    },
  });
  const out = new Map<string, LastUsed>();
  for (const e of entries) {
    if (!out.has(e.playerId)) {
      out.set(e.playerId, { teeId: e.teeId, courseHandicap: e.courseHandicap });
    }
  }
  return out;
}
