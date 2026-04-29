import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { lastUsedTeeForPlayers } from "@/lib/games/last-used-tee";
import { requireSession } from "@/lib/session";

import { RosterBuilder } from "../../_components/roster-builder";

type Params = Promise<{ id: string }>;

export default async function GameRosterPage({ params }: { params: Params }) {
  const session = await requireSession();
  const admin = isAdmin(session.user.email);
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      course: {
        include: {
          tees: {
            where: { active: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true, rating: true, slope: true },
          },
          holes: { select: { par: true } },
        },
      },
      entries: {
        include: {
          player: { select: { id: true, name: true, email: true } },
          tee: { select: { id: true, name: true } },
        },
        orderBy: { player: { name: "asc" } },
      },
    },
  });
  if (!game) notFound();

  const playersRaw = await prisma.player.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, handicapIndex: true },
  });
  const players = playersRaw.map((p) => ({
    ...p,
    handicapIndex: p.handicapIndex == null ? null : Number(p.handicapIndex),
  }));
  const coursePar = game.course.holes.reduce((sum, h) => sum + h.par, 0);

  const lastUsed = await lastUsedTeeForPlayers(
    game.courseId,
    players.map((p) => p.id),
    game.id,
  );
  const lastUsedSerialized: Record<string, { teeId: string; courseHandicap: number }> = {};
  for (const [k, v] of lastUsed.entries()) lastUsedSerialized[k] = v;

  const editable = admin && game.status === "SETUP";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href={`/games/${game.id}`} className="text-muted-foreground text-sm underline">
          ← {game.name}
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Roster</h1>
        <p className="text-muted-foreground text-sm">
          {editable
            ? "Pick the players, choose tees, and confirm course handicaps."
            : "Players and tees for this game."}
        </p>
      </header>

      <RosterBuilder
        gameId={game.id}
        editable={editable}
        coursePar={coursePar}
        allPlayers={players}
        tees={game.course.tees.map((t) => ({
          id: t.id,
          name: t.name,
          rating: Number(t.rating),
          slope: t.slope,
        }))}
        entries={game.entries.map((e) => ({
          playerId: e.player.id,
          playerName: e.player.name,
          playerEmail: e.player.email,
          teeId: e.tee.id,
          teeName: e.tee.name,
          courseHandicap: e.courseHandicap,
        }))}
        lastUsed={lastUsedSerialized}
      />

      <nav className="flex items-center justify-between gap-2 border-t pt-4">
        <Link href={`/games/${game.id}`} className="text-muted-foreground text-sm underline">
          ← Back to game
        </Link>
        <Link
          href={`/games/${game.id}/groups`}
          className="text-primary text-sm font-medium underline"
        >
          Continue to groups →
        </Link>
      </nav>
    </div>
  );
}
