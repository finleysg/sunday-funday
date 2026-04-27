import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

import { ScoreEntry } from "./_components/score-entry";

type Params = Promise<{ id: string; groupId: string }>;

export default async function ScoreEntryPage({ params }: { params: Params }) {
  const session = await requireSession();
  const { id: gameId, groupId } = await params;
  const admin = isAdmin(session.user.email);

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      course: {
        include: {
          holes: { orderBy: { holeNumber: "asc" } },
        },
      },
    },
  });
  if (!game) notFound();

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          gameEntry: {
            include: {
              player: { select: { id: true, name: true, email: true } },
              tee: {
                include: {
                  holes: { orderBy: { holeNumber: "asc" } },
                },
              },
              scores: { orderBy: { holeNumber: "asc" } },
            },
          },
        },
        orderBy: { gameEntry: { player: { name: "asc" } } },
      },
    },
  });
  if (!group || group.gameId !== gameId) notFound();

  // Editor permissions: admins always; otherwise the user must be a member
  // of *this* group, the game must be IN_PROGRESS. Per decisions.md.
  const userEmail = session.user.email.toLowerCase();
  const userIsMember = group.members.some(
    (m) => m.gameEntry.player.email.toLowerCase() === userEmail,
  );
  const canEdit = (admin || userIsMember) && game.status === "IN_PROGRESS";

  const pars = new Map(game.course.holes.map((h) => [h.holeNumber, h.par]));
  const players = group.members.map((m) => {
    const e = m.gameEntry;
    const teeSi = new Map(e.tee.holes.map((h) => [h.holeNumber, h.strokeIndex]));
    return {
      gameEntryId: e.id,
      playerId: e.player.id,
      playerName: e.player.name,
      teeName: e.tee.name,
      courseHandicap: e.courseHandicap,
      strokeIndexes: Array.from({ length: 18 }, (_, i) => teeSi.get(i + 1) ?? i + 1),
      scoresByHole: Object.fromEntries(e.scores.map((s) => [s.holeNumber, s.strokes])) as Record<
        number,
        number | null
      >,
    };
  });
  const parsByHole = Array.from({ length: 18 }, (_, i) => pars.get(i + 1) ?? 4);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/games/${gameId}`} className="text-muted-foreground text-sm underline">
          ← {game.name}
        </Link>
        <span className="text-muted-foreground text-xs">{group.name}</span>
      </div>

      {!canEdit && game.status === "IN_PROGRESS" && !userIsMember ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          You&apos;re not a member of this group. Scores are read-only here.
        </div>
      ) : null}
      {game.status === "COMPLETE" ? (
        <div className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
          Game complete — scoring is locked.
        </div>
      ) : null}
      {game.status === "SETUP" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Game hasn&apos;t started yet — scores can&apos;t be entered until it goes live.
        </div>
      ) : null}

      <ScoreEntry gameId={gameId} canEdit={canEdit} parsByHole={parsByHole} players={players} />
    </div>
  );
}
