import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

import { endOfLocalDay, formatGameDate, startOfLocalDay } from "../games/_utils";

// Top-level leaderboard nav: jump straight to today's live game if there is
// exactly one, otherwise pick from a list. Per-game leaderboard pages live at
// /games/:id/leaderboard.

export default async function LeaderboardIndexPage() {
  await requireSession();
  const now = new Date();
  const todayInProgress = await prisma.game.findMany({
    where: {
      status: "IN_PROGRESS",
      date: { gte: startOfLocalDay(now), lte: endOfLocalDay(now) },
    },
    select: { id: true },
    take: 2,
  });
  if (todayInProgress.length === 1) {
    redirect(`/games/${todayInProgress[0]!.id}/leaderboard`);
  }

  const recent = await prisma.game.findMany({
    orderBy: { date: "desc" },
    take: 25,
    include: { course: { select: { name: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Leaderboards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick a game to see live or final standings.
        </p>
      </div>
      <ul className="divide-y rounded-lg border bg-white">
        {recent.length === 0 ? (
          <li className="text-muted-foreground p-4 text-sm">No games yet.</li>
        ) : (
          recent.map((g) => (
            <li key={g.id}>
              <Link
                href={`/games/${g.id}/leaderboard`}
                className="hover:bg-muted flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{g.name}</div>
                  <div className="text-muted-foreground truncate text-sm">
                    {formatGameDate(g.date)} · {g.course.name}
                  </div>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">{g.status}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
