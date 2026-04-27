import Link from "next/link";

import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

import { startOfLocalDay, endOfLocalDay, formatGameDate, formatFormat } from "./_utils";

export default async function GamesPage() {
  const session = await requireSession();
  const admin = isAdmin(session.user.email);
  const now = new Date();

  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);

  const games = await prisma.game.findMany({
    orderBy: { date: "desc" },
    include: {
      course: { select: { name: true } },
      _count: { select: { entries: true } },
    },
  });

  const todayInProgress = games.filter(
    (g) => g.status === "IN_PROGRESS" && g.date >= todayStart && g.date <= todayEnd,
  );
  const others = games.filter((g) => !todayInProgress.includes(g));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Games</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All games across the roster — newest first.
          </p>
        </div>
        {admin ? (
          <Button asChild>
            <Link href="/games/new">Create game</Link>
          </Button>
        ) : null}
      </div>

      {todayInProgress.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Today</h2>
          <ul className="divide-y rounded-lg border bg-white">
            {todayInProgress.map((g) => (
              <GameRow key={g.id} game={g} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">All games</h2>
        <ul className="divide-y rounded-lg border bg-white">
          {others.length === 0 && todayInProgress.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              No games yet.{admin ? " Click “Create game” to start." : ""}
            </li>
          ) : (
            others.map((g) => <GameRow key={g.id} game={g} />)
          )}
        </ul>
      </section>
    </div>
  );
}

type GameRowData = {
  id: string;
  name: string;
  date: Date;
  status: "SETUP" | "IN_PROGRESS" | "COMPLETE";
  format: "STROKE" | "STABLEFORD" | "CHICAGO_39";
  course: { name: string };
  _count: { entries: number };
};

function GameRow({ game }: { game: GameRowData }) {
  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <Link href={`/games/${game.id}`} className="block truncate font-medium hover:underline">
          {game.name}
        </Link>
        <div className="text-muted-foreground truncate text-sm">
          {formatGameDate(game.date)} · {game.course.name} · {formatFormat(game.format)} ·{" "}
          {game._count.entries} {game._count.entries === 1 ? "player" : "players"}
        </div>
      </div>
      <StatusBadge status={game.status} />
    </li>
  );
}

function StatusBadge({ status }: { status: GameRowData["status"] }) {
  const styles: Record<GameRowData["status"], string> = {
    SETUP: "border-amber-300 bg-amber-50 text-amber-900",
    IN_PROGRESS: "border-emerald-300 bg-emerald-50 text-emerald-900",
    COMPLETE: "border-slate-300 bg-slate-50 text-slate-700",
  };
  const label: Record<GameRowData["status"], string> = {
    SETUP: "Setup",
    IN_PROGRESS: "Live",
    COMPLETE: "Complete",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {label[status]}
    </span>
  );
}
