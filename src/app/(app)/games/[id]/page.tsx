import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { lastUsedTeeForPlayers } from "@/lib/games/last-used-tee";
import { requireSession } from "@/lib/session";

import { GameHeader } from "../_components/game-header";
import { GroupBuilder } from "../_components/group-builder";
import { RosterBuilder } from "../_components/roster-builder";
import { ScoreEntrySection } from "../_components/score-entry-section";
import { StartGameButton } from "../_components/start-game-button";

type Params = Promise<{ id: string }>;

export default async function GameDetailPage({ params }: { params: Params }) {
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
          member: { select: { groupId: true } },
        },
        orderBy: { player: { name: "asc" } },
      },
      groups: {
        orderBy: { createdAt: "asc" },
        include: {
          members: {
            include: {
              gameEntry: {
                include: {
                  player: { select: { id: true, name: true } },
                  tee: { select: { name: true } },
                },
              },
            },
          },
        },
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

  // Locate the signed-in user's group within this game (if any). Used by
  // the score-entry section to highlight their own group with a primary
  // CTA and route the others to read-only mode.
  const userEmail = session.user.email.toLowerCase();
  const userEntry = game.entries.find((e) => e.player.email.toLowerCase() === userEmail);
  const userGroupId = userEntry?.member?.groupId ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/games" className="text-muted-foreground text-sm underline">
          ← All games
        </Link>
      </div>

      <GameHeader
        game={{
          id: game.id,
          name: game.name,
          date: game.date,
          status: game.status,
          format: game.format,
          skinsType: game.skinsType,
          course: { name: game.course.name },
          entryCount: game.entries.length,
        }}
        admin={admin}
      />

      {game.status === "IN_PROGRESS" || game.status === "COMPLETE" ? (
        <ScoreEntrySection
          gameId={game.id}
          userGroupId={userGroupId}
          groups={game.groups.map((g) => ({
            id: g.id,
            name: g.name,
            memberNames: g.members.map((m) => m.gameEntry.player.name),
          }))}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Roster ({game.entries.length})</h2>
          {game.status === "SETUP" && admin ? (
            <StartGameButton gameId={game.id} disabled={game.entries.length === 0} />
          ) : null}
        </div>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Groups</h2>
        <GroupBuilder
          gameId={game.id}
          status={game.status}
          admin={admin}
          unassigned={game.entries
            .filter((e) => !e.member)
            .map((e) => ({
              gameEntryId: e.id,
              playerName: e.player.name,
              teeName: e.tee.name,
            }))}
          groups={game.groups.map((g) => ({
            id: g.id,
            name: g.name,
            members: g.members.map((m) => ({
              gameEntryId: m.gameEntryId,
              playerName: m.gameEntry.player.name,
              teeName: m.gameEntry.tee.name,
            })),
          }))}
        />
      </section>
    </div>
  );
}
